//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const containerImageName = "ghcr.io/outsh/cactus-indy-all-in-one";
const containerImageVersion = "0.1";

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const leaveLedgerRunning = false;
const useRunningLedger = false;

// Log settings
const testLogLevel: LogLevelDesc = "debug";

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { v4 as uuidV4 } from "uuid";
import { AddressInfo } from "net";
import { Server as SocketIoServer } from "socket.io";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  IndyTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import * as path from "node:path";
import * as os from "node:os";
import { rmdir } from "node:fs/promises";

import {
  PluginLedgerConnectorAries,
  AriesApiClient,
  AriesAgentSummaryV1,
  AgentConnectionRecordV1,
} from "../../../main/typescript/public-api";

import {
  Agent,
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  DidExchangeState,
  OutOfBandRecord,
  ConnectionRecord,
} from "@aries-framework/core";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "basic-indy-check.test",
  level: testLogLevel,
});

const AFJ_WALLET_PATH = path.join(os.homedir(), ".afj/data/wallet/");

// TODO - spearate?
describe("Connector setup tests", () => {
  const fakeIndyNetworkConfig = {
    isProduction: false,
    genesisTransactions: `{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"172.16.0.2","client_port":9702,"node_ip":"172.16.0.2","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}`,
    indyNamespace: "cacti:test",
    connectOnStartup: true,
  };
  let connector: PluginLedgerConnectorAries;
  let agentName: string;

  beforeEach(() => {
    connector = new PluginLedgerConnectorAries({
      instanceId: uuidV4(),
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
    });
  });

  afterEach(async () => {
    if (connector) {
      log.info("Cleanup the temporary connector...");
      await connector.shutdown();
    }

    if (agentName) {
      try {
        const walletPath = path.join(AFJ_WALLET_PATH, agentName);
        await rmdir(walletPath, { recursive: true, maxRetries: 5 });
        log.info(`${walletPath} remove successfully.`);
      } catch (error) {
        log.warn(`${agentName} could not be removed:`, error);
      }
    }
  });

  test("Basic connector construction works", async () => {
    expect(connector).toBeTruthy();
    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(0);
  });

  test("Adding simple aries agent works", async () => {
    agentName = `simple-${uuidV4()}`;

    await connector.addAriesAgent({
      name: agentName,
      walletKey: agentName,
      indyNetworks: [fakeIndyNetworkConfig],
    });

    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(1);
    const agent = allAgents.pop() as AriesAgentSummaryV1;
    expect(agent).toBeTruthy();
    expect(agent.name).toEqual(agentName);
    expect(agent.walletConfig.id).toEqual(agentName);
    expect(agent.isAgentInitialized).toBeTrue();
    expect(agent.isWalletInitialized).toBeTrue();
    expect(agent.isWalletProvisioned).toBeTrue();
  });

  test("Adding aries agent with inbound url works", async () => {
    agentName = `inbound-${uuidV4()}`;
    const inboundUrl = "http://127.0.0.1:8253";

    await connector.addAriesAgent({
      name: agentName,
      walletKey: agentName,
      indyNetworks: [fakeIndyNetworkConfig],
      inboundUrl,
    });

    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(1);
    const agent = allAgents.pop() as AriesAgentSummaryV1;
    expect(agent).toBeTruthy();
    expect(agent.name).toEqual(agentName);
    expect(agent.walletConfig.id).toEqual(agentName);
    expect(agent.isAgentInitialized).toBeTrue();
    expect(agent.isWalletInitialized).toBeTrue();
    expect(agent.isWalletProvisioned).toBeTrue();

    // Check endpoint
    expect(agent.endpoints.length).toBe(1);
    const agentEndpoint = agent.endpoints.pop() as string;
    expect(agentEndpoint).toBeTruthy();
    expect(agentEndpoint).toEqual(inboundUrl);
  });

  test("Adding aries agent with invalid inbound url throws error", async () => {
    agentName = `shouldThrow-${uuidV4()}`;

    try {
      await connector.addAriesAgent({
        name: agentName,
        walletKey: agentName,
        indyNetworks: [fakeIndyNetworkConfig],
        inboundUrl: "foo",
      });
      expect("should throw!").toBe(0);
    } catch (error) {
      log.info(
        "Adding aries agent with inbound url 'foo' throws error as expected",
      );
    }

    try {
      await connector.addAriesAgent({
        name: agentName,
        walletKey: agentName,
        indyNetworks: [fakeIndyNetworkConfig],
        inboundUrl: "http://127.0.0.1",
      });
      expect("should throw!").toBe(0);
    } catch (error) {
      log.info(
        "Adding aries agent without inbound url port throws error as expected",
      );
    }

    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(0);
  });

  test("Removing single aries agent works", async () => {
    agentName = `removeCheck-${uuidV4()}`;

    await connector.addAriesAgent({
      name: agentName,
      walletKey: agentName,
      indyNetworks: [fakeIndyNetworkConfig],
    });

    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(1);
    await connector.removeAriesAgent(agentName);
    const allAgentsAfterRemoval = await connector.getAgents();
    expect(allAgentsAfterRemoval.length).toBe(0);
  });

  test("Connector shutdown clears aries agent", async () => {
    agentName = `shutdownCheck-${uuidV4()}`;

    await connector.addAriesAgent({
      name: agentName,
      walletKey: agentName,
      indyNetworks: [fakeIndyNetworkConfig],
    });

    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(1);
    await connector.shutdown();
    const allAgentsAfterShutdown = await connector.getAgents();
    expect(allAgentsAfterShutdown.length).toBe(0);
  });
});

describe("Schemas and credential creation", () => {
  let addressInfo,
    address: string,
    port: number,
    apiHost,
    apiConfig,
    ledger: IndyTestLedger,
    apiClient: AriesApiClient,
    connector: PluginLedgerConnectorAries;

  const indyNamespace = "cacti:test";
  const aliceAgentName = `cacti-alice-${uuidV4()}`;
  const aliceInboundUrl = "http://127.0.0.1:8255";
  const bobAgentName = `cacti-bob-${uuidV4()}`;
  const bobInboundUrl = "http://127.0.0.1:8256";
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  //////////////////////////////////
  // Setup
  //////////////////////////////////

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();

    //ledger = new GethTestLedger({ emitContainerLogs: true, testLogLevel });
    ledger = new IndyTestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: false,
      logLevel: testLogLevel,
    });
    await ledger.start();

    addressInfo = (await Servers.listen({
      hostname: "127.0.0.1",
      port: 0,
      server,
    })) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new AriesApiClient(apiConfig);

    connector = new PluginLedgerConnectorAries({
      instanceId: uuidV4(),
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ariesAgents: [
        {
          name: aliceAgentName,
          walletKey: aliceAgentName,
          indyNetworks: [await ledger.getIndyVdrPoolConfig(indyNamespace)],
          inboundUrl: aliceInboundUrl,
          autoAcceptConnections: true,
        },
        {
          name: bobAgentName,
          walletKey: bobAgentName,
          indyNetworks: [await ledger.getIndyVdrPoolConfig(indyNamespace)],
          inboundUrl: bobInboundUrl,
          autoAcceptConnections: true,
        },
      ],
    });

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
    await connector.onPluginInit();

    // Import endorser DID for Alice Agent
    await connector.importExistingIndyDidFromPrivateKey(
      aliceAgentName,
      ledger.getEndorserDidSeed(),
      indyNamespace,
    );
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (server) {
      log.info("Stop the connector server...");
      await Servers.shutdown(server);
    }

    if (connector) {
      log.info("Stop the connector...");
      await connector.shutdown();
    }

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the indy ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // try {
    //   await rmdir(walletPath, { recursive: true, maxRetries: 5 });
    //   log.info(`${walletPath} remove successfully.`);
    // } catch (error) {
    //   log.warn(`${walletPath} could not be removed:`, error);
    // }
  });

  test("Aries agent created on plugin init", async () => {
    const allAgents = await connector.getAgents();
    expect(allAgents.length).toBe(2);
  });

  test("Invitation with custom domain works", async () => {
    const customDomain = "https://my-custom-domain.org";
    const invitationResponse = await apiClient.createNewConnectionInvitationV1({
      agentName: aliceAgentName,
      invitationDomain: customDomain,
    });
    const { invitationUrl, outOfBandId } = invitationResponse.data;
    expect(invitationUrl).toBeTruthy();
    expect(outOfBandId).toBeTruthy();
    expect(new URL(invitationUrl).origin).toEqual(customDomain);
  });

  test("Connect to another aries agent using invitation URL", async () => {
    // Connect Alice and Bob
    log.info("1. Create invitation from Alice");
    const invitationResponse = await apiClient.createNewConnectionInvitationV1({
      agentName: aliceAgentName,
    });
    const invitationUrl = invitationResponse.data.invitationUrl;
    const aliceOutOfBandId = invitationResponse.data.outOfBandId;
    expect(invitationUrl).toBeTruthy();
    expect(aliceOutOfBandId).toBeTruthy();
    const isPeerConnectedPromise = apiClient.waitForInvitedPeerConnectionV1(
      aliceAgentName,
      aliceOutOfBandId,
    );

    log.info("2. Accept invitation as Bob");
    const acceptResponse = await apiClient.acceptInvitationV1({
      agentName: bobAgentName,
      invitationUrl: invitationUrl,
    });
    const bobOutOfBandId = acceptResponse.data.outOfBandId;
    expect(bobOutOfBandId).toBeTruthy();

    log.info("3. Wait for connection readiness on Bob side");
    await apiClient.waitForConnectionReadyV1(bobAgentName, bobOutOfBandId);

    log.info("4. Wait for connection readiness on Alice side");
    await isPeerConnectedPromise;

    log.info("Connection between Alice and Bob connectors established!");

    // Check getConnectionsV1 endpoint
    const bobConnectionsResponse = await apiClient.getConnectionsV1({
      agentName: bobAgentName,
      filter: {
        state: "completed",
      },
    });
    expect(bobConnectionsResponse).toBeTruthy();
    expect(bobConnectionsResponse.data).toBeTruthy();
    const firstBobConnection =
      bobConnectionsResponse.data.pop() as AgentConnectionRecordV1;
    expect(firstBobConnection).toBeTruthy();
    expect(firstBobConnection.state).toEqual("completed");
    expect(firstBobConnection.isReady).toBeTrue();
  });
});
