import { Express } from "express";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  RegisterHistoryDataV1Request,
  GatewayConfigurationV1,
  AuthInfoV1,
} from "./generated/openapi/typescript-axios";

import { RegisterHistoryDataEndpoint } from "./web-services/register-history-data-v1-endpoint";

import {
  HTTP_HEADER_SUBSCRIPTION_KEY,
  getAuthorizationHeaders,
} from "./type-defs";
import { CDLGateway } from "./cdl-gateway";

export interface IPluginLedgerConnectorCDLOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  cdlApiGateway?: GatewayConfigurationV1;
  cdlApiSubscriptionGateway?: GatewayConfigurationV1;
}

export class PluginLedgerConnectorCDL
  implements ICactusPlugin, IPluginWebService
{
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private cdlApiGateway: CDLGateway | undefined;
  private cdlApiSubscriptionGateway: CDLGateway | undefined;

  public static readonly CLASS_NAME = "PluginLedgerConnectorCDL";

  public get className(): string {
    return PluginLedgerConnectorCDL.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorCDLOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.cdlApiGateway || options.cdlApiSubscriptionGateway,
      `${fnTag} options.cdlApiGateway or options.cdlApiSubscriptionGateway must be defined`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;

    if (options.cdlApiGateway) {
      this.log.info("cdlApiGateway created");
      this.cdlApiGateway = new CDLGateway(options.cdlApiGateway, level);
    }

    if (options.cdlApiSubscriptionGateway) {
      this.log.info("cdlApiSubscriptionGateway created");
      this.cdlApiSubscriptionGateway = new CDLGateway(
        options.cdlApiSubscriptionGateway,
        level,
      );
    }
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

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const endpoint = new RegisterHistoryDataEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-cdl`;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   * Throws if any property in an object starts with `cdl:` (not allowed by the API)
   * @param properties object with string fields.
   */
  private checkPropertyNames(properties?: Record<string, string>) {
    const invalidProps = Object.keys(properties ?? {}).filter((k) =>
      k.startsWith("cdl:"),
    );
    if (invalidProps.length > 0) {
      throw new Error(
        `Properties can't start with 'cdl:'. Invalid properties provided: ${invalidProps}`,
      );
    }
  }

  private getGatewayByAuthInfo(authInfo: AuthInfoV1): CDLGateway {
    const headers = getAuthorizationHeaders(authInfo);

    if (HTTP_HEADER_SUBSCRIPTION_KEY in headers) {
      if (this.cdlApiSubscriptionGateway) {
        this.log.debug("Using subscription key gateway for this request");
        return this.cdlApiSubscriptionGateway;
      } else {
        throw new Error(
          `cdlApiSubscriptionGateway not configured but found ${HTTP_HEADER_SUBSCRIPTION_KEY} in request header!`,
        );
      }
    }

    if (this.cdlApiGateway) {
      this.log.debug("Using access token gateway for this request");
      return this.cdlApiGateway;
    } else {
      throw new Error(
        `cdlApiGateway not configured, provide ${HTTP_HEADER_SUBSCRIPTION_KEY} to use subscription gateway!`,
      );
    }
  }

  /**
   * Send request to `trail_registration` CDL endpoint.
   */
  async registerHistoryData(args: RegisterHistoryDataV1Request): Promise<any> {
    this.log.debug(
      "ServerPlugin:registerHistoryData() args:",
      JSON.stringify(args),
    );

    // Check args
    this.checkPropertyNames(args.tags);
    this.checkPropertyNames(args.properties);

    const gateway = this.getGatewayByAuthInfo(args.authInfo);
    const responseData = await gateway.request(
      `trail_registration`,
      args.authInfo,
      {},
      {
        "cdl:EventId": args.eventId ?? "",
        "cdl:LineageId": args.lineageId ?? "",
        "cdl:Tags": args.tags,
        ...args.properties,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(responseData);
    }

    this.log.debug("registerHistoryData results:", responseData);
    return responseData;
  }
}
