/**
 * Functional test of basic operations on fabric persistence plugin (packages/cactus-plugin-persistence-fabric).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const dbConnectionString = "";

const testLogLevel: LogLevelDesc = "debug";
const sutLogLevel: LogLevelDesc = "debug";
const ledgerChannelName = "mychannel";
const setupTimeout = 1000 * 60 * 3; // 3 minutes timeout for setup
const testTimeout = 1000 * 60 * 5; // 5 minutes timeout for some async tests

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = true;
const leaveLedgerRunning = true;

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { Server as SocketIoServer } from "socket.io";

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { Constants, Configuration } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  DefaultEventHandlerStrategy,
  FabricApiClient,
  FabricSigningCredential,
  GetBlockResponseTypeV1,
  PluginLedgerConnectorFabric,
  WatchBlocksListenerTypeV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginPersistenceFabric } from "../../../main/typescript";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-functional.test",
  level: testLogLevel,
});

/**
 * TODO:
 * - Start monitoring, pass necessary data to persistence plugin.
 * - implement startMonitor and stopMonitor, investigate data returned. Check how it's done in ethereum connector, compare to this.
 */
describe("Fabric persistence plugin tests", () => {
  let ledger: FabricTestLedgerV1;
  let signingCredential: FabricSigningCredential;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let socketioServer: SocketIoServer;
  let apiClient: FabricApiClient;
  let instanceId: string;
  let persistence: PluginPersistenceFabric;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug("Fabric Version:", FABRIC_25_LTS_AIO_FABRIC_VERSION);
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info(`Get fabric connection profile for Org1...`);
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    log.debug("Fabric connection profile for Org1 OK: %o", connectionProfile);
    expect(connectionProfile).toBeTruthy();

    // Enroll admin and user
    const userOrg = "org1";
    const enrollAdminOut = await ledger.enrollAdminV2({
      organization: userOrg,
    });
    log.debug("Enrolled admin OK.");
    const adminWallet = enrollAdminOut[1];
    const userId = `testUser_${(Math.random() + 1).toString(36).substring(2)}`;
    const [userIdentity] = await ledger.enrollUserV2({
      enrollmentID: userId,
      organization: userOrg,
      wallet: adminWallet,
    });
    log.debug(`Enrolled user '${userId}' OK.`);

    // Create Keychain Plugin
    const keychainId = uuidv4();
    const keychainEntryKey = "user2";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
    });
    signingCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    // Create Connector Plugin
    fabricConnectorPlugin = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      sshConfig: await ledger.getSshConfig(),
      cliContainerEnv: {},
      peerBinary: "/fabric-samples/bin/peer",
      logLevel: sutLogLevel,
      connectionProfile,
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAnyfortx,
        commitTimeout: 300,
      },
    });

    // Run http server
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    connectorServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: connectorServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

    // Run socketio server
    socketioServer = new SocketIoServer(connectorServer, {
      path: Constants.SocketIoConnectionPathV1,
    });

    // Register services
    await fabricConnectorPlugin.getOrCreateWebServices();
    await fabricConnectorPlugin.registerWebServices(expressApp, socketioServer);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new FabricApiClient(apiConfig);

    // Create persistence plugin
    // TODO - Mock the DB
    instanceId = "functional-test";
    persistence = new PluginPersistenceFabric({
      apiClient,
      logLevel: sutLogLevel,
      instanceId,
      connectionString: dbConnectionString,
    });
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (persistence) {
      log.info("Stop persistence plugin...");
      await persistence.shutdown();
    }

    if (connectorServer) {
      log.info("Stop connector http servers...");
      await Servers.shutdown(connectorServer);
    }

    if (fabricConnectorPlugin) {
      log.info("Stop the connector...");
      await fabricConnectorPlugin.shutdown();
    }

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Sample test
   */
  test("Sample test", async () => {
    expect(true).toBeTruthy();

    const getBlockReq = {
      channelName: ledgerChannelName,
      gatewayOptions: {
        identity: signingCredential.keychainRef,
        wallet: {
          keychain: signingCredential,
        },
      },
      query: {
        blockNumber: "6",
      },
      type: GetBlockResponseTypeV1.CactiFullBlock,
    };

    const getBlockResponse = (await apiClient.getBlockV1(getBlockReq)) as any;
    log.debug("getBlockResponse HODOR", JSON.stringify(getBlockResponse.data));

    await persistence.startMonitor(
      {
        channelName: ledgerChannelName,
        gatewayOptions: {
          identity: signingCredential.keychainRef,
          wallet: {
            keychain: signingCredential,
          },
        },
        type: WatchBlocksListenerTypeV1.CactusFullBlock,
      },
      (err) => log.error("WATCH BLOCK ERROR", err),
    );

    await new Promise((resolve) => setTimeout(resolve, 99999999));
  });
});
