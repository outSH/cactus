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

const initializeAcmeAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label.
  const config: InitConfig = {
    label: "demo-agent-acme",
    walletConfig: {
      id: "mainAcme1",
      key: "demoagentacme0000000000000000000",
    },
    endpoints: ["http://localhost:3001"],
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
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 }));

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
  console.log("Initializing Acme agent...");
  const acmeAgent = await initializeAcmeAgent();

  console.log("Load ACME endorser DID...");
  try {
    await importExistingIndyDidFromPrivateKey(acmeAgent);
  } catch (error) {}

  const did = "did:indy:bcovrin:test:Th7MpTaRZVRYnPiabds81Y";

  let outOfBandRecordId = "ec363c2a-696b-47ab-ae05-a2c8620dfca0";
  const conRec =
    await acmeAgent.connections.findAllByOutOfBandId(outOfBandRecordId);
  console.log("conRec", conRec);
  if (conRec && conRec[0]) {
    outOfBandRecordId = conRec[0].outOfBandId ?? "";
  } else {
    console.log("Creating the invitation as Acme...");
    const { outOfBandRecord, invitationUrl } =
      await createNewInvitation(acmeAgent);
    outOfBandRecordId = outOfBandRecord.id;
    console.log("outOfBandRecord", outOfBandRecord);
    console.log("Listening for connection changes...", invitationUrl);
  }

  // setupConnectionListener(acmeAgent, outOfBandRecord, () =>
  //   console.log(
  //     "We now have an active connection to use in the following tutorials"
  //   )
  // );
  await waitForConnection(acmeAgent, outOfBandRecordId);
  console.log("outOfBandRecordId:", outOfBandRecordId);

  // TODO - only if not already created
  console.log("Register Credential Schema");
  const schemaResult = await registerCredentialSchema(acmeAgent, did);
  console.log("schemaResult:", schemaResult);
  // schemaResult: {
  //   schemaState: {
  //     state: 'finished',
  //     schema: {
  //       attrNames: [Array],
  //       issuerId: 'did:indy:bcovrin:test:Bt17egJz8UzzmYd6iGJ6S1',
  //       name: 'sample2',
  //       version: '1.0.0'
  //     },
  //     schemaId: 'did:indy:bcovrin:test:Bt17egJz8UzzmYd6iGJ6S1/anoncreds/v0/SCHEMA/sample2/1.0.0'
  //   },
  //   registrationMetadata: {},
  //   schemaMetadata: { indyLedgerSeqNo: 95971 }
  // }

  console.log("Register Credential Definition");
  const credentialDefinitionResult = await registerCredentialDefinition(
    acmeAgent,
    schemaResult,
    did,
  );
  console.log("credentialDefinitionResult:", credentialDefinitionResult);
  // credentialDefinitionResult: {
  //   credentialDefinitionMetadata: {},
  //   credentialDefinitionState: {
  //     credentialDefinition: {
  //       schemaId: 'did:indy:bcovrin:test:Bt17egJz8UzzmYd6iGJ6S1/anoncreds/v0/SCHEMA/sample2/1.0.0',
  //       type: 'CL',
  //       tag: 'default',
  //       value: [Object],
  //       issuerId: 'did:indy:bcovrin:test:Bt17egJz8UzzmYd6iGJ6S1'
  //     },
  //     credentialDefinitionId: 'did:indy:bcovrin:test:Bt17egJz8UzzmYd6iGJ6S1/anoncreds/v0/CLAIM_DEF/95971/default',
  //     state: 'finished'
  //   },
  //   registrationMetadata: {}
  // }

  //////////////////////////
  // Issue credential

  const issent = setupCredentialListener(acmeAgent);

  console.log("outOfBandRecord ID:", outOfBandRecordId);
  const [connection] =
    await acmeAgent.connections.findAllByOutOfBandId(outOfBandRecordId);

  if (!connection) {
    throw Error("No connection!");
  }
  console.log("Conn ID:", connection.id);

  const credId =
    credentialDefinitionResult.credentialDefinitionState.credentialDefinitionId;
  console.log("credentialDefinitionId:", credId);
  const indyCredentialExchangeRecord =
    await acmeAgent.credentials.offerCredential({
      protocolVersion: "v2",
      connectionId: connection.id,
      credentialFormats: {
        anoncreds: {
          credentialDefinitionId: credId,
          attributes: [{ name: "name", value: "Jane Doe" }],
        },
      },
    });
  // Can wait for acceptance as well
  console.log("indyCredentialExchangeRecord:", indyCredentialExchangeRecord);

  await new Promise((resolve) => setTimeout(resolve, 15000));
  const cred2 = await acmeAgent.credentials.findById(
    indyCredentialExchangeRecord.id,
  );
  console.log("cred2", cred2);
  // Accepted

  /////////////////
  // CREATE PROOF REQUEST

  // Create proof accepted listener
  acmeAgent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      console.log("PROOF RECORD RECEIVED ON ACME:", payload.proofRecord);
      if (payload.proofRecord.state === ProofState.Done) {
        console.log("PROOF ACCEPTED (ACME)!");
      }
    },
  );

  // Send proof
  const proofAttribute = {
    name: {
      name: "name",
      restrictions: [
        {
          cred_def_id:
            credentialDefinitionResult.credentialDefinitionState
              .credentialDefinitionId,
        },
      ],
    },
  };

  await acmeAgent.proofs.requestProof({
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
