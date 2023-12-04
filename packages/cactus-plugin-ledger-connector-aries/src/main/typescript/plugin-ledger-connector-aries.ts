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

import {
  AriesAgentConfigV1,
  AriesAgentSummaryV1,
  CactiAcceptPolicyV1,
} from "./generated/openapi/typescript-axios";

import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GetAgentsEndpoint } from "./web-services/get-agents-v1-endpoint";

///////
import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  HttpOutboundTransport,
  ConnectionsModule,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
  CredentialsModule,
  V2CredentialProtocol,
  ProofsModule,
  AutoAcceptProof,
  V2ProofProtocol,
  AutoAcceptCredential,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrPoolConfig,
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import {
  AnoncredAgent,
  cactiAcceptPolicyToAutoAcceptCredential,
  cactiAcceptPolicyToAutoAcceptProof,
} from "./aries-types";
///////////

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
  private ariesAgents = new Map<string, AnoncredAgent>();

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

    for (const [agentName, agent] of this.ariesAgents) {
      this.log.debug("Shutdown agent", agentName);
      await agent.shutdown();
    }

    this.ariesAgents.clear();
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

  public async getAgents(): Promise<AriesAgentSummaryV1[]> {
    const allAgents = new Array(...this.ariesAgents.values());
    return allAgents.map((agent) => {
      if (!agent.config.walletConfig) {
        throw new Error(
          `Agent ${agent.config.label} doesn't have wallet configured`,
        );
      }

      return {
        name: agent.config.label,
        isAgentInitialized: agent.isInitialized,
        isWalletInitialized: agent.wallet.isInitialized,
        isWalletProvisioned: agent.wallet.isProvisioned,
        walletConfig: {
          id: agent.config.walletConfig.id,
          type: agent.config.walletConfig.storage?.type ?? "unknown",
        },
        endpoints: agent.config.endpoints,
      };
    });
  }

  private getAskarAnonCredsIndyModules(agentConfig: AriesAgentConfigV1) {
    if (!agentConfig.indyNetworks || agentConfig.indyNetworks.length === 0) {
      throw new Error(
        `Agent ${agentConfig.name} must have at least one Indy network defined!`,
      );
    }
    const autoAcceptConnections = agentConfig.autoAcceptConnections ?? false;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptConnections:`,
      autoAcceptConnections,
    );
    const autoAcceptCredentials = agentConfig.autoAcceptCredentials
      ? cactiAcceptPolicyToAutoAcceptCredential(
          agentConfig.autoAcceptCredentials,
        )
      : AutoAcceptCredential.Never;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptCredentials:`,
      autoAcceptCredentials,
    );
    const autoAcceptProofs = agentConfig.autoAcceptProofs
      ? cactiAcceptPolicyToAutoAcceptProof(agentConfig.autoAcceptProofs)
      : AutoAcceptProof.Never;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptProofs:`,
      autoAcceptProofs,
    );

    return {
      connections: new ConnectionsModule({
        autoAcceptConnections,
      }),

      credentials: new CredentialsModule({
        autoAcceptCredentials,
        credentialProtocols: [
          new V2CredentialProtocol({
            credentialFormats: [new AnonCredsCredentialFormatService()],
          }),
        ],
      }),

      proofs: new ProofsModule({
        autoAcceptProofs,
        proofProtocols: [
          new V2ProofProtocol({
            proofFormats: [new AnonCredsProofFormatService()],
          }),
        ],
      }),

      anoncreds: new AnonCredsModule({
        registries: [new IndyVdrAnonCredsRegistry()],
      }),

      anoncredsRs: new AnonCredsRsModule({
        anoncreds,
      }),

      indyVdr: new IndyVdrModule({
        indyVdr,
        networks: agentConfig.indyNetworks as [
          IndyVdrPoolConfig,
          ...IndyVdrPoolConfig[],
        ],
      }),

      dids: new DidsModule({
        registrars: [new IndyVdrIndyDidRegistrar()],
        resolvers: [new IndyVdrIndyDidResolver()],
      }),

      askar: new AskarModule({ ariesAskar }),
    } as const;
  }

  public async addAriesAgent(
    agentConfig: AriesAgentConfigV1,
  ): Promise<AnoncredAgent> {
    Checks.truthy(agentConfig, `addAriesAgent arg agentConfig`);
    Checks.truthy(agentConfig.name, `addAriesAgent arg agentConfig.name`);
    Checks.truthy(
      agentConfig.walletKey,
      `addAriesAgent arg agentConfig.walletKey`,
    );
    Checks.truthy(
      agentConfig.indyNetworks,
      `addAriesAgent arg agentConfig.indyNetworks`,
    );

    const config: InitConfig = {
      label: agentConfig.name,
      walletConfig: {
        id: agentConfig.name,
        key: agentConfig.walletKey,
      },
      endpoints: agentConfig.inboundUrl ? [agentConfig.inboundUrl] : undefined,
    };

    const agent = new Agent({
      config,
      modules: this.getAskarAnonCredsIndyModules(agentConfig),
      dependencies: agentDependencies,
    });

    if (agentConfig.inboundUrl) {
      const port = parseInt(new URL(agentConfig.inboundUrl).port, 10);
      if (!port) {
        throw new Error(
          `inboundUrl (${agentConfig.inboundUrl}) for agent ${agentConfig.name} must contain port`,
        );
      }
      agent.registerInboundTransport(new HttpInboundTransport({ port }));
    }
    agent.registerOutboundTransport(new HttpOutboundTransport());

    await agent.initialize();
    this.ariesAgents.set(agentConfig.name, agent);

    return agent;
  }

  public async removeAriesAgent(agentName: string): Promise<void> {
    const agent = this.ariesAgents.get(agentName);
    if (agent) {
      await agent.shutdown();
      this.ariesAgents.delete(agentName);
      this.log.info("removeAriesAgent(): Agent removed: ", agentName);
    } else {
      this.log.warn("removeAriesAgent(): No agent with name", agentName);
    }
  }

  // TODO
  // async function importExistingIndyDidFromPrivateKey(
  //   agent: Agent<any>,
  //   seed: string,
  // ): Promise<string> {
  //   const [endorserDid] = await agent.dids.getCreatedDids({ method: "indy" });
  //   if (endorserDid) {
  //     throw new Error("Endorser DID already present in a wallet");
  //   }

  //   const seedBuffer = TypedArrayEncoder.fromString(seed);
  //   const key = await agent.wallet.createKey({
  //     keyType: KeyType.Ed25519,
  //     privateKey: seedBuffer,
  //   });

  //   // did is first 16 bytes of public key encoded as base58
  //   const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
  //     key.publicKey.slice(0, 16),
  //   );

  //   const did = `did:indy:${TEST_INDY_NAMESPACE}:${unqualifiedIndyDid}`;

  //   await agent.dids.import({
  //     did,
  //   });

  //   return did;
  // }
}
