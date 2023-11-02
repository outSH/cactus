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

const CONNECT_WAIT_TIMEOUT = 60 * 1000;

export async function createNewConnectionInvitation(agent: Agent) {
  const outOfBandRecord = await agent.oob.createInvitation();

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "https://example.org",
    }),
    outOfBandRecord,
  };
}

export async function acceptInvitation(agent: Agent, invitationUrl: string) {
  const { outOfBandRecord } =
    await agent.oob.receiveInvitationFromUrl(invitationUrl);

  return outOfBandRecord;
}

export async function waitForConnection(agent: Agent, outOfBandId: string) {
  if (!outOfBandId) {
    throw new Error("Missing outOfBandId in waitForConnection");
  }

  const getConnectionRecord = (outOfBandId: string) =>
    new Promise<ConnectionRecord>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Missing connection")),
        CONNECT_WAIT_TIMEOUT,
      );

      // Start listener
      agent.events.on<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        (e) => {
          if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return;
          log.debug(
            "waitForConnection() - received ConnectionStateChanged event for given outOfBandId",
          );
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

  return agent.connections.returnWhenIsConnected(connectionRecord.id);
}

export async function getConnectionWithPeerAgent(
  agent: Agent,
  peerAgentLabel: string,
) {
  const completedConnections = await agent.connections.findAllByQuery({
    state: DidExchangeState.Completed,
  });
  log.debug(
    `getConnectionWithPeerAgent() - found ${completedConnections.length} completed connections`,
  );

  return completedConnections
    .filter((cr) => {
      return cr.theirLabel && cr.theirLabel === peerAgentLabel;
    })
    .pop();
}

export async function connectAgents(
  firstAgent: Agent,
  secondAgent: Agent,
): Promise<ConnectionRecord[]> {
  log.info(
    `Connecting ${firstAgent.config.label} to ${secondAgent.config.label}...`,
  );

  let firstAgentConnectionRecord = await getConnectionWithPeerAgent(
    firstAgent,
    secondAgent.config.label,
  );
  let secondAgentConnectionRecord = await getConnectionWithPeerAgent(
    secondAgent,
    firstAgent.config.label,
  );

  if (firstAgentConnectionRecord && secondAgentConnectionRecord) {
    log.info("Agents already connected, using previous connection records...");
    return [firstAgentConnectionRecord, secondAgentConnectionRecord];
  }

  // Create an invitation from the firstAgent
  const { outOfBandRecord: firstAgentOOBRecord, invitationUrl } =
    await createNewConnectionInvitation(firstAgent);
  const isConnectedPromise = waitForConnection(
    firstAgent,
    firstAgentOOBRecord.id,
  );

  // Accept invitation as the secondAgent
  const secondAgentOOBRecord = await acceptInvitation(
    secondAgent,
    invitationUrl,
  );

  // Wait until connection is done
  await isConnectedPromise;

  // Get newly created connection records
  firstAgentConnectionRecord = (
    await firstAgent.connections.findAllByOutOfBandId(firstAgentOOBRecord.id)
  ).pop();
  secondAgentConnectionRecord = (
    await secondAgent.connections.findAllByOutOfBandId(secondAgentOOBRecord.id)
  ).pop();

  if (firstAgentConnectionRecord && secondAgentConnectionRecord) {
    log.info("Agents connected!");
    return [firstAgentConnectionRecord, secondAgentConnectionRecord];
  }

  throw new Error("Could not connect the agents!");
}
