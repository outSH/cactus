import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import {
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
  Web3Transaction,
  WatchBlocksV1,
} from "../generated/openapi/typescript-axios";
import { Socket as SocketIoSocket } from "socket.io";
import Web3 from "web3";

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  web3: Web3;
  options?: WatchBlocksV1Options;
}

export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | string) => void>
  >;
  private readonly web3: Web3;
  private readonly isIncludeBlock: boolean;

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
    this.isIncludeBlock = config.options?.includeBlockData == true;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    const { socket, log, web3, isIncludeBlock } = this;
    log.debug(`${WatchBlocksV1.Subscribe} => ${socket.id}`);

    const sub = web3.eth.subscribe(
      "newBlockHeaders",
      async (ex, blockHeader) => {
        log.debug("newBlockHeaders: Error=%o BlockHeader=%o", ex, blockHeader);

        if (ex) {
          socket.emit(WatchBlocksV1.Error, ex.message);
          sub.unsubscribe();
        } else if (blockHeader) {
          const next: WatchBlocksV1Progress = {
            blockHeader,
          };

          if (isIncludeBlock) {
            const blockData = await web3.eth.getBlock(blockHeader.hash, true);

            // Remove null and undefined fields to match OpenAPI return type
            blockData.transactions.map((value: any) => {
              for (const key in value) {
                if (value[key] === null || value[key] === undefined) {
                  delete value[key];
                }
              }
            });

            next.blockData = {
              size: blockData.size,
              // Safely cast to string, in case totalDifficulty is really a number (I think it returns a string and web3 typedef is wrong)
              totalDifficulty: `${blockData.totalDifficulty}`,
              uncles: blockData.uncles,
              transactions: blockData.transactions as Web3Transaction[],
            };
          }

          socket.emit(WatchBlocksV1.Next, next);
        }
      },
    );

    log.debug("Subscribing to Web3 new block headers event...");

    socket.on("disconnect", async (reason: string) => {
      log.debug("WebSocket:disconnect reason=%o", reason);
      sub.unsubscribe((ex: Error, success: boolean) => {
        log.debug("Web3 unsubscribe success=%o, ex=%", success, ex);
      });
    });

    socket.on(WatchBlocksV1.Unsubscribe, () => {
      log.debug(`${WatchBlocksV1.Unsubscribe}: unsubscribing Web3...`);
      sub.unsubscribe((ex: Error, success: boolean) => {
        log.debug("Web3 unsubscribe error=%o, success=%", ex, success);
      });
    });
  }
}
