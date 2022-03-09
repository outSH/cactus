// HOW-TO
// Run manually quorum-dev-quickstart on your environment - https://github.com/ConsenSys/quorum-dev-quickstart
// npm run start -- --clientType goquorum --outputPath ./ --monitoring default --privacy true --orchestrate false

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "debug";
const sutLogLevel = "debug";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorQuorum,
  WatchBlocksV1Progress,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  Logger,
  LoggerProvider,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import Web3 from "web3";
import {
  Constants,
  IVerifierEventListener,
  LedgerEvent,
} from "@hyperledger/cactus-core-api";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import { Contract } from "web3-eth-contract";

import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "quorum-dev-verifier.test",
  level: testLogLevel,
});
log.info("Test started");

describe("Quorum Monitoring", () => {
  let server: http.Server;
  let connector: PluginLedgerConnectorQuorum;
  const sourceEthAccountPubKey = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  const sourceEthAccountPrivKey = {
    privateKey:
      "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
  };
  const targetTMKey = "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc";

  const rpcApiHttpHost = "http://localhost:20000";
  const rpcApiWsHost = "ws://localhost:20001";
  const web3 = new Web3(rpcApiHttpHost);

  const quorumValidatorId = "testQuorumId";
  const ledgerPluginInfo: VerifierFactoryConfig = [];
  let globalVerifierFactory: VerifierFactory;

  // This is simple storage from samples in remix IDE
  let privateContract: Contract;
  const abi = [
    {
      inputs: [],
      name: "retrieve",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "num",
          type: "uint256",
        },
      ],
      name: "store",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];
  const bytecode =
    "608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220404e37f487a89a932dca5e77faaf6ca2de3b991f93d230604b1b8daaef64766264736f6c63430008070033";

  async function createPrivateContract() {
    const contractInstance = new web3.eth.Contract(abi as any);
    const deployData = contractInstance
      .deploy({
        data: bytecode,
      })
      .encodeABI();

    const tx = {
      data: deployData,
      from: sourceEthAccountPubKey,
      privateFor: [targetTMKey],
      gasLimit: "0x24A22",
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      sourceEthAccountPrivKey.privateKey,
    );

    const deployReceipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction as string,
    );

    return new web3.eth.Contract(abi as any, deployReceipt.contractAddress);
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    // ENSURE QUORUM LEDGER IS RUNNING IN THE BACKGROUND
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);
    log.debug("rpcApiWsHost:", rpcApiWsHost);

    // SETUP QUORUM CONNECTOR
    log.info("Create PluginLedgerConnectorQuorum...");
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map(),
    });

    connector = new PluginLedgerConnectorQuorum({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    log.info("Start HTTP and WS servers...");
    const expressApp = express();
    expressApp.use(express.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });

    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    log.info(
      `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
    );
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    // DEPLOY PRIVATE CONTRACT
    log.info(">>> DEPLOY PRIVATE CONTRACT");
    privateContract = await createPrivateContract();

    // SETUP VERIFIER FACTORY
    ledgerPluginInfo.push({
      validatorID: quorumValidatorId,
      validatorType: "QUORUM_2X",
      basePath: apiHost,
      logLevel: sutLogLevel,
      ledgerInfo: {
        ledgerAbstract: "Quorum-OpenAPI Ledger",
      },
      apiInfo: [],
    });

    globalVerifierFactory = new VerifierFactory(ledgerPluginInfo, sutLogLevel);
  });

  afterAll(async () => {
    log.info("Shutdown the server...");
    await connector.shutdown();
    if (server) {
      await Servers.shutdown(server);
    }
    log.info("Stop and destroy the test ledger...");
  });

  test("verifier test", async () => {
    //////////////////////////////////////
    // 1 - GET INITIAL STATUS

    const contract = {
      abi: abi,
      address: privateContract.options.address,
    };
    const methodGet = {
      type: "web3EthContract",
      command: "call",
      function: "retrieve",
      params: { from: sourceEthAccountPubKey },
    };
    const argsGet = { args: [] };

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, methodGet, argsGet);
    expect(results.status).toEqual(200);
    expect(results.data).toEqual("0");

    //////////////////////////////////////
    // 2 - SEND TRANSACTION

    // 2a - encodeABI
    const methodStore = {
      type: "web3EthContract",
      command: "encodeABI",
      function: "store",
      params: { from: sourceEthAccountPubKey },
    };
    const argsStore = { args: [777] };

    const resultsEncode = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, methodStore, argsStore);
    expect(resultsEncode.status).toEqual(200);
    expect(resultsEncode.data.length).toBeGreaterThan(5);

    // 2b - prepare transaction
    const txStore = {
      data: resultsEncode.data,
      from: sourceEthAccountPubKey,
      nonce: await web3.eth.getTransactionCount(sourceEthAccountPubKey),
      to: privateContract.options.address,
      privateFor: [targetTMKey],
      gasLimit: "0x24A222",
    };

    // 2c - sign transaction
    const signedStoreTx = await web3.eth.accounts.signTransaction(
      txStore,
      sourceEthAccountPrivKey.privateKey,
    );

    // 2d - send signed transaction
    const contractSendSigned = {};
    const methodSendSigned = {
      type: "web3Eth",
      command: "sendSignedTransaction",
    };
    const argsSendSigned = { args: [signedStoreTx.rawTransaction] };

    const resultsSendSigned = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contractSendSigned, methodSendSigned, argsSendSigned);
    expect(resultsSendSigned.status).toEqual(200);
    expect(resultsSendSigned.data.status).toBeTrue();

    //////////////////////////////////////
    // 3 - GET FINAL STATUS
    const resultsGetAfter = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, methodGet, argsGet);
    expect(resultsGetAfter.status).toEqual(200);
    expect(resultsGetAfter.data).toEqual("777");
  });

  test("Monitor QuorumApiClient", () => {
    const newBlock = new Promise<WatchBlocksV1Progress>((resolve, reject) => {
      const appId = "testMonitor";
      const sut = globalVerifierFactory.getVerifier(quorumValidatorId);

      const monitor: IVerifierEventListener<WatchBlocksV1Progress> = {
        onEvent(ledgerEvent: LedgerEvent<WatchBlocksV1Progress>): void {
          try {
            log.info("Received event:", ledgerEvent);

            if (!ledgerEvent.data) {
              throw Error("No block data");
            }
            log.info(
              "Listener received ledgerEvent, block number",
              ledgerEvent.data.blockHeader.number,
            );
            sut.stopMonitor(appId);
            resolve(ledgerEvent.data);
          } catch (err) {
            reject(err);
          }
        },
        onError(err: any): void {
          log.error("Ledger monitoring error:", err);
          reject(err);
        },
      };

      sut.startMonitor(appId, {}, monitor);
    });

    return expect(newBlock).not.toReject();
  });
});
