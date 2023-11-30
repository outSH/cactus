import { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  safeStringifyException,
} from "@hyperledger/cactus-common";

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
}

export class WatchBlocksV1Endpoint {
  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<any, (next: string) => void>,
    Record<any, (next: any | string) => void>
  >;

  public get className(): string {
    return "WatchBlocksV1Endpoint";
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);

    Checks.truthy(config.socket, `${fnTag} arg options.socket`);
    this.socket = config.socket;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    // const { socket, log } = this;
    // log.info(`${WatchBlocksV1.Subscribe} => ${socket.id}`);
    // socket.emit(WatchBlocksV1.Next, next);
  }
}
