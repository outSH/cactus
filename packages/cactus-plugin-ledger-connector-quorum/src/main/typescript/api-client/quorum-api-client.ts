import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client";
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
import { AbiItem } from "web3-utils";

export class QuorumApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

// Command 'web3Eth' input method type
export type QuorumRequestInputWeb3EthMethod = {
  type: "web3Eth";
  command: string;
};

// Command 'web3EthContract' input method type
export type QuorumRequestInputWeb3EthContractMethod = {
  type: "web3EthContract";
  command: EthContractInvocationType;
  function: string;
  params?: any[];
};

// Final input types for sending requests
export type QuorumRequestInputContract = {
  abi?: AbiItem[];
  address?: string;
};
export type QuorumRequestInputMethod =
  | QuorumRequestInputWeb3EthMethod
  | QuorumRequestInputWeb3EthContractMethod;
export type QuorumRequestInputArgs = {
  args?: any[] | Record<string, unknown>;
};

export class QuorumApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksV1Progress> {
  public static readonly CLASS_NAME = "QuorumApiClient";

  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

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
  }

  public watchBlocksV1(
    options?: WatchBlocksV1Options,
  ): Observable<WatchBlocksV1Progress> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchBlocksV1Progress>(0);

    socket.on(WatchBlocksV1.Next, (data: WatchBlocksV1Progress) => {
      this.log.debug("Received WatchBlocksV1.Next");
      subject.next(data);
    });

    socket.on(WatchBlocksV1.Error, (ex: string) => {
      this.log.warn("Received WatchBlocksV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchBlocksV1.Complete, () => {
      this.log.debug("Received WatchBlocksV1.Complete");
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
        // @todo - fix emit && disconnect?
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
    contract: QuorumRequestInputContract,
    method: QuorumRequestInputMethod,
    args: QuorumRequestInputArgs,
  ): void {
    const callName = `${method.type} - ${method.command}`;
    this.log.debug("sendAsyncRequest()", callName);

    this.sendSyncRequest(contract, method, args)
      .then((value) => {
        this.log.info(`sendAsyncRequest call resolved (${callName})`);
        this.log.debug("sendAsyncRequest results:", JSON.stringify(value));
      })
      .catch((err) => {
        this.log.warn(`sendAsyncRequest failed (${callName}). Error:`, err);
      });
  }

  /**
   * Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method specification to be executed by validator.
   * @param args - arguments.
   * @returns Promise that will resolve with response from the ledger, or reject when error occurred.
   */
  public sendSyncRequest(
    contract: QuorumRequestInputContract,
    method: QuorumRequestInputMethod,
    args: QuorumRequestInputArgs,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.log.debug("sendSyncRequest()");

      // TODO - separate func
      switch (method.type) {
        case "web3Eth": {
          this.log.info("Send 'web3Eth' request command");

          // Check parameters
          Checks.nonBlankString(
            method.command,
            "Method command must not be empty",
          );
          if (args && args.args && !Array.isArray(args.args)) {
            throw new Error("web3Eth arguments (args.args) must be an array");
          }

          // Prepare input
          const invokeArgs = {
            methodName: method.command,
            params: args.args as any,
          };

          // Call the endpoint
          this.invokeWeb3EthMethodV1(invokeArgs)
            .then((value) => {
              this.log.debug("invokeWeb3EthMethodV1() OK");
              resolve(value.data);
            })
            .catch((err) => {
              this.log.debug("invokeWeb3EthMethodV1() Error:", err);
              reject(err);
            });
          break;
        }
        case "web3EthContract": {
          this.log.info("Send 'web3EthContract' request command");

          // Check parameters
          Checks.truthy(contract.abi, "Contract ABI must be defined");
          Checks.truthy(contract.address, "Contract address must be set");
          if (
            !Object.values(EthContractInvocationType).includes(method.command)
          ) {
            throw new Error(
              `Unknown invocationType (${method.command}), must be defined in EthContractInvocationType`,
            );
          }
          Checks.nonBlankString(
            method.function,
            "contractMethod (method.function) must not be empty",
          );
          if (method.params && !Array.isArray(method.params)) {
            throw new Error(
              "Contract method arguments (method.params) must be an array",
            );
          }

          // Prepare input
          const invokeArgs: InvokeRawWeb3EthContractV1Request = {
            abi: contract.abi as AbiItem[],
            address: contract.address as string,
            invocationType: method.command,
            invocationParams: args.args,
            contractMethod: method.function,
            contractMethodArgs: method.params,
          };

          // Call the endpoint
          this.invokeRawWeb3EthContractV1(invokeArgs)
            .then((value) => {
              resolve(value.data);
            })
            .catch((err) => {
              reject(err);
            });
          break;
        }
        default:
          const value: never = method;
          throw new Error(
            `Unhandled discriminated union member: ${JSON.stringify(value)}`,
          );
      }
    });
  }
}
