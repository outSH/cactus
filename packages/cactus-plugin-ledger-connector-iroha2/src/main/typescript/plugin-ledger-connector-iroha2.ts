import type { Express } from "express";
import OAS from "../json/openapi.json";
// import type { Server as SocketIoServer } from "socket.io";
// import type { Socket as SocketIoSocket } from "socket.io";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  IrohaInstruction,
  IrohaQuery,
  TransactRequestV1,
  TransactResponseV1,
  Iroha2BaseConfig,
  Iroha2KeyJson,
  Iroha2KeyPair,
  KeychainReference,
  QueryRequestV1,
  QueryResponseV1,
  IrohaInstructionRequestV1,
} from "./generated/openapi/typescript-axios";

import { TransactEndpoint } from "./web-services/transact-endpoint";
import { QueryEndpoint } from "./web-services/query-endpoint";

import { KeyPair } from "@iroha2/crypto-core";
import { AccountId, DomainId } from "@iroha2/data-model";
import {
  CactusIrohaV2Client,
  generateIrohaV2KeyPair,
} from "./cactus-iroha2-client";

export interface IPluginLedgerConnectorIroha2Options
  extends ICactusPluginOptions {
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  defaultConfig?: Iroha2BaseConfig;
}

export class PluginLedgerConnectorIroha2
  implements
    IPluginLedgerConnector<never, never, TransactRequestV1, TransactResponseV1>,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly defaultConfig: Iroha2BaseConfig | undefined;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public readonly className: string;

  constructor(public readonly options: IPluginLedgerConnectorIroha2Options) {
    this.className = this.constructor.name;
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "info";
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });

    this.instanceId = options.instanceId;
    this.defaultConfig = options.defaultConfig;
  }

  async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();
    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  deployContract(): Promise<never> {
    throw new Error("Method not implemented.");
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    // Nothing to do...
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  // TODO - universal WS endpoints too
  async registerWebServices(
    app: Express,
    // wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [
      new TransactEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      }),
      new QueryEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      }),
    ];

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha2`;
  }

  private async getFromKeychain(keychainId: string, keychainRef: string) {
    const keychain = this.options.pluginRegistry.findOneByKeychainId(
      keychainId,
    );
    return JSON.parse(await keychain.get(keychainRef));
  }

  private async getSigningKeyPair(
    signingCredentials: Iroha2KeyPair | KeychainReference,
  ): Promise<KeyPair> {
    Checks.truthy(
      signingCredentials,
      "getSigningKeyPair() signingCredentials arg",
    );

    let publicKeyString: string;
    let privateKeyJson: Iroha2KeyJson;
    if ("keychainId" in signingCredentials) {
      this.log.debug("getSigningKeyPair() read from keychain plugin");
      const keychainStoredKey = await this.getFromKeychain(
        signingCredentials.keychainId,
        signingCredentials.keychainRef,
      );
      publicKeyString = keychainStoredKey.publicKey;
      privateKeyJson = keychainStoredKey.privateKey;
    } else {
      this.log.debug(
        "getSigningKeyPair() read directly from signingCredentials",
      );
      publicKeyString = signingCredentials.publicKey;
      privateKeyJson = signingCredentials.privateKey;
    }

    Checks.truthy(publicKeyString, "getSigningKeyPair raw public key");
    Checks.truthy(privateKeyJson, "getSigningKeyPair raw private key json");

    return generateIrohaV2KeyPair(publicKeyString, privateKeyJson);
  }

  public async getClient(
    baseConfig?: Iroha2BaseConfig,
  ): Promise<CactusIrohaV2Client> {
    if (!baseConfig && !this.defaultConfig) {
      throw new Error("getClient() called without valid Iroha config - fail");
    }

    // Merge default config with config passed to this function
    const mergedConfig = { ...this.defaultConfig, ...baseConfig };

    if (!mergedConfig.torii) {
      throw new Error("torii is missing in combined configuration");
    }

    // Parse signing key pair
    let keyPair: KeyPair | undefined;
    if (mergedConfig.signingCredential) {
      keyPair = await this.getSigningKeyPair(mergedConfig.signingCredential);
    }

    // Parse account ID
    let accountId: AccountId | undefined;
    if (mergedConfig.accountId) {
      accountId = AccountId({
        name: mergedConfig.accountId.name,
        domain_id: DomainId({
          name: mergedConfig.accountId.domainId,
        }),
      });
    }

    // Convert timeToLiveMs to BigInt if needed
    let timeToLiveMs: bigint | undefined;
    if (mergedConfig.transaction?.timeToLiveMs) {
      timeToLiveMs = BigInt(mergedConfig.transaction.timeToLiveMs);
    }

    // Create client
    return new CactusIrohaV2Client(
      {
        torii: mergedConfig.torii,
        accountId,
        keyPair,
        transaction: {
          ...mergedConfig.transaction,
          timeToLiveMs,
        },
      },
      this.options.logLevel,
    );
  }

  public async transact(req: TransactRequestV1): Promise<TransactResponseV1> {
    const client = await this.getClient(req.baseConfig);

    try {
      let instructions: IrohaInstructionRequestV1[];
      if (Array.isArray(req.instruction)) {
        instructions = req.instruction;
      } else {
        instructions = [req.instruction];
      }

      instructions.forEach(async (cmd) => {
        switch (cmd.name) {
          case IrohaInstruction.CreateDomain:
            await client.registerDomain(cmd.params[0]);
            break;
          default:
            throw new Error("Unknown Iroha V2 command supplied.");
        }
      });

      await client.send();

      return {
        status: "OK",
      };
    } finally {
      client.free();
    }
  }

  public async query(req: QueryRequestV1): Promise<QueryResponseV1> {
    const client = await this.getClient(req.baseConfig);

    try {
      switch (req.queryName) {
        case IrohaQuery.FindAllDomains:
          return {
            response: await client.query.findAllDomains(),
          };
        default:
          throw new Error("Unknown Iroha V2 command supplied.");
      }
    } finally {
      client.free();
    }
  }
}
