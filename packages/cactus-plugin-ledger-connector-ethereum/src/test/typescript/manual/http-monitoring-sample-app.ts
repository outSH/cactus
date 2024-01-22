// How to use:
//  1. `npm run configure` in root of the project (or just npx tsc in this dir if the project has been build before)
//  2. Start the ethereum ledger:
//    DOCKER_BUILDKIT=1 docker build ./tools/docker/geth-all-in-one/ -t cactus_geth_all_in_one
//    docker run --rm --name geth_aio_testnet --detach -p 8545:8545 -p 8546:8546 cactus_geth_all_in_one
//    docker ps # ensure healthy
//  3. node dist/lib/test/typescript/manual/http-monitoring-sample-app.js
//  4. CTRL + C to stop, run again to restart from a file (file path: /etc/cactus/poll-block-monitor-status.json)
//  5. Cleanup: stop the containers, rm /etc/cactus/poll-block-monitor-status.json

const rpcApiHttpHost = "http://127.0.0.1:8545";
const statusFilePath = "/etc/cactus/poll-block-monitor-status.json";
const testLogLevel = "info";
const sutLogLevel = "info";

import * as fs from "node:fs";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { Server as SocketIoServer } from "socket.io";
import type { Subscription } from "rxjs";
import { v4 as uuidv4 } from "uuid";

import { Logger, LoggerProvider, Servers } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";

import {
  Configuration,
  EthereumApiClient,
  PluginLedgerConnectorEthereum,
} from "../../../main/typescript/index";

const log: Logger = LoggerProvider.getOrCreate({
  label: "http-monitoring-sample-app",
  level: testLogLevel,
});
log.info("Sample app started");

let connector: PluginLedgerConnectorEthereum;
let subscription: Subscription;
let statusFile: fs.promises.FileHandle;
const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);
const wsApi = new SocketIoServer(server, {
  path: Constants.SocketIoConnectionPathV1,
});

/**
 * MAIN SCRIPT LOGIC
 */
async function main() {
  log.info("Create PluginLedgerConnectorEthereum...");
  const addressInfo = await Servers.listen({
    hostname: "127.0.0.1",
    port: 0,
    server,
  });
  const apiClient = new EthereumApiClient(
    new Configuration({
      basePath: `http://${addressInfo.address}:${addressInfo.port}`,
    }),
  );
  connector = new PluginLedgerConnectorEthereum({
    rpcApiHttpHost,
    logLevel: sutLogLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [] }),
  });
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);
  log.info("Connector created!");

  // Ensure connection is OK
  const connectorResponse = await connector.invokeRawWeb3EthMethod({
    methodName: "getBlockNumber",
  });
  log.info("Current latest block:", Number(connectorResponse));

  let lastSeenBlock = undefined;

  try {
    statusFile = await fs.promises.open(statusFilePath, "r+");
  } catch (error) {
    statusFile = await fs.promises.open(statusFilePath, "w+");
  }
  const lastStatus = await statusFile.readFile("utf-8");
  if (lastStatus) {
    const { blockNumber } = JSON.parse(lastStatus);
    lastSeenBlock = blockNumber;
  }

  log.info("Start block monitorign since lastSeenBlock", lastSeenBlock);
  const watchObservable = apiClient.watchBlocksV1({
    getBlockData: false,
    lastSeenBlock,
    httpPollInterval: 1000,
  });

  subscription = watchObservable.subscribe({
    next: async (event) => {
      log.info("Block received:", event.blockHeader);
      await statusFile.write(
        JSON.stringify({
          blockNumber: event.blockHeader?.number,
          timestamp: event.blockHeader?.timestamp,
        }),
        0,
        "utf-8",
      );
    },
    error(err) {
      log.error("watchBlocksV1() error:", err);
      subscription.unsubscribe();
    },
  });
}

/**
 * CLEANUP ON EXIT
 */
async function cleanup() {
  console.log("Cleanup...");

  if (statusFile) {
    log.info("Closing status file");
    await statusFile.close();
  }

  if (subscription) {
    log.info("Unsubcribe the monitor");
    subscription.unsubscribe();
  }
  if (server) {
    log.info("Shutdown connector servers");
    await Servers.shutdown(server);
  }
  if (connector) {
    log.info("Shutdown connector");
    await connector.shutdown();
  }
}

// Handle exit
process.on("SIGINT", async () => await cleanup());
process.on("SIGTERM", async () => await cleanup());
process.on("end", async () => await cleanup());

main();
