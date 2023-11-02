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

//////////////////////////////////

import * as log from "loglevel";

const JOB_CERTIFICATE_SCHEMA_ATTRS = [
  "first_name",
  "last_name",
  "salary",
  "employee_status",
  "experience",
];
const JOB_CERTIFICATE_SCHEMA_NAME = "cactiJobCert_TODO2"; // todo change
export type JobCertificateSchema = [
  { name: "first_name"; value: string },
  { name: "last_name"; value: string },
  { name: "salary"; value: string },
  { name: "employee_status"; value: string },
  { name: "experience"; value: string },
];

export async function registerCredentialSchema(agent: Agent, did: string) {
  log.info(
    `Register job certificate credential schema '${JOB_CERTIFICATE_SCHEMA_NAME}'...`,
  );

  const [createdSchema] = await agent.modules.anoncreds.getCreatedSchemas({
    schemaName: JOB_CERTIFICATE_SCHEMA_NAME,
  });
  if (createdSchema) {
    log.info("Schema was already registered", createdSchema);
    return createdSchema.schemaId;
  }

  const schemaResult = await agent.modules.anoncreds.registerSchema({
    schema: {
      attrNames: JOB_CERTIFICATE_SCHEMA_ATTRS,
      issuerId: did,
      name: JOB_CERTIFICATE_SCHEMA_NAME,
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

  return schemaResult.schemaState.schemaId;
}

export async function registerCredentialDefinition(
  agent: Agent,
  schemaId: string,
  did: string,
) {
  log.info(
    `Register job certificate credential definition (schemaId: '${schemaId}') ...`,
  );

  const [createdCredentialDefinition] =
    await agent.modules.anoncreds.getCreatedCredentialDefinitions({
      schemaId,
      issuerId: did,
    });
  if (createdCredentialDefinition) {
    log.info(
      "Credential definition was already registered",
      createdCredentialDefinition,
    );
    return createdCredentialDefinition.credentialDefinitionId;
  }

  const credentialDefinitionResult =
    await agent.modules.anoncreds.registerCredentialDefinition({
      credentialDefinition: {
        tag: "default",
        issuerId: did,
        schemaId: schemaId,
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

  return credentialDefinitionResult.credentialDefinitionState
    .credentialDefinitionId;
}

const ISSUE_ACCEPT_POLL_INTERVAL = 1000;

export async function issueCredential(
  issuerAgent: Agent,
  credential: JobCertificateSchema,
  connectionId: string,
  did: string,
) {
  console.log("Register Credential Schema");
  const schemaId = await registerCredentialSchema(issuerAgent, did);
  console.log("schemaId:", schemaId);

  console.log("Register Credential Definition");
  const credentialDefinitionId = await registerCredentialDefinition(
    issuerAgent,
    schemaId,
    did,
  );
  console.log("credentialDefinitionId:", credentialDefinitionId);

  // Issue
  // const issent = setupCredentialListener(acmeAgent)

  const indyCredentialExchangeRecord = await (
    issuerAgent as any
  ).credentials.offerCredential({
    protocolVersion: "v2",
    connectionId,
    credentialFormats: {
      anoncreds: {
        credentialDefinitionId,
        attributes: credential,
      },
    },
  });

  // Can wait for acceptance as well
  console.log("indyCredentialExchangeRecord:", indyCredentialExchangeRecord);

  // Wait for credential acceptance
  let credentialState: CredentialState | undefined;
  do {
    await new Promise((resolve) =>
      setTimeout(resolve, ISSUE_ACCEPT_POLL_INTERVAL),
    );
    const credential = await issuerAgent.credentials.findById(
      indyCredentialExchangeRecord.id,
    );
    credentialState = credential?.state;
    console.log("credentialState:", credentialState);
  } while (credentialState !== CredentialState.Done);

  console.log("Issue done!");
  return {
    schemaId,
    credentialDefinitionId,
    credentialId: indyCredentialExchangeRecord.id,
  };
}

export async function getAgentCredentials(agent: Agent) {
  const validCredentials = await agent.credentials.findAllByQuery({
    state: CredentialState.Done,
  });
  log.debug("Valid credentials count:", validCredentials.length);

  return validCredentials.map((c) => {
    return {
      id: c.id,
      schemaId: c.metadata.data["_anoncreds/credential"].schemaId,
      credentialDefinitionId:
        c.metadata.data["_anoncreds/credential"].credentialDefinitionId,
      connectionId: c.connectionId,
      credentials: c.credentials,
      credentialAttributes: c.credentialAttributes,
    };
  });
}
