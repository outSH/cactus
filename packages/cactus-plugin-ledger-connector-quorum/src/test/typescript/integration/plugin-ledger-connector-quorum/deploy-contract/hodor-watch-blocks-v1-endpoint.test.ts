//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "debug";
const sutLogLevel = "debug";

// const containerImageName = "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
// const containerImageVersion = "2021-08-24--feat-1244";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorQuorum,
  QuorumApiClient,
  QuorumApiClientOptions,
  WatchBlocksV1Progress,
} from "../../../../../main/typescript/index";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
// import {
//   BesuTestLedger,
//   pruneDockerAllIfGithubAction,
// } from "@hyperledger/cactus-test-tooling";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import Web3 from "web3";
import { Constants } from "@hyperledger/cactus-core-api";
import express from "express";
import http from "http";
import { AddressInfo } from "net";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "quorum-monitor.test",
  level: testLogLevel,
});
log.info("Test started");

describe("Quorum Monitoring", () => {
  let server: http.Server;
  let connector: PluginLedgerConnectorQuorum;
  let apiClient: QuorumApiClient;
  // let sourceEthAccountPubKey: string;
  // let sourceEthAccountPrivKey: { privateKey: string };
  // let targetEthAccount: Account;
  const sourceEthAccountPubKey = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  const sourceEthAccountPrivKey = {
    privateKey:
      "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
  };
  const targetEthAccount = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";

  const rpcApiHttpHost = "http://localhost:8545";
  const rpcApiWsHost = "ws://localhost:8546";
  const web3 = new Web3(rpcApiHttpHost);

  async function logBalances() {
    // GET ACCOUNT A BALANCE
    const accountABalance = web3.utils.fromWei(
      await web3.eth.getBalance(sourceEthAccountPubKey),
    );
    log.info("Source has balance of: " + accountABalance);

    // GET ACCOUNT B BALANCE
    const accountBBalance = web3.utils.fromWei(
      await web3.eth.getBalance(targetEthAccount),
    );
    log.info("Target has balance of: " + accountBBalance);
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    // log.info("Prune Docker...");
    // await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // log.info("Start BesuTestLedger...");
    // log.debug("Besu image:", containerImageName);
    // log.debug("Besu version:", containerImageVersion);
    // besuTestLedger = new BesuTestLedger({
    //   containerImageName,
    //   containerImageVersion,
    // });
    // await besuTestLedger.start();

    // const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    // const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    // NOTE - RUN QUORUM MULTI PARTY MANUALLY
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);
    log.debug("rpcApiWsHost:", rpcApiWsHost);

    // Source account - genesis account
    // sourceEthAccountPubKey = besuTestLedger.getGenesisAccountPubKey();
    // sourceEthAccountPrivKey = {
    //   privateKey: besuTestLedger.getGenesisAccountPrivKey(),
    // };

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

    log.info("Create QuorumApiClientOptions...");
    apiClient = new QuorumApiClient({
      basePath: apiHost,
      logLevel: sutLogLevel,
    } as any);

    log.info(">>> BALANCES BEFORE");
    await logBalances();
  });

  afterAll(async () => {
    await connector.shutdown();
    log.info("Shutdown the server...");
    if (server) {
      await Servers.shutdown(server);
    }
    log.info("Stop and destroy the test ledger...");
    // await besuTestLedger.stop();
    // await besuTestLedger.destroy();
    // log.info("Prune docker...");
    // await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info(">>> BALANCES AFTER");
    await logBalances();
  });

  async function sendTransactionOnBesuLedger() {
    log.info("sendTransactionOnBesuLedger() called");

    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: sourceEthAccountPubKey,
        to: targetEthAccount,
        value: 88888,
        gas: 1000000,
      },
      sourceEthAccountPrivKey.privateKey,
    );

    log.info("rawTransaction:", rawTransaction);

    await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        rawTransaction,
      },
    } as any);
  }

  // test("Sanity send transaction works", async () => {
  //   await sendTransactionOnBesuLedger();
  //   expect(1).toBe(1);
  // });

  // test("Sanity check that QuorumApiClient watchBlocksV1 works", async () => {
  //   const newBlock = new Promise<WatchBlocksV1Progress>((resolve, reject) => {
  //     log.info("Call watchBlocksV1()...");

  //     const subscription = apiClient
  //       .watchBlocksV1()
  //       .subscribe((res: WatchBlocksV1Progress) => {
  //         log.debug("Received block number", res.blockHeader.number);
  //         if (!res.blockHeader) {
  //           reject("Empty block received");
  //         }
  //         subscription.unsubscribe();
  //         resolve(res);
  //       });
  //   });

  //   await sendTransactionOnBesuLedger();
  //   return expect(newBlock).toResolve();
  // });

  test("web3Eth test", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [sourceEthAccountPubKey] };

    apiClient.sendAsyncRequest(contract, method, args);

    const results = await apiClient.sendSyncRequest(contract, method, args);
    expect(results.data > 100);
  });
});
