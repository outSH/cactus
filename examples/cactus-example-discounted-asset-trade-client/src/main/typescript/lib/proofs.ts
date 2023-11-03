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
  ProofExchangeRecord,
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

export async function checkCredentialProof(
  agent: Agent,
  credentialDefinitionId: string,
  connectionId: string,
) {
  // Create proof accepted listener
  const isProofOK = new Promise<ProofExchangeRecord>((resolve) => {
    agent.events.on(
      ProofEventTypes.ProofStateChanged,
      async ({ payload }: ProofStateChangedEvent) => {
        console.log("PROOF RECORD RECEIVED ON ACME:", payload.proofRecord);
        const { state } = payload.proofRecord;
        if (
          state === ProofState.Done ||
          state === ProofState.Abandoned ||
          state === ProofState.Declined
        ) {
          console.log("PROOF received!");
          // TODO - check if this is the proof we wanted
          resolve(payload.proofRecord);
        }
      },
    );
  });

  // Send proof
  const proofAttribute = {
    employee_status: {
      name: "employee_status",
      restrictions: [
        {
          "attr::employee_status::value": "Permanent",
          cred_def_id: credentialDefinitionId,
        },
      ],
    },
  };

  await agent.proofs.requestProof({
    protocolVersion: "v2",
    connectionId,
    proofFormats: {
      anoncreds: {
        name: "proof-request",
        version: "1.0",
        requested_attributes: proofAttribute,
      },
    },
  });
  console.log("PROOF REQUEST SENT");

  return isProofOK;
}
