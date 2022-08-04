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
} from "./generated/openapi/typescript-axios";

import { TransactEndpoint } from "./web-services/transact-endpoint";

import { hexToBytes } from "hada";
import { crypto } from "@iroha2/crypto-target-node";
import { KeyPair } from "@iroha2/crypto-core";
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
  RegisterBox,
  Value,
  VecInstruction,
  //NewAccount,
  //QueryBox,
  // VecPublicKey,
  // PublicKey,
  // AssetValueType,
  // Mintable,
  // AssetDefinitionId,
  // EvaluatesToValue,
  // IdBox,
  // MintBox,
  // AssetId,
  // NewAssetDefinition,
  // FindDomainById,
  // EvaluatesToDomainId,
  // FindAccountById,
  // EvaluatesToAccountId,
  // FindAssetById,
  // EvaluatesToAssetId,
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

  getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    throw new Error("Method not implemented.");
  }

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

  public generateKeyPair(params: {
    publicKeyMultihash: string;
    privateKey: {
      digestFunction: string;
      payload: string;
    };
  }): KeyPair {
    // @todo: exception safety
    const multihashBytes = Uint8Array.from(
      hexToBytes(params.publicKeyMultihash),
    );
    const multihash = crypto.createMultihashFromBytes(multihashBytes);
    const publicKey = crypto.createPublicKeyFromMultihash(multihash);
    const privateKey = crypto.createPrivateKeyFromJsKey(params.privateKey);

    const keyPair = crypto.createKeyPairFromKeys(publicKey, privateKey);

    // always free created structures
    [publicKey, privateKey, multihash].forEach((x) => x.free());

    return keyPair;
  }

  public async transact(req: TransactRequestV1): Promise<TransactResponse> {
    const { baseConfig } = req;
    if (!baseConfig) {
      throw new Error("test empty");
    }

    this.log.warn("baseConfig.publicKey", baseConfig.publicKey);
    this.log.warn(
      "baseConfig.privateKey",
      JSON.stringify(baseConfig.privateKey),
    );

    // Create client
    const kp = this.generateKeyPair({
      publicKeyMultihash: baseConfig.publicKey ?? "",
      privateKey: baseConfig.privateKey as any, // todo: strict
    });

    this.log.warn("keyPair", JSON.stringify(kp));

    // More options available - https://github.com/hyperledger/iroha/issues/2118 and UserConfig
    const accountId = AccountId({
      name: baseConfig.accountId?.name as any,
      domain_id: DomainId({
        name: baseConfig.accountId?.domainId as any,
      }),
    });

    const client = new Client({
      torii: baseConfig.torii as any,
      accountId,
      keyPair: kp,
    });

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
}
