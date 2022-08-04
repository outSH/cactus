/**
 * TODO
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const containerImageName = "ghcr.io/outsh/cactus_iroha2_all_in_one";
const containerImageVersion = "0.2";
const useRunningLedger = true;

// Log settings
const testLogLevel: LogLevelDesc = "debug";
const sutLogLevel: LogLevelDesc = "debug";

import {
  Iroha2ClientConfig,
  Iroha2TestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import { v4 as uuidv4 } from "uuid";
import http from "http";
import bodyParser from "body-parser";

import "jest-extended";
import { PluginLedgerConnectorIroha2 } from "../../../main/typescript";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import { AddressInfo } from "net";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "transact-query-endpoints.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Iroha V2 connector transact and query endpoints tests", () => {
  let ledger: Iroha2TestLedger;
  let connectorServer: http.Server;
  let iroha2ConnectorPlugin: PluginLedgerConnectorIroha2;
  let clientConfig: Iroha2ClientConfig;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start Iroha2TestLedger...");
    ledger = new Iroha2TestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: true,
      logLevel: testLogLevel,
    });
    log.debug("IrohaV2 image:", ledger.fullContainerImageName);
    expect(ledger).toBeTruthy();
    await ledger.start();

    // Get client config
    clientConfig = await ledger.getClientConfig();

    // Create Keychain Plugin
    const keychainId = uuidv4();
    const keychainEntryKey = "user2";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify({})]]),
    });

    iroha2ConnectorPlugin = new PluginLedgerConnectorIroha2({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
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
    log.debug("Iroha V2 connector URL:", apiHost);

    // Register services
    await iroha2ConnectorPlugin.getOrCreateWebServices();
    await iroha2ConnectorPlugin.registerWebServices(expressApp);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    // if (ledger) {
    //   log.info("Stop the fabric ledger...");
    //   await ledger.stop();
    //   await ledger.destroy();
    // }

    if (connectorServer) {
      log.info("Stop the fabric connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("Evaluate transaction returns correct data (GetAllAssets and ReadAsset)", async () => {
    const res = await iroha2ConnectorPlugin.transact({
      commandName: "test",
      baseConfig: {
        torii: {
          apiURL: clientConfig.TORII_API_URL,
          telemetryURL: clientConfig.TORII_TELEMETRY_URL,
        },
        accountId: {
          name: clientConfig.ACCOUNT_ID.name,
          domainId: clientConfig.ACCOUNT_ID.domain_id.name,
        },
        publicKey: clientConfig.PUBLIC_KEY,
        privateKey: {
          digestFunction: clientConfig.PRIVATE_KEY.digest_function,
          payload: clientConfig.PRIVATE_KEY.payload,
        },
      },
      params: ["test1"],
    });
    log.warn("res:", res);
    expect(res).toBeTruthy();
  });
});
