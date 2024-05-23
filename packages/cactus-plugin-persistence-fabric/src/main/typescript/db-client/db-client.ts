/**
 * Client class to communicate with PostgreSQL database.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { Client as PostgresClient } from "pg";

export interface PostgresDatabaseClientOptions {
  connectionString: string;
  logLevel: LogLevelDesc;
}

//////////////////////////////////
// PostgresDatabaseClient
//////////////////////////////////

/**
 * Client class to communicate with PostgreSQL database.
 * Remember to call `connect()` before using ano of the methods.
 *
 * @todo Use pg connection pool
 */
export default class PostgresDatabaseClient {
  private log: Logger;
  public static readonly CLASS_NAME = "PostgresDatabaseClient";
  public client: PostgresClient;
  public isConnected = false;

  constructor(public options: PostgresDatabaseClientOptions) {
    const fnTag = `${PostgresDatabaseClient.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.connectionString,
      `${fnTag} arg options.connectionString`,
    );

    const level = this.options.logLevel || "INFO";
    const label = PostgresDatabaseClient.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.client = new PostgresClient({
      connectionString: options.connectionString,
    });
  }

  /**
   * Internal method that throws if postgres client is not connected yet.
   */
  private assertConnected(): void {
    if (!this.isConnected) {
      throw new Error(
        `${PostgresDatabaseClient.CLASS_NAME} method called before connecting to the DB!`,
      );
    }
  }

  /**
   * Connect to a PostgreSQL database using connection string from the constructor.
   */
  public async connect(): Promise<void> {
    this.log.info("Connect to PostgreSQL database...");
    await this.client.connect();
    this.isConnected = true;
  }

  /**
   * Close the connection to to a PostgreSQL database.
   */
  public async shutdown(): Promise<void> {
    this.log.info("Close connection with PostgreSQL database.");
    await this.client.end();
    this.isConnected = false;
  }
}
