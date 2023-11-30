import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";

import { Express } from "express";

import OAS from "../json/openapi.json";

import {
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { AriesAgentSummary } from "./generated/openapi/typescript-axios";

import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GetAgentsEndpoint } from "./web-services/get-agents-v1-endpoint";

export interface IPluginLedgerConnectorAriesOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry: PluginRegistry;
}

export class PluginLedgerConnectorAries
  implements ICactusPlugin, IPluginWebService
{
  // private readonly pluginRegistry: PluginRegistry;
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return "PluginLedgerConnectorAries";
  }

  constructor(public readonly options: IPluginLedgerConnectorAriesOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    // this.pluginRegistry = options.pluginRegistry as PluginRegistry;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    this.log.debug(`WebSocketProvider created for socketio endpoints`);
    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.info(`New Socket connected. ID=${socket.id}`);

      socket.on("WatchBlocksV1.Subscribe", () => {
        new WatchBlocksV1Endpoint({
          socket,
          logLevel,
        }).subscribe();
      });
    });

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new GetAgentsEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-aries`;
  }

  public async getAgents(): Promise<AriesAgentSummary[]> {
    return [
      {
        name: "asd",
      },
    ];
  }
}
