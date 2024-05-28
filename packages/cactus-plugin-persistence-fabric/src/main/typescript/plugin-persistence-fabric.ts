/**
 * Main logic of persistence plugin for fabric data.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import { FabricApiClient } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import OAS from "../json/openapi.json";
import { StatusEndpointV1 } from "./web-services/status-endpoint-v1";
import PostgresDatabaseClient from "./db-client/db-client";
import { StatusResponseV1 } from "./generated/openapi/typescript-axios";
import type { Express } from "express";
import type { Subscription } from "rxjs";

/**
 * Constructor parameter for Fabric persistence plugin.
 */
export interface IPluginPersistenceFabricOptions extends ICactusPluginOptions {
  apiClient: FabricApiClient;
  connectionString: string;
  logLevel: LogLevelDesc;
}

/**
 * Cactus persistence plugin for fabric ledgers.
 * Remember to call `onPluginInit()` before using any of the plugin method, and `shutdown()` when closing the app.
 */
export class PluginPersistenceFabric
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "PluginPersistenceFabric";

  private readonly instanceId: string;
  private apiClient: FabricApiClient;
  private watchBlocksSubscription: Subscription | undefined;
  private dbClient: PostgresDatabaseClient;
  private log: Logger;
  private isConnected = false;
  private isWebServicesRegistered = false;
  private endpoints: IWebServiceEndpoint[] | undefined;

  constructor(public readonly options: IPluginPersistenceFabricOptions) {
    const fnTag = `${PluginPersistenceFabric.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.apiClient, `${fnTag} options.apiClient`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.connectionString,
      `${fnTag} options.connectionString`,
    );

    const level = this.options.logLevel || "INFO";
    const label = PluginPersistenceFabric.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.apiClient = options.apiClient;

    this.dbClient = new PostgresDatabaseClient({
      connectionString: options.connectionString,
      logLevel: level,
    });
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-persistence-fabric`;
  }

  /**
   * Get OpenAPI definition for this plugin.
   * @returns OpenAPI spec object
   */
  public getOpenApiSpec(): unknown {
    return OAS;
  }

  /**
   * Should be called before using the plugin.
   * Connects to the database and initializes the plugin schema and status entry.
   * Fetches tokens to be monitored and stores them in local memory.
   */
  public async onPluginInit(): Promise<void> {
    throw new Error("Not implemented yet");
  }

  /**
   * Close the connection to the DB, cleanup any allocated resources.
   */
  public async shutdown(): Promise<void> {}

  /**
   * Register all the plugin endpoints on supplied `Express` server.
   *
   * @param app `Express.js` server.
   * @returns list of registered plugin endpoints.
   */
  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    this.isWebServicesRegistered = true;
    return webServices;
  }

  /**
   * Create plugin endpoints and return them.
   * If method was already called, the set of endpoints created on the first run is used.
   * @returns list of plugin endpoints.
   */
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    log.info(`Creating web services for plugin ${pkgName}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new StatusEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;

    log.info(`Instantiated web services for plugin ${pkgName} OK`, {
      endpoints,
    });
    return endpoints;
  }

  /**
   * Get status report of this instance of persistence plugin.
   * @returns Status report object
   */
  public getStatus(): StatusResponseV1 {
    return {
      instanceId: this.instanceId,
      webServicesRegistered: this.isWebServicesRegistered,
    };
  }

  /**
   * Start the block monitoring process. New blocks from the ledger will be parsed and pushed to the database.
   * Use `stopMonitor()` to cancel this operation.
   *
   * @warn
   * Before the monitor starts, the database will be synchronized with current ledger state.
   * This operation can take a while, but will ensure that the ledger archive is complete.
   *
   * @param onError callback method that will be called on error.
   */
  public async startMonitor(
    wbConfig: any,
    onError?: (err: unknown) => void,
  ): Promise<void> {
    // Synchronize the current DB state
    // this.lastSeenBlock = await this.syncAll();

    const blocksObservable = this.apiClient.watchBlocksV1(wbConfig);

    if (!blocksObservable) {
      throw new Error(
        "Could not get a valid blocks observable in startMonitor",
      );
    }

    this.watchBlocksSubscription = blocksObservable.subscribe({
      next: async (event) => {
        try {
          this.log.debug("Received new block.");

          if (!event) {
            this.log.warn("Received invalid block ledger event:", event);
            return;
          }

          this.log.error("BLOCK:", JSON.stringify(event));
          // await this.pushNewBlock(event.blockData);
        } catch (error: unknown) {
          this.log.error("Unexpected error when pushing new block:", error);
        }
      },
      error: (err) => {
        this.log.error("Error when watching for new blocks, err:", err);

        if (onError) {
          try {
            onError(err);
          } catch (error: unknown) {
            this.log.error(
              "Unexpected error in onError monitor handler:",
              error,
            );
          }
        }
      },
      complete: () => {
        this.log.info("Watch completed");
        if (this.watchBlocksSubscription) {
          this.watchBlocksSubscription.unsubscribe();
        }
        this.watchBlocksSubscription = undefined;
      },
    });
  }

  /**
   * Stop the block monitoring process.
   * If the monitoring wasn't running - nothing happens.
   */
  public stopMonitor(): void {
    if (this.watchBlocksSubscription) {
      this.watchBlocksSubscription.unsubscribe();
      this.watchBlocksSubscription = undefined;
      this.log.info("stopMonitor(): Done.");
    }
  }

  /**
   * Walk through all the blocks that could not be synchronized with the DB for some reasons and try pushing them again.
   * Blocks will remain on "failed blocks" list until it's successfully pushed to the database.
   *
   * @returns list of restored blocks
   */
  public async syncFailedBlocks(): Promise<number[]> {
    throw new Error("Not implemented yet");
  }

  /**
   * Synchronize entire ledger state with the database.
   * - Synchronize all blocks that failed to synchronize until now.
   * - Detect any other missing blocks between the database and the ledger, push them to the DB.
   *
   * @warn This operation can take a long time to finish!
   * @returns latest synchronized block number.
   */
  public async syncAll(): Promise<number> {
    throw new Error("Not implemented yet");
  }
}
