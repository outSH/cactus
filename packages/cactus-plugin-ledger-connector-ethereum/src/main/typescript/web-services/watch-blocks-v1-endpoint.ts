import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import {
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
  WatchBlocksV1,
  WatchBlocksV1BlockData,
} from "../generated/openapi/typescript-axios";
import { Socket as SocketIoSocket } from "socket.io";
import Web3, { Bytes, Numbers } from "web3";

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  web3: Web3;
  options?: WatchBlocksV1Options;
}

type ReplaceNumbersWithString<T> = {
  [K in keyof T]: T[K] extends Numbers | Bytes | undefined ? string : T[K];
};

/**
 * 1D only
 * does not convert arrays, object, etc..
 * every fields with toString will be converted. types only for Numbers and Bytes
 * @param input
 * @returns
 */
function stringifyObjectFields<T extends object>(
  input: T,
): ReplaceNumbersWithString<T> {
  const result: Record<string, unknown> = {};

  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key] as any;

      if (typeof value["toString"] === "function") {
        result[key] = value.toString();
      } else {
        result[key] = value;
      }
    }
  }

  return result as ReplaceNumbersWithString<T>;
}

export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | string) => void>
  >;
  private readonly web3: Web3;
  private readonly isGetBlockData: boolean;

  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.web3, `${fnTag} arg options.web3`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);

    this.web3 = config.web3;
    this.socket = config.socket;
    this.isGetBlockData = config.options?.getBlockData == true;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    const { socket, log, web3, isGetBlockData } = this;
    log.debug(`${WatchBlocksV1.Subscribe} => ${socket.id}`);

    const newBlocksSubscription = await web3.eth.subscribe("newBlockHeaders");

    newBlocksSubscription.on("data", async (blockHeader) => {
      log.debug("newBlockHeaders: BlockHeader=%o", blockHeader);
      let next: WatchBlocksV1Progress;

      if (isGetBlockData) {
        const web3BlockData = await web3.eth.getBlock(blockHeader.number, true);

        next = {
          blockData: (stringifyObjectFields(
            web3BlockData,
          ) as unknown) as WatchBlocksV1BlockData,
        };
      } else {
        next = { blockHeader: stringifyObjectFields(blockHeader) };
      }

      socket.emit(WatchBlocksV1.Next, next);
    });

    newBlocksSubscription.on("error", (error) => {
      console.log("Error when subscribing to New block header: ", error);
      socket.emit(WatchBlocksV1.Error, error.message);
      newBlocksSubscription.unsubscribe();
    });

    log.debug("Subscribing to Web3 new block headers event...");

    socket.on("disconnect", async (reason: string) => {
      log.debug("WebSocket:disconnect reason=%o", reason);
      await newBlocksSubscription.unsubscribe();
      log.debug("Web3 unsubscribe done.");
    });

    socket.on(WatchBlocksV1.Unsubscribe, async () => {
      log.debug(`${WatchBlocksV1.Unsubscribe}: unsubscribing Web3...`);
      await newBlocksSubscription.unsubscribe();
      log.debug("Web3 unsubscribe done.");
    });
  }
}
