/**
 * Sample persistence plugin environment setup that can be used to manually test the plugin.
 */

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  LoggerProvider,
  Logger,
  Servers,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  GethTestLedger,
  WHALE_ACCOUNT_PRIVATE_KEY,
} from "@hyperledger/cactus-test-geth-ledger";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  EthereumApiClient,
  PluginLedgerConnectorEthereum,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

import process, { exit } from "process";
import http from "http";
import { AddressInfo } from "net";
import express from "express";
import bodyParser from "body-parser";
import { Server as SocketIoServer } from "socket.io";
import { v4 as uuidV4 } from "uuid";
import Web3, { ContractAbi, TransactionReceipt } from "web3";
import { Web3Account } from "web3-eth-accounts";

import TestERC721ContractJson from "../../solidity/TestERC721.json";
import { PluginPersistenceEthereum } from "../../../main/typescript/plugin-persistence-ethereum";

//////////////////////////////////
// Constants
//////////////////////////////////

const SUPABASE_CONNECTION_STRING = process.env.SUPABASE_CONNECTION_STRING ?? "";

if (!SUPABASE_CONNECTION_STRING) {
  console.error(
    "Please set SUPABASE_CONNECTION_STRING environment variable before running this script",
  );
  exit(1);
}

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

// Geth environment
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "sample-persistence-plugin-setup",
  level: testLogLevel,
});

let ledger: GethTestLedger;
let web3: Web3;
let constTestAcc: Web3Account;
let defaultAccountAddress: string;
const constTestAccBalance = 2 * 10e18;
let persistence: PluginPersistenceEthereum;

//////////////////////////////////
// Environment Setup
//////////////////////////////////

/**
 * Replace bigint to print web3js outputs in test.
 */
function stringifyBigIntReplacer(
  _key: string,
  value: bigint | unknown,
): string | unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

const expressAppConnector = express();
expressAppConnector.use(bodyParser.json({ limit: "250mb" }));
expressAppConnector.set("json replacer", stringifyBigIntReplacer);
const connectorServer = http.createServer(expressAppConnector);
const connectorWsApi = new SocketIoServer(connectorServer, {
  path: Constants.SocketIoConnectionPathV1,
});
let connector: PluginLedgerConnectorEthereum;

async function setupEnvironment() {
  log.info("Prune Docker...");
  await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

  // Create test ledger
  log.info(`Start Ledger ${containerImageName}:${containerImageVersion}...`);
  ledger = new GethTestLedger({
    containerImageName,
    containerImageVersion,
  });
  await ledger.start();
  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
  const rpcApiWsHost = await ledger.getRpcApiWebSocketHost();
  log.info(`Ledger started, RPC: ${rpcApiHttpHost} WS: ${rpcApiWsHost}`);

  // Create Test Account
  constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

  // Create Web3 provider for testing
  web3 = new Web3(rpcApiHttpHost);
  const account = web3.eth.accounts.privateKeyToAccount(
    "0x" + WHALE_ACCOUNT_PRIVATE_KEY,
  );
  web3.eth.accounts.wallet.add(constTestAcc);
  web3.eth.accounts.wallet.add(account);
  defaultAccountAddress = account.address;

  const addressInfo = (await Servers.listen({
    hostname: "127.0.0.1",
    port: 0,
    server: connectorServer,
  })) as AddressInfo;
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidV4(),
    keychainId: uuidV4(),
    backend: new Map([]),
    logLevel: testLogLevel,
  });
  connector = new PluginLedgerConnectorEthereum({
    instanceId: uuidV4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel: sutLogLevel,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressAppConnector, connectorWsApi);

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new EthereumApiClient(apiConfig);

  // Create Ethereum persistence plugin
  persistence = new PluginPersistenceEthereum({
    apiClient,
    logLevel: sutLogLevel,
    instanceId: uuidV4(),
    connectionString: SUPABASE_CONNECTION_STRING,
  });
}

async function cleanupEnvironment() {
  log.info("FINISHING THE TESTS");

  if (persistence) {
    log.info("Stop persistence plugin...");
    await persistence.shutdown();
  }

  if (connectorServer) {
    log.info("Stop connector http servers...");
    await Servers.shutdown(connectorServer);
  }

  if (connector) {
    log.info("Stop the connector...");
    await connector.shutdown();
  }

  if (ledger) {
    log.info("Stop ethereum ledger...");
    await ledger.stop();
    await ledger.destroy();
  }

  log.info("Prune Docker...");
  await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
}

let erc721ContractCreationReceipt: Required<TransactionReceipt>;

async function deploySmartContract(
  abi: ContractAbi,
  bytecode: string,
  args?: unknown[],
): Promise<Required<TransactionReceipt>> {
  try {
    const txReceipt = await ledger.deployContract(abi, "0x" + bytecode, args);
    log.debug("deploySmartContract txReceipt:", txReceipt);
    log.debug(
      "Deployed test smart contract, TX on block number",
      txReceipt.blockNumber,
    );
    // Force response without optional fields
    return txReceipt as Required<TransactionReceipt>;
  } catch (error) {
    log.error("deploySmartContract ERROR", error);
    throw error;
  }
}

async function mintErc721Token(
  targetAddress: string,
  tokenId: number,
): Promise<unknown> {
  try {
    log.info(
      `Mint ERC721 token ID ${tokenId} for address ${targetAddress} by ${defaultAccountAddress}`,
    );

    const tokenContract = new web3.eth.Contract(
      TestERC721ContractJson.abi,
      erc721ContractCreationReceipt.contractAddress,
    );

    const mintResponse = await (tokenContract.methods as any)
      .safeMint(targetAddress, tokenId)
      .send({
        from: defaultAccountAddress,
        gas: 8000000,
      });
    log.debug("mintErc721Token mintResponse:", mintResponse);

    return mintResponse;
  } catch (error) {
    log.error("mintErc721Token ERROR", error);
    throw error;
  }
}

async function logic() {
  const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
  erc721ContractCreationReceipt = await deploySmartContract(
    TestERC721ContractJson.abi,
    erc721Bytecode,
  );
  log.info(
    "ERC721 deployed contract address:",
    erc721ContractCreationReceipt.contractAddress,
  );

  await mintErc721Token(constTestAcc.address, 1);
  await mintErc721Token(constTestAcc.address, 2);
  await mintErc721Token(constTestAcc.address, 3);
}

async function main() {
  await setupEnvironment();
  console.log("Environment is running...");

  // Put custom logic here
  // Or run some tests that will reuse this ledger
  await logic();

  await persistence.onPluginInit();
  await persistence.addTokenERC721(
    erc721ContractCreationReceipt.contractAddress,
  );
  persistence.startMonitor((err) => {
    console.error("Persistence monitor error:", err);
  });
  console.log("Persistence monitoring started...");
}

process.on("exit", cleanupEnvironment);
process.on("SIGINT", cleanupEnvironment);
process.on("SIGTERM", cleanupEnvironment);

main();
