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

log.setDefaultLevel("DEBUG");

import { createAliceAgent, createIssuerAgent } from "../lib/agent-setup";
import { connectAgents } from "../lib/connections";
import { issueCredential } from "../lib/credentials";
import { checkCredentialProof } from "../lib/proofs";

// https://github.com/SamVerschueren/listr ??
async function runTest() {
  const aliceAgent = await createAliceAgent();
  console.log("BOB FINISHED");

  const { agent: issuerAgent, did: isserDid } = await createIssuerAgent();
  console.log("ISSUER DONE");

  console.log("Connect...");
  const [aliceAgentConRecord, issuerAgentConRecord] = await connectAgents(
    aliceAgent,
    issuerAgent,
  );
  log.debug("Alice connection ID:", aliceAgentConRecord.id);
  log.debug("Issuer connection ID:", issuerAgentConRecord.id);

  console.log("Issue...");
  const { credentialDefinitionId } = await issueCredential(
    issuerAgent,
    [
      { name: "first_name", value: "Alice" },
      { name: "last_name", value: "Garcia" },
      { name: "salary", value: "2400" },
      { name: "employee_status", value: "Permanent" },
      { name: "experience", value: "10" },
    ],
    issuerAgentConRecord.id,
    isserDid,
  );

  console.log("Check proof...");
  await checkCredentialProof(
    issuerAgent,
    credentialDefinitionId,
    issuerAgentConRecord.id,
  );

  console.log("Close...");
  await aliceAgent.shutdown();
  await issuerAgent.shutdown();
}

void runTest();
