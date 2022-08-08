import type { Express } from "express";
import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
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

import {
  // IrohaCommand,
  // IrohaQuery,
  TransactRequestV1,
  TransactResponse,
  Iroha2BaseConfig,
  Iroha2KeyJson,
  Iroha2KeyPair,
  KeychainReference,
} from "./generated/openapi/typescript-axios";

import { TransactEndpoint } from "./web-services/transact-endpoint";

import { hexToBytes } from "hada";
import { crypto } from "@iroha2/crypto-target-node";
import { Key, KeyPair } from "@iroha2/crypto-core";
import { setCrypto, Client } from "@iroha2/client";
import {
  AccountId,
  DomainId,
  EvaluatesToRegistrableBox,
  Executable,
  Expression,
  IdentifiableBox,
  Instruction,
  MapNameValue,
  Metadata,
  NewDomain,
  OptionIpfsPath,
  QueryBox,
  RegisterBox,
  Value,
  VecInstruction,
} from "@iroha2/data-model";

setCrypto(crypto);

export interface IPluginLedgerConnectorIroha2Options
  extends ICactusPluginOptions {
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  defaultConfig?: Iroha2BaseConfig;
}

export class PluginLedgerConnectorIroha2
  implements
    IPluginLedgerConnector<never, never, TransactRequestV1, TransactResponse>,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  private readonly defaultConfig: Iroha2BaseConfig | undefined;
  private readonly log: Logger;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";

  public get className(): string {
    return PluginLedgerConnectorIroha2.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIroha2Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.defaultConfig = options.defaultConfig;
  }

  // TODO
  getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    throw new Error("Method not implemented.");
  }

  // TODO
  hasTransactionFinality(): Promise<boolean> {
    throw new Error("Method not implemented.");
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
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
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
      const endpoint = new TransactEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

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

  private generateKeyPair(
    publicKeyMultihash: string,
    privateKeyJson: Key,
  ): KeyPair {
    const freeableKeys: { free(): void }[] = [];

    try {
      const multihashBytes = Uint8Array.from(hexToBytes(publicKeyMultihash));

      const multihash = crypto.createMultihashFromBytes(multihashBytes);
      freeableKeys.push(multihash);
      const publicKey = crypto.createPublicKeyFromMultihash(multihash);
      freeableKeys.push(publicKey);
      const privateKey = crypto.createPrivateKeyFromJsKey(privateKeyJson);
      freeableKeys.push(privateKey);

      const keyPair = crypto.createKeyPairFromKeys(publicKey, privateKey);

      return keyPair;
    } finally {
      freeableKeys.forEach((x) => x.free());
    }
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

    return this.generateKeyPair(publicKeyString, privateKeyJson);
  }

  public async getClient(baseConfig?: Iroha2BaseConfig): Promise<Client> {
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
    // TODO - free keyPair at some point
    return new Client({
      torii: mergedConfig.torii,
      accountId,
      keyPair,
      transaction: {
        ...mergedConfig.transaction,
        timeToLiveMs,
      },
    });
  }

  public async transact(req: TransactRequestV1): Promise<TransactResponse> {
    const client = await this.getClient(req.baseConfig);

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          Value(
            "Identifiable",
            IdentifiableBox(
              "NewDomain",
              NewDomain({
                id: DomainId({
                  name: req.params[0],
                }),
                metadata: Metadata({ map: MapNameValue(new Map()) }),
                logo: OptionIpfsPath("None"),
              }),
            ),
          ),
        ),
      }),
    });

    await client.submit(
      Executable(
        "Instructions",
        VecInstruction([Instruction("Register", registerBox)]),
      ),
    );

    return {
      transactionReceipt: "OK?",
    };
  }

  public async query(req: any): Promise<any> {
    const client = await this.getClient(req.baseConfig);

    const result = await client.request(QueryBox("FindAllDomains", null));

    const domain = result.as("Ok").result.as("Vec");
    this.log.error(domain);

    return domain;
  }
}
