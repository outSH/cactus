import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";
import {
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
}
