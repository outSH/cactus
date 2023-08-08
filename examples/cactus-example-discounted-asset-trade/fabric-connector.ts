import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
  GetBlockResponseDecodedV1,
  FabricApiClient,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { Constants, Configuration } from "@hyperledger/cactus-core-api";

import http from "http";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { Wallets } from "fabric-network";
import { getLogger } from "log4js";
import { Server as SocketIoServer } from "socket.io";

const config: any = ConfigUtil.getConfig();
const moduleName = "fabric-connector";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const keychainId = uuidv4();

// Single Fabric connector instance
let fabricConnectorPlugin: PluginLedgerConnectorFabric | undefined = undefined;
let fabricApiClient: FabricApiClient | undefined = undefined;

// Prepare connection profile
// Fabric ledger should be running and it's config available in /etc/cactus/connector-fabric
const connectionProfile = {
  name: "test-network-org1",
  version: "1.0.0",
  client: {
    organization: "Org1",
    connection: { timeout: { peer: { endorser: "300" } } },
  },
  organizations: {
    Org1: {
      mspid: "Org1MSP",
      peers: ["peer0.org1.example.com"],
      certificateAuthorities: ["ca.org1.example.com"],
    },
  },
  peers: {
    "peer0.org1.example.com": {
      url: `grpcs://${config.assetTradeInfo.fabric.hostname}:7051`,
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem",
          "ascii",
        ),
      },
      grpcOptions: {
        "ssl-target-name-override": "peer0.org1.example.com",
        hostnameOverride: "peer0.org1.example.com",
      },
    },
  },
  certificateAuthorities: {
    "ca.org1.example.com": {
      url: `https://${config.assetTradeInfo.fabric.hostname}:7054`,
      caName: "ca-org1",
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/fabric-ca/org1/tls-cert.pem",
          "ascii",
        ),
      },
      httpOptions: { verify: false },
    },
  },
  orderers: {
    "orderer.example.com": {
      url: `grpcs://${config.assetTradeInfo.fabric.hostname}:7050`,
      grpcOptions: { "ssl-target-name-override": "orderer.example.com" },
      tlsCACerts: {
        pem: fs.readFileSync(
          "/etc/cactus/connector-fabric/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
          "ascii",
        ),
      },
    },
  },
  channels: {
    mychannel: {
      orderers: ["orderer.example.com"],
      peers: {
        "peer0.org1.example.com": {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
          discover: true,
        },
      },
    },
  },
};
logger.debug("Use connection profile:", connectionProfile);

/**
 * Export all users in wallet into Map that can be used by keychain plugin.
 */
async function exportWalletToKeychain() {
  const wallet = await Wallets.newFileSystemWallet(
    "/etc/cactus/connector-fabric/wallet",
  ); // TODO - from var

  const userList = await wallet.list();
  const keychainMap = new Map();

  for (const user of userList) {
    const walletEntry = await wallet.get(user);
    if (walletEntry && walletEntry.type === "X.509") {
      keychainMap.set(user, JSON.stringify(walletEntry));
    } else {
      logger.error(
        `Could not add identiy for user ${user}. Wallet identity: ${walletEntry}`,
      );
    }
  }

  return keychainMap;
}

/**
 * Create new fabric connector instance
 */
async function createFabricConnector() {
  if (fabricConnectorPlugin) {
    fabricConnectorPlugin.shutdown();
    fabricConnectorPlugin = undefined;
  }

  // Create Keychain Plugin
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    logLevel: config.logLevel,
    backend: await exportWalletToKeychain(),
  });

  fabricConnectorPlugin = new PluginLedgerConnectorFabric({
    instanceId: "cactus-example-discounted-asset-trade",
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    sshConfig: {}, // Provide SSH config to deploy contracts through connector
    cliContainerEnv: {},
    peerBinary: "/fabric-samples/bin/peer",
    logLevel: config.logLevel,
    connectionProfile,
    discoveryOptions: {
      enabled: false,
      asLocalhost: false,
    },
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAnyfortx,
      commitTimeout: 300,
    },
  });

  await fabricConnectorPlugin.onPluginInit();

  // Run http server
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const connectorServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server: connectorServer,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  // Run socketio server
  const socketioServer = new SocketIoServer(connectorServer, {
    path: Constants.SocketIoConnectionPathV1,
  });

  // Register services
  await fabricConnectorPlugin.getOrCreateWebServices();
  await fabricConnectorPlugin.registerWebServices(expressApp, socketioServer);

  // Create ApiClient
  const apiConfig = new Configuration({ basePath: apiHost });
  fabricApiClient = new FabricApiClient(apiConfig);
}

type GatewayOptions = {
  identity: string;
  wallet: {
    keychain: {
      keychainId: string;
      keychainRef: string;
    };
  };
};

/**
 * Get gateway options that can be used for sending requests by connector.
 */
export function getGatewayOptionForUser(name: string): GatewayOptions {
  const signingCredential = {
    keychainId,
    keychainRef: name,
  };

  return {
    identity: signingCredential.keychainRef,
    wallet: {
      keychain: signingCredential,
    },
  };
}

/**
 * Get first block data (number 0). Can be used to test fabric connection.
 */
async function getFirstBlock() {
  if (!fabricConnectorPlugin) {
    throw new Error("getFirstBlock() called before initFabricConnector()!");
  }

  const block = await fabricConnectorPlugin.getBlock({
    channelName: "mychannel",
    gatewayOptions: getGatewayOptionForUser("admin"),
    query: {
      blockNumber: "0",
    },
    skipDecode: false,
  });

  return block as GetBlockResponseDecodedV1;
}

/**
 * Create fabric connector and check if connection can be established
 */
export async function initFabricConnector(): Promise<void> {
  if (!fabricConnectorPlugin) {
    await createFabricConnector();

    const firstBlock = await getFirstBlock();
    const firstBlockNumber = firstBlock.decodedBlock.header.number;
    if (
      !firstBlockNumber ||
      firstBlockNumber.low !== 0 ||
      firstBlockNumber.high !== 0
    ) {
      throw new Error(
        `Invalid block number of the first block: ${firstBlockNumber}`,
      );
    }

    logger.info("initFabricConnector() done.");
  } else {
    logger.info("initFabricConnector() Fabric connector already initialized");
  }
}

/**
 * Get instance of fabric connector, initialize it if not done yet.
 */
export async function getFabricConnector(): Promise<
  PluginLedgerConnectorFabric
> {
  if (!fabricConnectorPlugin) {
    await initFabricConnector();
  }

  if (fabricConnectorPlugin) {
    return fabricConnectorPlugin;
  } else {
    throw new Error("Could not initialize new fabric connector!");
  }
}

/**
 * Get instance of fabric api client.
 */
export function getFabricApiClient(): FabricApiClient {
  if (fabricApiClient) {
    return fabricApiClient;
  } else {
    throw new Error("Fabric connector not initialized yet!");
  }
}
