import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  WsOutboundTransport,
  HttpOutboundTransport,
  DidExchangeState,
  OutOfBandRecord,
  ConnectionsModule,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
  CredentialsModule,
  V2CredentialProtocol,
  CredentialStateChangedEvent,
  CredentialEventTypes,
  CredentialState,
  ConnectionRecord,
  ProofEventTypes,
  ProofStateChangedEvent,
  ProofState,
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
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import { readFileSync } from "fs";
import {
  IndySdkAnonCredsRegistry,
  IndySdkModule,
  IndySdkSovDidResolver,
} from "@aries-framework/indy-sdk";
import * as indySdk from "indy-sdk";

import * as log from "loglevel";

// TODO - fix path
export const genesisTransactions = readFileSync(
  "/home/vagrant/cactus/tools/docker/indy-testnet/sandbox/pool_transactions_genesis",
).toString("utf-8");

export const localTestNetwork = {
  isProduction: false,
  genesisTransactions,
  indyNamespace: "bcovrin:test",
  connectOnStartup: true,
};

export async function importExistingIndyDidFromPrivateKey(
  agent: Agent,
  seed: string,
) {
  const [endorserDid] = await agent.dids.getCreatedDids({ method: "indy" });
  if (endorserDid) {
    console.log("Endorser DID already present in a wallet");
    return endorserDid.did;
  }

  const seedBuffer = TypedArrayEncoder.fromString(seed);
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    privateKey: seedBuffer, // todo: seed?
  });

  // did is first 16 bytes of public key encoded as base58
  const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
    key.publicKey.slice(0, 16),
  );
  const did = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;

  // import the did in the wallet so it can be used
  await agent.dids.import({
    did,
  });

  return did;
}

export async function setupAgent(name: string, port: number) {
  const config: InitConfig = {
    label: name,
    walletConfig: {
      id: name,
      key: name,
    },
    endpoints: [`http://localhost:${port}`],
  };

  const agent = new Agent({
    config,
    modules: getAskarAnonCredsIndyModules(),
    dependencies: agentDependencies,
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port }));
  await agent.initialize();

  return agent;
}

function getAskarAnonCredsIndyModules() {
  return {
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),

    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V2CredentialProtocol({
          credentialFormats: [new AnonCredsCredentialFormatService()],
        }),
      ],
    }),

    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
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
      networks: [localTestNetwork],
    }),

    dids: new DidsModule({
      registrars: [new IndyVdrIndyDidRegistrar()],
      resolvers: [new IndyVdrIndyDidResolver()],
    }),

    askar: new AskarModule({ ariesAskar }),
  } as const;
}

// Consts
const ALICE_AGENT_NAME = "aliceCactiAgent";
const ALICE_AGENT_PORT = 3003;

// todo - listeners
const setupCredentialListener = (agent: Agent) => {
  agent.events.on<CredentialStateChangedEvent>(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }) => {
      console.log("CREDENTIAL REQUEST", payload.credentialRecord);
      switch (payload.credentialRecord.state) {
        case CredentialState.OfferReceived:
          console.log("received a credential");
          // custom logic here
          await agent.credentials.acceptOffer({
            credentialRecordId: payload.credentialRecord.id,
          });
          console.log("accepted!");
      }
    },
  );
};

const setupProofListener = (agent: Agent) => {
  agent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      console.log("PROOF RECORD RECEIVED ON BOB:", payload.proofRecord);

      if (payload.proofRecord.state === ProofState.RequestReceived) {
        console.log("PROOF REQUEST RECEIVED (BOB)!");

        const requestedCredentials =
          await agent.proofs.selectCredentialsForRequest({
            proofRecordId: payload.proofRecord.id,
          });
        console.log("requestedCredentials", requestedCredentials);

        await agent.proofs.acceptRequest({
          proofRecordId: payload.proofRecord.id,
          proofFormats: requestedCredentials.proofFormats,
        });
        console.log("proof accepted by BOB");
      }
    },
  );
};

export async function createAliceAgent() {
  const agent = await setupAgent(ALICE_AGENT_NAME, ALICE_AGENT_PORT);
  setupCredentialListener(agent);
  setupProofListener(agent);
  // TOdo - connect listener with logs
  return agent;
}

// Consts
const ISSUER_AGENT_NAME = "issuerCactiAgent";
const ISSUER_AGENT_PORT = 3004;
const ISSUER_DID_SEED = "000000000000000000000000Steward1";

export async function createIssuerAgent() {
  const agent = await setupAgent(ISSUER_AGENT_NAME, ISSUER_AGENT_PORT);
  const did = await importExistingIndyDidFromPrivateKey(agent, ISSUER_DID_SEED);
  log.info("Issuer DID:", did);

  return {
    agent,
    did,
  };
}
