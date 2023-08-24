/**
 * TODO
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
const ledgerChannelName = "mychannel";
const ledgerContractName = "copyAssetTrade";
const ledgerPrivateContractName = "privateAssetTrade";

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = true;
const leaveLedgerRunning = true;

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { DiscoveryOptions, X509Identity } from "fabric-network";

import {
  Containers,
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

import { Configuration } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
  GatewayOptions,
  FabricContractInvocationType,
  RunTransactionRequest,
  FabricApiClient,
  signProposal,
} from "../../../../main/typescript/public-api";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "offline-signing.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Offline transaction signing tests", () => {
  let ledger: FabricTestLedgerV1;
  let gatewayOptions: GatewayOptions;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let apiClient: FabricApiClient;

  let adminIdentity: X509Identity;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug("Version:", fabricEnvVersion, "CA Version:", fabricEnvCAVersion);
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName,
      imageVersion,
      envVars: new Map([
        ["FABRIC_VERSION", fabricEnvVersion],
        ["CA_VERSION", fabricEnvCAVersion],
        ["CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP", "1"],
      ]),
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info("Get fabric connection profile for Org1...");
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();

    // Enroll admin and user
    const enrollAdminOut = await ledger.enrollAdmin();
    adminIdentity = enrollAdminOut[0];
    log.error("adminIdentity", adminIdentity);
    // const [userIdentity] = await ledger.enrollUser(enrollAdminOut[1]);

    // Create Keychain Plugin
    // todo - use user
    const keychainId = uuidv4();
    // const keychainEntryKey = "user";
    const keychainEntryKey = "admin";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      // backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
      backend: new Map([[keychainEntryKey, JSON.stringify(adminIdentity)]]),
    });

    gatewayOptions = {
      identity: keychainEntryKey,
      wallet: {
        keychain: {
          keychainId,
          keychainRef: keychainEntryKey,
        },
      },
    };

    // Create Connector Plugin
    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };
    fabricConnectorPlugin = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      sshConfig: await ledger.getSshConfig(),
      cliContainerEnv: {},
      peerBinary: "/fabric-samples/bin/peer",
      logLevel: sutLogLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAnyfortx,
        commitTimeout: 300,
      },
      signCallback: async (payload, txData) => {
        log.error("signCallback called for tx:", txData);
        return signProposal(adminIdentity.credentials.privateKey, payload);
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

    // Register services
    await fabricConnectorPlugin.getOrCreateWebServices();
    await fabricConnectorPlugin.registerWebServices(expressApp);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new FabricApiClient(apiConfig);

    // Deploy contract asset-transfer-basic
    if (!useRunningLedger) {
      const cmd = [
        "./network.sh",
        "deployCC",
        "-ccn",
        ledgerContractName,
        "-ccp",
        "../asset-transfer-basic/chaincode-go",
        "-ccl",
        "go",
      ];
      const container = ledger.getContainer();
      const timeout = 180000; // 3 minutes
      const cwd = "/fabric-samples/test-network/";
      const out = await Containers.exec(
        container,
        cmd,
        timeout,
        sutLogLevel,
        cwd,
      );
      expect(out).toBeTruthy();

      const resinit = await apiClient.runTransactionV1({
        gatewayOptions,
        channelName: ledgerChannelName,
        contractName: ledgerContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "InitLedger",
        params: [],
      } as RunTransactionRequest);
      expect(resinit).toBeTruthy();
      expect(resinit.data).toBeTruthy();
      expect(resinit.status).toEqual(200);
      log.error("INIT TX:", resinit.data);
    }

    // Deploy contract asset-transfer-private-data
    if (!useRunningLedger) {
      const cmd = [
        "./network.sh",
        "deployCC",
        "-ccn",
        ledgerPrivateContractName,
        "-ccp",
        "../asset-transfer-private-data/chaincode-go/",
        "-ccl",
        "go",
        "-ccep",
        "OR('Org1MSP.peer','Org2MSP.peer')",
        "-cccg",
        "../asset-transfer-private-data/chaincode-go/collections_config.json",
      ];
      const container = ledger.getContainer();
      const timeout = 180000; // 3 minutes
      const cwd = "/fabric-samples/test-network/";
      const out = await Containers.exec(
        container,
        cmd,
        timeout,
        sutLogLevel,
        cwd,
      );
      expect(out).toBeTruthy();

      // TODO - read to confirm it worked?
    }
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (fabricConnectorPlugin) {
      log.info("Close ApiClient connections...");
      fabricConnectorPlugin.shutdown();
    }

    if (connectorServer) {
      log.info("Stop the HTTP server connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test.skip("contract sainity check ", async () => {
    const res2 = await apiClient.runTransactionV1({
      gatewayOptions,
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "TransferAsset",
      params: ["asset1", "Foo2"],
    } as RunTransactionRequest);
    expect(res2).toBeTruthy();
    expect(res2.data).toBeTruthy();
    expect(res2.status).toEqual(200);
    log.error("SANITY TX:", res2.data);

    // CHECK
    const res = await apiClient.runTransactionV1({
      gatewayOptions,
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetAllAssets",
      params: [],
    } as RunTransactionRequest);
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    log.error("SANITY assets:", res.data);
  });

  test("Test offline sign ", async () => {
    // QUERY
    const resquery = await fabricConnectorPlugin.transactOfflineSign({
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: "Org1MSP",
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetAllAssets",
      params: [],
    });
    log.error("QUERY RESPONSE:", resquery);

    // TRANSACT
    const ress = await fabricConnectorPlugin.transactOfflineSign({
      invocationType: FabricContractInvocationType.Send,
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: "Org1MSP",
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
      methodName: "TransferAsset",
      params: ["asset2", "BarC"],
      uniqueTransactionData: "testTxId",
    });
    log.error("TX OFFLINE RESPONSE:", ress);
  });

  test.only("Test offline sign private tx", async () => {
    // TRANSACT
    const assetID = uuidv4();
    log.error("CREATE ASSETID:", assetID);
    const transientAssetData = {
      asset_properties: {
        objectType: "asset",
        assetID,
        color: "gray",
        size: 3,
        appraisedValue: 500,
      },
    };

    const ress = await fabricConnectorPlugin.transactOfflineSign({
      invocationType: FabricContractInvocationType.Sendprivate,
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: "Org1MSP",
      channelName: ledgerChannelName,
      contractName: ledgerPrivateContractName,
      methodName: "CreateAsset",
      params: [],
      uniqueTransactionData: "testTxId",
      transientData: transientAssetData,
    });
    log.error("TX PRIV OFFLINE RESPONSE:", ress);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // QUERY
    const resquery = await fabricConnectorPlugin.transactOfflineSign({
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: "Org1MSP",
      channelName: ledgerChannelName,
      contractName: ledgerPrivateContractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadAsset",
      params: [assetID],
    });
    log.error("QUERY PRIV RESPONSE:", resquery);
  });
});
