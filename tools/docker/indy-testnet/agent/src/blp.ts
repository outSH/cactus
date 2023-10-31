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
  IndyVdrRegisterSchemaOptions,
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1ProofProtocol,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import { readFileSync } from "fs";

const seed = TypedArrayEncoder.fromString(`000000000000000000000000Steward1`); // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `Bt17egJz8UzzmYd6iGJ6S1`; // will be returned after registering seed on bcovrin
// Verkey: 6vvDZ5YE4WRd39YwG9zn6s5vcz6trnHUcSihXfanVeqy
const indyDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;

export const genesisTransactions = readFileSync(
  "/home/vagrant/cactus/tools/docker/indy-testnet/sandbox/pool_transactions_genesis",
).toString("utf-8");

export const localTestNetwork = {
  isProduction: false,
  genesisTransactions,
  indyNamespace: "bcovrin:test",
  connectOnStartup: true,
};

const initializeBLPAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label.
  const config: InitConfig = {
    label: "demo-agent-blp",
    walletConfig: {
      id: "blpmain",
      key: "demoagentacme0000000000000000000",
    },
    endpoints: ["http://localhost:3009"],
  };

  const legacyIndyCredentialFormatService =
    new LegacyIndyCredentialFormatService();
  const legacyIndyProofFormatService = new LegacyIndyProofFormatService();

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const agent = new Agent({
    config,
    modules: {
      connections: new ConnectionsModule({
        autoAcceptConnections: true,
      }),

      // For issuing credentials
      credentials: new CredentialsModule({
        autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        credentialProtocols: [
          new V2CredentialProtocol({
            // credentialFormats: [legacyIndyCredentialFormatService, new AnonCredsCredentialFormatService()],
            credentialFormats: [
              legacyIndyCredentialFormatService,
              new AnonCredsCredentialFormatService(),
            ],
          }),
        ],
      }),

      proofs: new ProofsModule({
        autoAcceptProofs: AutoAcceptProof.ContentApproved,
        proofProtocols: [
          new V1ProofProtocol({
            indyProofFormat: legacyIndyProofFormatService,
          }),
          new V2ProofProtocol({
            proofFormats: [
              legacyIndyProofFormatService,
              new AnonCredsProofFormatService(),
            ],
          }),
        ],
      }),

      anoncreds: new AnonCredsModule({
        // Here we add an Indy VDR registry as an example, any AnonCreds registry
        // can be used
        registries: [new IndyVdrAnonCredsRegistry()],
      }),

      // AnonCreds RS is a direct implementation of the AnonCreds V1.0 specification that provides functionality like; creating a schema object, creating a credential definition object, creating a credential, verifying a proof presentation and much more.
      //  we should register both the AnonCreds and AnonCredsRs module on the agent.
      anoncredsRs: new AnonCredsRsModule({
        anoncreds,
      }),

      //Hyperledger Indy VDR, Verifiable Data Registry, can be used to connect to one or more Indy Node ledger pools given sets of genesis transactions
      indyVdr: new IndyVdrModule({
        indyVdr, //  implements all the native bindings for Indy VDR
        networks: [localTestNetwork],
      }),

      // Did resolvers configured to work with IndyVDR
      dids: new DidsModule({
        registrars: [new IndyVdrIndyDidRegistrar()],
        resolvers: [new IndyVdrIndyDidResolver()],
      }),

      askar: new AskarModule({ ariesAskar }),
    },
    dependencies: agentDependencies,
  });

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new WsOutboundTransport());

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new HttpOutboundTransport());

  // Register a simple `Http` inbound transport
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3009 }));

  // Initialize the agent
  await agent.initialize();

  return agent;
};

const createNewInvitation = async (agent: Agent) => {
  const outOfBandRecord = await agent.oob.createInvitation();

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "https://example.org",
    }),
    outOfBandRecord,
  };
};

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } =
    await agent.oob.receiveInvitationFromUrl(invitationUrl);

  return outOfBandRecord;
};

// Listen for connections
const setupConnectionListener = (
  agent: Agent,
  outOfBandRecord: OutOfBandRecord,
  cb: (...args: any) => void,
) => {
  agent.events.on<ConnectionStateChangedEvent>(
    ConnectionEventTypes.ConnectionStateChanged,
    ({ payload }) => {
      if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return;
      if (payload.connectionRecord.state === DidExchangeState.Completed) {
        // the connection is now ready for usage in other protocols!
        console.log(
          `Connection for out-of-band id ${outOfBandRecord.id} completed`,
        );

        // Custom business logic can be included here
        // In this example we can send a basic message to the connection, but
        // anything is possible
        cb();
      }
    },
  );
};

async function waitForConnection(agent: Agent, outOfBandId: string) {
  if (!outOfBandId) {
    throw new Error("Missing outOfBandId");
  }

  console.log("Waiting for Alice to finish connection...");

  const getConnectionRecord = (outOfBandId: string) =>
    new Promise<ConnectionRecord>((resolve, reject) => {
      // Timeout of 30 seconds
      const timeoutId = setTimeout(
        () => reject(new Error("Missing connection")),
        60000,
      );

      // Start listener
      agent.events.on<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        (e) => {
          if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return;
          clearTimeout(timeoutId);
          resolve(e.payload.connectionRecord);
        },
      );

      // Also retrieve the connection record by invitation if the event has already fired
      void agent.connections
        .findAllByOutOfBandId(outOfBandId)
        .then(([connectionRecord]) => {
          if (connectionRecord) {
            clearTimeout(timeoutId);
            resolve(connectionRecord);
          }
        });
    });

  const connectionRecord = await getConnectionRecord(outOfBandId);

  try {
    await agent.connections.returnWhenIsConnected(connectionRecord.id);
  } catch (e) {
    console.log("Timeout reached!");
    return;
  }
  console.log("Connection OK!");
}

// Listen for credential
const setupCredentialListener = (agent: Agent) => {
  return new Promise((resolve, reject) => {
    agent.events.on<CredentialStateChangedEvent>(
      CredentialEventTypes.CredentialStateChanged,
      async ({ payload }) => {
        console.log("CRED:", payload.credentialRecord);
        switch (payload.credentialRecord.state) {
          case CredentialState.OfferReceived:
            console.log("sent success");
            break;
          case CredentialState.Done:
            console.log(
              `Credential for credential id ${payload.credentialRecord.id} is accepted`,
            );
        }
        resolve(payload.credentialRecord);
      },
    );
  });
};

/**
 * Register Endorser DID at http://test.bcovrin.vonx.io/
 * Load it by it's seed here.
 * No need to do if endorser DID already in wallet.
 * @param agent
 */
const loadEndorserToken = async (agent: Agent) => {
  await agent.dids.import({
    did: indyDid,
    overwrite: true,
    privateKeys: [
      {
        privateKey: seed,
        keyType: KeyType.Ed25519,
      },
    ],
  });
};

export async function importExistingIndyDidFromPrivateKey(agent: Agent) {
  const buf = TypedArrayEncoder.fromString("000000000000000000000000Steward1");
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    privateKey: buf,
  });

  // did is first 16 bytes of public key encoded as base58
  const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
    key.publicKey.slice(0, 16),
  );

  console.log("HODOR KEY:", key.publicKey);
  console.log("HODOR unqualifiedIndyDid:", unqualifiedIndyDid);
  console.log("HODOR DID:", `did:indy:bcovrin:test:${unqualifiedIndyDid}`);

  // import the did in the wallet so it can be used
  await agent.dids.import({
    did: `did:indy:bcovrin:test:${unqualifiedIndyDid}`,
  });

  return unqualifiedIndyDid;
}

const registerCredentialSchema = async (agent: Agent, did: string) => {
  const randomString = Math.random().toString(36).substr(2, 10);
  const schemaResult = await agent.modules.anoncreds.registerSchema({
    schema: {
      attrNames: ["name"],
      issuerId: did, // must be the same as an endorser DID in your wallet.
      name: randomString,
      version: "1.0.0",
    },
    options: {
      endorserMode: "internal",
      endorserDid: did,
    },
  });

  if (schemaResult.schemaState.state !== "finished") {
    throw new Error(
      `Error registering schema: ${
        schemaResult.schemaState.state === "failed"
          ? schemaResult.schemaState.reason
          : "Not Finished"
      }`,
    );
  }

  return schemaResult;
};

const registerCredentialDefinition = async (
  agent: Agent,
  schemaResult: any,
  did: string,
) => {
  const credentialDefinitionResult =
    await agent.modules.anoncreds.registerCredentialDefinition({
      credentialDefinition: {
        tag: "default",
        issuerId: did, // must be the same as an endorser DID in your wallet.
        schemaId: schemaResult.schemaState.schemaId,
      },
      options: {
        endorserMode: "internal",
        endorserDid: did,
      },
    });

  if (
    credentialDefinitionResult.credentialDefinitionState.state !== "finished"
  ) {
    throw new Error(
      `Error registering credential definition: ${
        credentialDefinitionResult.credentialDefinitionState.state === "failed"
          ? credentialDefinitionResult.credentialDefinitionState.reason
          : "Not Finished"
      }}`,
    );
  }

  return credentialDefinitionResult;
};

const run = async () => {
  console.log("Initializing BLP agent...");
  const blpAgent = await initializeBLPAgent();

  // Connect BLP with Alice
  let outOfBandRecordId = "8c334af4-ba40-496b-abbf-d61cd4b2ddf3";
  try {
    const invitationUrl =
      "https://example.org?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJiZWYwYjA1Ny1iYjZlLTQzMDctYjY2ZS0yZDM0YWYzNWQ5MTAiLCJsYWJlbCI6ImRlbW8tYWdlbnQtYm9iIiwiYWNjZXB0IjpbImRpZGNvbW0vYWlwMSIsImRpZGNvbW0vYWlwMjtlbnY9cmZjMTkiXSwiaGFuZHNoYWtlX3Byb3RvY29scyI6WyJodHRwczovL2RpZGNvbW0ub3JnL2RpZGV4Y2hhbmdlLzEuMCIsImh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wIl0sInNlcnZpY2VzIjpbeyJpZCI6IiNpbmxpbmUtMCIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMyIsInR5cGUiOiJkaWQtY29tbXVuaWNhdGlvbiIsInJlY2lwaWVudEtleXMiOlsiZGlkOmtleTp6Nk1rcTZ2WEdrN0JyQ1RuOUhUNnVqeUt0M2lHMjdWb3daTXBoMzdLWjR4Y1lVOTQiXSwicm91dGluZ0tleXMiOltdfV19";
    console.log("Accepting the invitation from alice in BLP...");

    const oob = await receiveInvitation(blpAgent, invitationUrl);
    outOfBandRecordId = oob.id;
  } catch (error) {
    console.log("Connection alrady on");
  }

  // Get connection
  console.log("outOfBandRecord ID:", outOfBandRecordId);
  const [connection] =
    await blpAgent.connections.findAllByOutOfBandId(outOfBandRecordId);

  if (!connection) {
    throw Error("No connection!");
  }
  console.log("Conn ID:", connection.id);

  /////////////////
  // CREATE PROOF REQUEST

  // Create proof accepted listener
  blpAgent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      console.log("PROOF RECORD RECEIVED ON ACME:", payload.proofRecord);
      if (payload.proofRecord.state === ProofState.Done) {
        console.log("PROOF ACCEPTED (ACME)!");
      }
    },
  );

  // Send proof
  const credentialDefinitionId =
    "did:indy:bcovrin:test:Th7MpTaRZVRYnPiabds81Y/anoncreds/v0/CLAIM_DEF/63/default"; // TODO - get??
  const proofAttribute = {
    name: {
      name: "name",
      restrictions: [
        {
          cred_def_id: credentialDefinitionId,
        },
      ],
    },
  };

  await blpAgent.proofs.requestProof({
    protocolVersion: "v2",
    connectionId: connection.id,
    proofFormats: {
      anoncreds: {
        name: "proof-request",
        version: "1.0",
        requested_attributes: proofAttribute,
      },
    },
  });
  console.log("PROOF REQUEST SENT");

  console.log("DONE.");
};

export default run;

void run();
