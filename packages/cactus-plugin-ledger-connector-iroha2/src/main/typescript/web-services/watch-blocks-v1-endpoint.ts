import { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
  WatchBlocksListenerTypeV1,
} from "../generated/openapi/typescript-axios";

import { Client as IrohaClient } from "@iroha2/client";

import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";
import { VersionedCommittedBlock } from "@iroha2/data-model";

/**
 * WatchBlocksV1Endpoint configuration.
 */
export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  client: IrohaClient;
}

/**
 * Return secure string representation of error from the input.
 * Handles circular structures and removes HTML.`
 *
 * @param error Any object to return as an error, preferable `Error`
 * @returns Safe string representation of an error.
 *
 * @todo use one from cactus-common after #2089 is merged.
 */
export function safeStringifyException(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeHtml(error.stack || error.message);
  }

  return sanitizeHtml(safeStringify(error));
}

/**
 * Endpoint to watch for new blocks on Iroha V2 ledger and report them
 * to the client using socketio.
 */
export class WatchBlocksV1Endpoint {
  public readonly className = "WatchBlocksV1Endpoint";
  private readonly log: Logger;
  private readonly client: IrohaClient;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: WatchBlocksResponseV1) => void>
  >;

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);
    Checks.truthy(config.client, `${fnTag} arg options.client`);

    this.socket = config.socket;
    this.client = config.client;

    const level = this.config.logLevel || "info";
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });
  }

  /**
   * Subscribe to new blocks on Iroha V2 ledger, push them to the client via socketio.
   *
   * @param options Block monitoring options.
   */
  public async subscribe(options: WatchBlocksOptionsV1): Promise<void> {
    const { client, socket, log } = this;
    const clientId = socket.id;
    log.info(
      `${WatchBlocksV1.Subscribe} => clientId: ${clientId}, startBlock: ${options.startBlock}`,
    );

    try {
      const height = options.startBlock ?? "0";
      const blockType = options.type ?? WatchBlocksListenerTypeV1.Binary;
      const blockMonitor = await client.listenForBlocksStream({
        height: BigInt(height),
      });

      // Handle events
      blockMonitor.ee.on("open", (openEvent) => {
        log.info("listenForBlocksStream open:", safeStringify(openEvent));
      });

      blockMonitor.ee.on("close", (closeEvent) => {
        log.info("listenForBlocksStream close:", safeStringify(closeEvent));
        // socket.emit(WatchBlocksV1.Complete, {
        //   message: "WatchBlocksV1 Complete",
        //   error: "Complete event received",
        // });
      });

      blockMonitor.ee.on("error", (error) => {
        const errorMessage = safeStringify(error);
        log.warn("listenForBlocksStream error:", errorMessage);
        socket.emit(WatchBlocksV1.Error, {
          message: "listenForBlocksStream error event",
          error: errorMessage,
        });
      });

      blockMonitor.ee.on("block", (block) => {
        switch (blockType) {
          case WatchBlocksListenerTypeV1.Binary:
            socket.emit(WatchBlocksV1.Next, {
              binaryBlock: VersionedCommittedBlock.toBuffer(block),
            });
            break;
          default:
            const unknownType: never = blockType;
            throw new Error(
              `Unknown block listen type - '${unknownType}'. Check name and connector version.`,
            );
        }
      });

      socket.on("disconnect", async (reason: string) => {
        log.info(
          "WebSocket:disconnect => reason=%o clientId=%s",
          reason,
          clientId,
        );
        blockMonitor.ee.clearListeners();
        await blockMonitor.stop();
      });

      socket.on(WatchBlocksV1.Unsubscribe, () => {
        log.info(`${WatchBlocksV1.Unsubscribe} => clientId: ${clientId}`);
        this.close();
      });
    } catch (error) {
      const errorMessage = safeStringifyException(error);
      log.error(errorMessage);
      socket.emit(WatchBlocksV1.Error, {
        message: "WatchBlocksV1 Exception",
        error: errorMessage,
      });
    }
  }

  // TODO - share socketio connection with other endpoints
  close(): void {
    if (this.socket.connected) {
      this.socket.disconnect(true);
    }
  }
}
