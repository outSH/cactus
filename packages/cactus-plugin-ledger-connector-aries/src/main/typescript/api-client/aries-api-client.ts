import { Observable, ReplaySubject, Subscription } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";
import {
  AgentConnectionRecordV1,
  DefaultApi,
  WatchConnectionStateOptionsV1,
  WatchConnectionStateV1,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class AriesApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

type WatchConnectionStateV1Progress = any;

const WAIT_FOR_CONNECTION_READY_POLL_INTERVAL = 500;
const WAIT_FOR_CLIENT_ACCEPT_TIMEOUT = 60 * 1000; // must be greater than 1000

export class AriesApiClient extends DefaultApi {
  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  public get className(): string {
    return "AriesApiClient";
  }

  constructor(public readonly options: AriesApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.wsApiHost = options.wsApiHost || options.basePath || location.host;
    this.wsApiPath = options.wsApiPath || Constants.SocketIoConnectionPathV1;
    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`wsApiHost=${this.wsApiHost}`);
    this.log.debug(`wsApiPath=${this.wsApiPath}`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  public watchConnectionStateV1(
    options: WatchConnectionStateOptionsV1,
  ): Observable<WatchConnectionStateV1Progress> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchConnectionStateV1Progress>(0);

    socket.on(
      WatchConnectionStateV1.Next,
      (data: WatchConnectionStateV1Progress) => {
        this.log.debug("Received WatchConnectionStateV1.Next");
        subject.next(data);
      },
    );

    socket.on(WatchConnectionStateV1.Error, (ex: string) => {
      this.log.warn("Received WatchConnectionStateV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchConnectionStateV1.Complete, () => {
      this.log.debug("Received WatchConnectionStateV1.Complete");
      subject.complete();
    });

    socket.on("connect", () => {
      this.log.info(
        "Connected OK, sending WatchConnectionStateV1.Subscribe request...",
      );
      socket.emit(WatchConnectionStateV1.Subscribe, options);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        this.log.info("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchConnectionStateV1.Unsubscribe);
        socket.close();
      }),
    );
  }

  private async waitForConnectionRecord(
    agentName: string,
    outOfBandId: string,
    timeout = WAIT_FOR_CLIENT_ACCEPT_TIMEOUT,
  ): Promise<void> {
    this.log.debug(
      "waitForConnectionRecord for agent",
      agentName,
      "outOfBandId",
      outOfBandId,
    );

    return new Promise<void>(async (resolve, reject) => {
      // Common cleanup method for leaving the method
      const cleanup = () => {
        if (conStateSubscription) {
          conStateSubscription.unsubscribe();
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      // Handle timeouts
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error("waitForConnectionRecord() timeout - no connection found"),
        );
      }, timeout);

      // Listen for connection establishment event
      const conStateObservable = this.watchConnectionStateV1({
        agentName,
      });
      const conStateSubscription = conStateObservable.subscribe((e) => {
        if (
          e.connectionRecord.outOfBandId !== outOfBandId ||
          e.connectionRecord.state !== "completed"
        ) {
          return;
        }
        this.log.debug(
          "waitForConnectionRecord() - received ConnectionStateChanged event for given outOfBandId",
        );
        cleanup();
        resolve();
      });

      // Also retrieve the connection record by invitation if the event has already fired
      const connectionsResponse = await this.getConnectionsV1({
        agentName,
        filter: {
          outOfBandId,
        },
      });
      const connection = connectionsResponse.data.pop();
      if (connection) {
        this.log.debug(
          "waitForConnectionRecord() - connection record already present",
        );
        cleanup();
        resolve();
      }
    });
  }

  async waitForConnectionReady(
    agentName: string,
    outOfBandId: string,
    timeout = WAIT_FOR_CLIENT_ACCEPT_TIMEOUT,
  ): Promise<void> {
    Checks.truthy(agentName, "waitForInvitedPeerConnection arg agentName");
    Checks.truthy(outOfBandId, "waitForInvitedPeerConnection arg outOfBandId");
    Checks.truthy(
      timeout > 2 * WAIT_FOR_CONNECTION_READY_POLL_INTERVAL,
      "waitForInvitedPeerConnection arg timeout to small",
    );
    let connection: AgentConnectionRecordV1 | undefined;
    let counter = Math.ceil(timeout / WAIT_FOR_CONNECTION_READY_POLL_INTERVAL);
    this.log.debug(
      `waitForConnectionReady() timeout ${timeout}, retry ${counter} times...`,
    );

    do {
      try {
        counter--;
        await new Promise((resolve) =>
          setTimeout(resolve, WAIT_FOR_CONNECTION_READY_POLL_INTERVAL),
        );

        const connections = await this.getConnectionsV1({
          agentName,
          filter: {
            outOfBandId: outOfBandId,
          },
        });
        connection = connections.data.pop();
      } catch (error) {
        this.log.error("waitForConnectionReady() error:", error);
      }
    } while (counter > 0 && (!connection || !connection.isReady));

    if (counter <= 0) {
      throw new Error(
        `waitForConnectionReady() agent ${agentName} oobId ${outOfBandId} timeout reached!`,
      );
    }

    this.log.info(
      `waitForConnectionReady() agent ${agentName} oobId ${outOfBandId} OK!`,
    );
  }

  async waitForInvitedPeerConnection(
    agentName: string,
    outOfBandId: string,
    timeout = WAIT_FOR_CLIENT_ACCEPT_TIMEOUT,
  ): Promise<void> {
    Checks.truthy(agentName, "waitForInvitedPeerConnection arg agentName");
    Checks.truthy(outOfBandId, "waitForInvitedPeerConnection arg outOfBandId");
    Checks.truthy(
      timeout > 2 * WAIT_FOR_CONNECTION_READY_POLL_INTERVAL,
      "waitForInvitedPeerConnection arg timeout to small",
    );

    await this.waitForConnectionRecord(agentName, outOfBandId, timeout);
    this.log.info("waitForInvitedPeerConnection() - connection record found");

    await this.waitForConnectionReady(agentName, outOfBandId, timeout);
  }
}
