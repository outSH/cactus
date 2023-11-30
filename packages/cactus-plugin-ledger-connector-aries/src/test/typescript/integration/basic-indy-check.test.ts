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
const testLogLevel: LogLevelDesc = "info";

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

import {
  PluginLedgerConnectorAries,
  DefaultApi as AriesApi,
} from "../../../main/typescript/public-api";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "basic-indy-check.test",
  level: testLogLevel,
});

describe("TODO", () => {
  let addressInfo,
    address: string,
    port: number,
    apiHost,
    apiConfig,
    ledger: IndyTestLedger,
    apiClient: AriesApi,
    connector: PluginLedgerConnectorAries;

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
      hostname: "0.0.0.0",
      port: 0,
      server,
    })) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new AriesApi(apiConfig);

    connector = new PluginLedgerConnectorAries({
      instanceId: uuidV4(),
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (connector) {
      log.info("Stop the connector...");
      await connector.shutdown();
    }

    if (server) {
      log.info("Stop the connector server...");
      await Servers.shutdown(server);
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

  test("test", async () => {
    expect(1).toBe(1);
    const agents = await apiClient.getAgents();
    log.error("agents", agents.data);
  });
});
