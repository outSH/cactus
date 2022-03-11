import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";

import { PluginLedgerConnectorQuorum } from "./main/typescript/index";

import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import express from "express";
import http from "http";
import { AddressInfo } from "net";

// Parse environment
const logLevel = (process.env.QUORUM_LOG_LEVEL as LogLevelDesc) || "debug";
const rpcApiHttpHost =
  process.env.QUORUM_RPC_HTTP_HOST || "http://localhost:8545";
const rpcApiWsHost = process.env.QUORUM_RPC_WS_HOST || "ws://localhost:8546";
const localPort = 9113;

const log: Logger = LoggerProvider.getOrCreate({
  label: "quorum-monitor.test",
  level: logLevel,
});

async function main() {
  log.debug("logLevel=", logLevel);
  log.debug("rpcApiHttpHost=", rpcApiHttpHost);
  log.debug("rpcApiWsHost=", rpcApiWsHost);
  log.debug("localPort=", localPort);

  log.info("Create PluginLedgerConnectorQuorum...");

  const connector = new PluginLedgerConnectorQuorum({
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel: logLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });

  log.info("Start HTTP and WS servers...");
  const expressApp = express();
  expressApp.use(express.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: localPort,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  log.info("Listening on: ", apiHost);
  log.info(
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
  );
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);

  // Allow close from Ctrl + C
  process.on("SIGINT", async () => {
    log.info("Caught SIGINT");
    await connector.shutdown();
    log.info("Shutdown the server...");
    if (server) {
      await Servers.shutdown(server);
    }
  });
}

main();
