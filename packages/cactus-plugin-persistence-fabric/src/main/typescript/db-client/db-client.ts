/**
 * Client class to communicate with PostgreSQL database.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  CactiBlockFullEventV1,
  FabricX509CertificateV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric/src/main/typescript/generated/openapi/typescript-axios/api";

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

  private certificateAttrsStringToMap(attrString: string): Map<string, string> {
    return new Map(
      attrString.split("\n").map((a) => {
        const splitAttrs = a.split("=");
        if (splitAttrs.length !== 2) {
          throw new Error(
            `Invalid certificate attribute string: ${attrString}`,
          );
        }
        return splitAttrs as [string, string];
      }),
    );
  }

  private async insertCertificateIfNotExists(
    fabricCert: FabricX509CertificateV1,
  ): Promise<string> {
    // Try fetching cert ID from the DB
    const queryResponse = await this.client.query(
      "SELECT id FROM fabric.certificate WHERE serial_number = $1",
      [fabricCert.serialNumber],
    );

    if (queryResponse.rows.length === 1) {
      return queryResponse.rows[0].id;
    }

    // Insert certificate not existing in the database
    const subjectAttrs = this.certificateAttrsStringToMap(fabricCert.subject);
    const issuerAttrs = this.certificateAttrsStringToMap(fabricCert.issuer);

    this.log.debug(
      `Insert to fabric.certificate with serial number ${fabricCert.serialNumber})`,
    );
    const certInsertResponse = await this.client.query(
      `INSERT INTO
              fabric.certificate("serial_number", "subject_common_name", "subject_org_unit", "subject_org", "subject_locality",
                "subject_state", "subject_country", "issuer_common_name", "issuer_org_unit", "issuer_org", "issuer_locality",
                "issuer_state", "issuer_country", "subject_alt_name", "valid_from", "valid_to", "pem")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING id;`,
      [
        fabricCert.serialNumber,
        subjectAttrs.get("CN") ?? "",
        subjectAttrs.get("OU") ?? "",
        subjectAttrs.get("O") ?? "",
        subjectAttrs.get("L") ?? "",
        subjectAttrs.get("ST") ?? "",
        subjectAttrs.get("C") ?? "",
        issuerAttrs.get("CN") ?? "",
        issuerAttrs.get("OU") ?? "",
        issuerAttrs.get("O") ?? "",
        issuerAttrs.get("L") ?? "",
        issuerAttrs.get("ST") ?? "",
        issuerAttrs.get("C") ?? "",
        fabricCert.subjectAltName,
        fabricCert.validFrom,
        fabricCert.validTo,
        fabricCert.pem,
      ],
    );

    if (certInsertResponse.rowCount !== 1) {
      throw new Error(
        `Certificate with serial number ${fabricCert.serialNumber} was not inserted into the DB`,
      );
    }

    return certInsertResponse.rows[0].id;
  }

  /**
   * TODO
   * Insert entire block data into the database (the block itself, transactions and token transfers if there were any).
   * Everything is committed in single atomic transaction (rollback on error).
   * @param blockData new block data.
   */
  public async insertBlockData(block: CactiBlockFullEventV1): Promise<void> {
    this.assertConnected();

    this.log.debug("Insert block data, including transactions");

    try {
      await this.client.query("BEGIN");

      // Insert block
      this.log.debug(
        `Insert to fabric.block #${block.blockNumber} (${block.blockHash})`,
      );
      const blockInsertResponse = await this.client.query(
        `INSERT INTO fabric.block("number", "hash", "transaction_count")
           VALUES ($1, $2, $3)
           RETURNING id;`,
        [block.blockNumber, block.blockHash, block.transactionCount],
      );
      if (blockInsertResponse.rowCount !== 1) {
        throw new Error(
          `Block ${block.blockNumber} was not inserted into the DB`,
        );
      }

      for (const tx of block.cactiTransactionsEvents) {
        // Insert transaction
        this.log.debug(`Insert to fabric.transaction with hash ${tx.hash})`);
        const txInsertResponse = await this.client.query(
          `INSERT INTO
              fabric.transaction("hash", "timestamp", "type", "epoch", "channel_id", "protocol_version", "block_id", "block_number")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id;`,
          [
            tx.hash,
            tx.timestamp,
            tx.type,
            tx.epoch,
            tx.channelId,
            tx.protocolVersion,
            blockInsertResponse.rows[0].id,
            block.blockNumber,
          ],
        );
        if (txInsertResponse.rowCount !== 1) {
          throw new Error(
            `Transaction ${tx.hash} was not inserted into the DB`,
          );
        }
        const txId = txInsertResponse.rows[0].id;
        this.log.debug("New transaction inserted with id", txId);

        // Insert transaction actions
        for (const action of tx.actions) {
          const creatorCertId = await this.insertCertificateIfNotExists(
            action.creator.cert,
          );

          this.log.debug("Insert to fabric.transaction_action");
          const txActionInsertResponse = await this.client.query(
            `INSERT INTO
                fabric.transaction_action("function_name", "function_args", "chaincode_id", "creator_msp_id", "creator_certificate_id", "transaction_id")
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id;`,
            [
              action.functionName,
              action.functionArgs.join(","),
              action.chaincodeId,
              action.creator.mspid,
              creatorCertId,
              txId,
            ],
          );
          if (txActionInsertResponse.rowCount !== 1) {
            throw new Error("Transaction action was not inserted into the DB");
          }
          const txActionId = txActionInsertResponse.rows[0].id;
          this.log.debug("New transaction action inserted with id", txActionId);

          for (const endorsement of action.endorsements) {
            const signerCertId = await this.insertCertificateIfNotExists(
              endorsement.signer.cert,
            );

            this.log.debug("Insert to fabric.transaction_action_endorsement");
            const txActionEndorsementInsertResponse = await this.client.query(
              `INSERT INTO
                  fabric.transaction_action_endorsement("mspid", "signature", "certificate_id", "transaction_action_id")
                 VALUES ($1, $2, $3, $4);`,
              [
                endorsement.signer.mspid,
                endorsement.signature,
                signerCertId,
                txActionId,
              ],
            );
            if (txActionEndorsementInsertResponse.rowCount !== 1) {
              throw new Error(
                "Transaction action endorsement was not inserted into the DB",
              );
            }
            this.log.debug("New transaction action endorsement inserted");
          }
        }
      }

      await this.client.query("COMMIT");
    } catch (err: unknown) {
      await this.client.query("ROLLBACK");
      this.log.warn("insertBlockData() exception:", err);
      throw new Error(
        "Could not insert block data into the database - transaction reverted",
      );
    }
  }
}
