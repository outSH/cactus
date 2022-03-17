import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io, Socket as ClientSocket } from "socket.io-client";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  EthContractInvocationType,
  InvokeRawWeb3EthContractV1Request,
  WatchBlocksV1,
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class QuorumApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

export class QuorumApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksV1Progress> {
  public static readonly CLASS_NAME = "QuorumApiClient";

  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  // @todo - remove
  public readonly asyncSocket: ClientSocket;
  public get className(): string {
    return QuorumApiClient.CLASS_NAME;
  }

  constructor(public readonly options: QuorumApiClientOptions) {
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

    // @todo - remove
    this.asyncSocket = io(this.wsApiHost, { path: this.wsApiPath });
  }

  public watchBlocksV1(
    options?: WatchBlocksV1Options,
  ): Observable<WatchBlocksV1Progress> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchBlocksV1Progress>(0);

    socket.on(WatchBlocksV1.Next, (data: WatchBlocksV1Progress) => {
      subject.next(data);
    });

    socket.on(WatchBlocksV1.Error, (ex: string) => {
      this.log.debug("ApiClient", ex);
      subject.error(ex);
    });

    socket.on(WatchBlocksV1.Complete, () => {
      subject.complete();
    });

    socket.on("connect", () => {
      console.log("Connected OK, sending WatchBlocksV1.Subscribe request...");
      socket.emit(WatchBlocksV1.Subscribe, options);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        console.log("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.disconnect();
      }),
    );
  }

  /**
   * Immediately sends request to the validator, doesn't report any error or responses.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   */
  public sendAsyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: any,
  ): void {
    try {
      const requestData = {
        contract: contract,
        method: method,
        args: args,
      };

      this.log.debug("sendAsyncRequest() Request:", requestData);
      this.asyncSocket.emit("validator-request", requestData);
    } catch (err) {
      this.log.error("sendAsyncRequest() EXCEPTION", err);
      throw err;
    }
  }

  /**
   * Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   * @returns Promise that will resolve with response from the ledger, or reject when error occurred.
   * @todo Refactor to RxJS
   * @todo better types
   */
  public sendSyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: any,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.log.debug("call : sendSyncRequest");

      ////////////////////// HANDLE HTTP CALLS
      if (method.type === "web3Eth") {
        this.log.info("!!! web3Eth -> invokeWeb3EthMethodV1");

        const invokeArgs = {
          methodName: method.command as string,
          params: args.args,
        };
        this.log.debug("Call invokeWeb3EthMethodV1 with args:", invokeArgs);
        this.invokeWeb3EthMethodV1(invokeArgs)
          .then((value) => {
            resolve(value.data);
          })
          .catch((err) => {
            reject(err);
          });
      } else if (method.type === "web3EthContract") {
        this.log.info("!!! web3EthContract -> InvokeRawWeb3EthContractV1");

        const invokeArgs: InvokeRawWeb3EthContractV1Request = {
          abi: contract.abi as any,
          address: contract.address as string,
          invocationType: method.command as EthContractInvocationType,
          invocationParams: method.params as any[],
          contractMethod: method.function as string,
          contractMethodArgs: args.args as any[],
        };
        this.log.debug(
          "Call invokeRawWeb3EthContractV1 with args:",
          invokeArgs,
        );

        this.invokeRawWeb3EthContractV1(invokeArgs)
          .then((value) => {
            resolve(value.data);
          })
          .catch((err) => {
            reject(err);
          });
      } else {
        throw new Error("Not supported function");
      }
    });
  }
}
