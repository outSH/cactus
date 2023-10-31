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

const seed = TypedArrayEncoder.fromString(`000000000000000000000000Steward1`); // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `Bt17egJz8UzzmYd6iGJ6S1`; // will be returned after registering seed on bcovrin
// Verkey: 6vvDZ5YE4WRd39YwG9zn6s5vcz6trnHUcSihXfanVeqy
const indyDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;

const bcovrinGenesisTx = `{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"138.197.138.255","client_port":9702,"node_ip":"138.197.138.255","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node2","blskey":"37rAPpXVoxzKhz7d9gkUe52XuXryuLXoM6P6LbWDB7LSbG62Lsb33sfG7zqS8TK1MXwuCHj1FKNzVpsnafmqLG1vXN88rt38mNFs9TENzm4QHdBzsvCuoBnPH7rpYYDo9DZNJePaDvRvqJKByCabubJz3XXKbEeshzpz4Ma5QYpJqjk","blskey_pop":"Qr658mWZ2YC8JXGXwMDQTzuZCWF7NK9EwxphGmcBvCh6ybUuLxbG65nsX4JvD4SPNtkJ2w9ug1yLTj6fgmuDg41TgECXjLCij3RMsV8CwewBVgVN67wsA45DFWvqvLtu4rjNnE9JbdFTc1Z4WCPA3Xan44K1HoHAq9EVeaRYs8zoF5","client_ip":"138.197.138.255","client_port":9704,"node_ip":"138.197.138.255","node_port":9703,"services":["VALIDATOR"]},"dest":"8ECVSk179mjsjKRLWiQtssMLgp6EPhWXtaYyStWPSGAb"},"metadata":{"from":"EbP4aYNeTHL6q385GuVpRV"},"type":"0"},"txnMetadata":{"seqNo":2,"txnId":"1ac8aece2a18ced660fef8694b61aac3af08ba875ce3026a160acbc3a3af35fc"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node3","blskey":"3WFpdbg7C5cnLYZwFZevJqhubkFALBfCBBok15GdrKMUhUjGsk3jV6QKj6MZgEubF7oqCafxNdkm7eswgA4sdKTRc82tLGzZBd6vNqU8dupzup6uYUf32KTHTPQbuUM8Yk4QFXjEf2Usu2TJcNkdgpyeUSX42u5LqdDDpNSWUK5deC5","blskey_pop":"QwDeb2CkNSx6r8QC8vGQK3GRv7Yndn84TGNijX8YXHPiagXajyfTjoR87rXUu4G4QLk2cF8NNyqWiYMus1623dELWwx57rLCFqGh7N4ZRbGDRP4fnVcaKg1BcUxQ866Ven4gw8y4N56S5HzxXNBZtLYmhGHvDtk6PFkFwCvxYrNYjh","client_ip":"138.197.138.255","client_port":9706,"node_ip":"138.197.138.255","node_port":9705,"services":["VALIDATOR"]},"dest":"DKVxG2fXXTU8yT5N7hGEbXB3dfdAnYv1JczDUHpmDxya"},"metadata":{"from":"4cU41vWW82ArfxJxHkzXPG"},"type":"0"},"txnMetadata":{"seqNo":3,"txnId":"7e9f355dffa78ed24668f0e0e369fd8c224076571c51e2ea8be5f26479edebe4"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node4","blskey":"2zN3bHM1m4rLz54MJHYSwvqzPchYp8jkHswveCLAEJVcX6Mm1wHQD1SkPYMzUDTZvWvhuE6VNAkK3KxVeEmsanSmvjVkReDeBEMxeDaayjcZjFGPydyey1qxBHmTvAnBKoPydvuTAqx5f7YNNRAdeLmUi99gERUU7TD8KfAa6MpQ9bw","blskey_pop":"RPLagxaR5xdimFzwmzYnz4ZhWtYQEj8iR5ZU53T2gitPCyCHQneUn2Huc4oeLd2B2HzkGnjAff4hWTJT6C7qHYB1Mv2wU5iHHGFWkhnTX9WsEAbunJCV2qcaXScKj4tTfvdDKfLiVuU2av6hbsMztirRze7LvYBkRHV3tGwyCptsrP","client_ip":"138.197.138.255","client_port":9708,"node_ip":"138.197.138.255","node_port":9707,"services":["VALIDATOR"]},"dest":"4PS3EDQ3dW1tci1Bp6543CfuuebjFrg36kLAUcskGfaA"},"metadata":{"from":"TWwCRQRZ2ZHMJFn9TzLp7W"},"type":"0"},"txnMetadata":{"seqNo":4,"txnId":"aa5e817d7cc626170eca175822029339a444eb0ee8f0bd20d3b0b76e566fb008"},"ver":"1"}`;

export const genesisTransactions = readFileSync(
  "/home/vagrant/cactus/tools/docker/indy-testnet/sandbox/pool_transactions_genesis",
).toString("utf-8");

export const localTestNetwork = {
  isProduction: false,
  genesisTransactions,
  indyNamespace: "bcovrin:test",
  connectOnStartup: true,
};

const initializeBobAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: "demo-agent-bob",
    walletConfig: {
      id: "mainBob",
      key: "demoagentbob00000000000000000000",
    },
    endpoints: ["http://localhost:3003"],
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
          new V1CredentialProtocol({
            indyCredentialFormat: legacyIndyCredentialFormatService,
          }),
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
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3003 }));

  // Initialize the agent
  await agent.initialize();

  return agent;
};

const initializeBobAgentLegacy = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: "demo-agent-bob",
    walletConfig: {
      id: "mainBob",
      key: "demoagentbob00000000000000000000",
    },
    endpoints: ["http://localhost:3003"],
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
        // autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        credentialProtocols: [
          new V1CredentialProtocol({
            indyCredentialFormat: legacyIndyCredentialFormatService,
          }),
          new V2CredentialProtocol({
            credentialFormats: [legacyIndyCredentialFormatService],
          }),
        ],
      }),

      proofs: new ProofsModule({
        autoAcceptProofs: AutoAcceptProof.Always,
        proofProtocols: [
          new V1ProofProtocol({
            indyProofFormat: legacyIndyProofFormatService,
          }),
          new V2ProofProtocol({
            proofFormats: [legacyIndyProofFormatService],
          }),
        ],
      }),

      anoncreds: new AnonCredsModule({
        // Here we add an Indy VDR registry as an example, any AnonCreds registry
        // can be used
        registries: [new IndySdkAnonCredsRegistry()],
      }),

      // AnonCreds RS is a direct implementation of the AnonCreds V1.0 specification that provides functionality like; creating a schema object, creating a credential definition object, creating a credential, verifying a proof presentation and much more.
      //  we should register both the AnonCreds and AnonCredsRs module on the agent.
      indySdk: new IndySdkModule({
        indySdk,
        networks: [localTestNetwork],
      }),

      // Did resolvers configured to work with IndyVDR
      dids: new DidsModule({
        resolvers: [new IndySdkSovDidResolver()],
      }),
    },
    dependencies: agentDependencies,
  });

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new WsOutboundTransport());

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new HttpOutboundTransport());

  // Register a simple `Http` inbound transport
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3003 }));

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
    options: {},
  });

  if (schemaResult.schemaState.state === "failed") {
    throw new Error(
      `Error creating schema: ${schemaResult.schemaState.reason}`,
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
      options: {},
    });

  if (credentialDefinitionResult.credentialDefinitionState.state === "failed") {
    throw new Error(
      `Error creating credential definition: ${credentialDefinitionResult.credentialDefinitionState.reason}`,
    );
  }

  return credentialDefinitionResult;
};

async function run() {
  console.log("Initializing Bob agent...");
  const bobAgent = await initializeBobAgent();

  // TODO - read
  try {
    const invitationUrl =
      "https://example.org?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJmMGM5N2ExMy0zZGFhLTRkZDUtOWY3Ni01ZTY0ZDBjMDBjNjgiLCJsYWJlbCI6ImRlbW8tYWdlbnQtYWNtZSIsImFjY2VwdCI6WyJkaWRjb21tL2FpcDEiLCJkaWRjb21tL2FpcDI7ZW52PXJmYzE5Il0sImhhbmRzaGFrZV9wcm90b2NvbHMiOlsiaHR0cHM6Ly9kaWRjb21tLm9yZy9kaWRleGNoYW5nZS8xLjAiLCJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMCJdLCJzZXJ2aWNlcyI6W3siaWQiOiIjaW5saW5lLTAiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEiLCJ0eXBlIjoiZGlkLWNvbW11bmljYXRpb24iLCJyZWNpcGllbnRLZXlzIjpbImRpZDprZXk6ejZNa21xc0xYUzhtQ3VjQ01VN0toWm1Ob25HUjZxMVB5bjlZdEdoOXN3VEtMcVpFIl0sInJvdXRpbmdLZXlzIjpbXX1dfQ";
    console.log("Accepting the invitation as Bob...");
    await receiveInvitation(bobAgent, invitationUrl);
  } catch (error) {
    console.log("Connection alrady on");
  }

  //////////////////////////
  // ACCEPT credential

  try {
    console.log("Setup listener");
    setupCredentialListener(bobAgent);
  } catch (error) {
    console.error("error", error);
  }

  //// Crate proof?
  await new Promise((resolve) => setTimeout(resolve, 15000));

  /////////////////
  // CREATE PROOF REQUEST

  // Create proof request listener for alice
  bobAgent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      console.log("PROOF RECORD RECEIVED ON BOB:", payload.proofRecord);

      if (payload.proofRecord.state === ProofState.RequestReceived) {
        console.log("PROOF REQUEST RECEIVED (BOB)!");

        const requestedCredentials =
          await bobAgent.proofs.selectCredentialsForRequest({
            proofRecordId: payload.proofRecord.id,
          });
        console.log("requestedCredentials", requestedCredentials);

        await bobAgent.proofs.acceptRequest({
          proofRecordId: payload.proofRecord.id,
          proofFormats: requestedCredentials.proofFormats,
        });
        console.log("proof accepted by BOB");
      }
    },
  );

  console.log("DONE.");
}

async function runForBlp() {
  console.log("Initializing Bob agent...");
  const bobAgent = await initializeBobAgent();

  // TODO - read
  let outOfBandRecordId = "604eb97f-7f0a-4f8b-86b8-edffeaeb114b";
  const conRec =
    await bobAgent.connections.findAllByOutOfBandId(outOfBandRecordId);
  console.log("conRec", conRec);
  if (conRec && conRec[0]) {
    outOfBandRecordId = conRec[0].outOfBandId ?? "";
  } else {
    console.log("Creating the invitation as Acme...");
    const { outOfBandRecord, invitationUrl } =
      await createNewInvitation(bobAgent);
    outOfBandRecordId = outOfBandRecord.id;
    console.log("outOfBandRecord", outOfBandRecord);
    console.log("Listening for connection changes...", invitationUrl);
  }
  await waitForConnection(bobAgent, outOfBandRecordId);
  console.log("outOfBandRecordId:", outOfBandRecordId);

  /////////////////
  // CREATE PROOF REQUEST

  // Create proof request listener for alice
  bobAgent.events.on(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }: ProofStateChangedEvent) => {
      console.log("PROOF RECORD RECEIVED ON BOB:", payload.proofRecord);

      if (payload.proofRecord.state === ProofState.RequestReceived) {
        console.log("PROOF REQUEST RECEIVED (BOB)!");

        const requestedCredentials =
          await bobAgent.proofs.selectCredentialsForRequest({
            proofRecordId: payload.proofRecord.id,
          });
        console.log("requestedCredentials", requestedCredentials);

        await bobAgent.proofs.acceptRequest({
          proofRecordId: payload.proofRecord.id,
          proofFormats: requestedCredentials.proofFormats,
        });
        console.log("proof accepted by BOB");
      }
    },
  );

  console.log("DONE.");
}

runForBlp();
