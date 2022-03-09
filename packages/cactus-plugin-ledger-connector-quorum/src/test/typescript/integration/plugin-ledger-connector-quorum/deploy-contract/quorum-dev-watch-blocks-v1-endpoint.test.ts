// HOW-TO
// Run manually quorum-dev-quickstart on your environment - https://github.com/ConsenSys/quorum-dev-quickstart
// npm run start -- --clientType goquorum --outputPath ./ --monitoring default --privacy true --orchestrate false

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
import { Contract } from "web3-eth-contract";

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
  const targetTMKey = "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc";
  const otherEthAccount = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const otherTMKey = "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=";

  const rpcApiHttpHost = "http://localhost:20000";
  const rpcApiWsHost = "ws://localhost:20001";
  const web3 = new Web3(rpcApiHttpHost);

  let privateContract: Contract;

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
    var contractInstance = new web3.eth.Contract(abi as any);
    var deployData = contractInstance
      .deploy({
        data: bytecode,
      })
      .encodeABI();

    var tx = {
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

    const senderAccount = web3.eth.accounts.privateKeyToAccount(
      sourceEthAccountPrivKey.privateKey,
    );
    log.debug(senderAccount.address);
    log.debug(senderAccount.address == sourceEthAccountPubKey);

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

    log.info(">>> DEPLOY PRIVATE CONTRACT");
    privateContract = await createPrivateContract();

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

  test("QuorumApiClient watchBlocksV1 works", async () => {
    const newBlock = new Promise<WatchBlocksV1Progress>((resolve, reject) => {
      log.info("Call watchBlocksV1()...");

      const subscription = apiClient
        .watchBlocksV1()
        .subscribe((res: WatchBlocksV1Progress) => {
          log.debug("Received block number", res.blockHeader.number);
          if (!res.blockHeader) {
            reject("Empty block received");
          }
          subscription.unsubscribe();
          resolve(res);
        });
    });

    await sendTransactionOnBesuLedger();
    return expect(newBlock).toResolve();
  });

  test("web3Eth test", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [sourceEthAccountPubKey] };

    apiClient.sendAsyncRequest(contract, method, args);

    const results = await apiClient.sendSyncRequest(contract, method, args);
    expect(results.data > 100);
  });

  test("web3EthContract manual test", async () => {
    const res = await privateContract.methods
      .retrieve()
      .call({ from: sourceEthAccountPubKey });
    expect(res).toEqual("0");

    const reqAbi = await privateContract.methods.store(125).encodeABI();

    var tx = {
      data: reqAbi,
      from: sourceEthAccountPubKey,
      nonce: await web3.eth.getTransactionCount(sourceEthAccountPubKey),
      to: privateContract.options.address,
      privateFor: [targetTMKey],
      gasLimit: "0x24A222",
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      sourceEthAccountPrivKey.privateKey,
    );

    const sendRes = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction as string,
    );
    log.warn(sendRes);
    log.warn(await web3.eth.getTransaction(sendRes.transactionHash));

    const getAfterRes = await privateContract.methods
      .retrieve()
      .call({ from: targetEthAccount });
    expect(getAfterRes).toEqual("125");

    // should be not visible??
    const web33 = new Web3("http://localhost:20004");
    const anotherContractInstance = new web33.eth.Contract(
      abi as any,
      privateContract.options.address,
    );
    const getAfterResOtherGuy = await anotherContractInstance.methods
      .retrieve()
      .call({ from: otherEthAccount });
    log.warn(getAfterResOtherGuy);
    expect(getAfterResOtherGuy).toEqual("125");
  });

  // test("web3EthContract test", async () => {
  //   //////////////////////////////////////
  //   // 1 - GET INITIAL STATUS

  //   const contract = {
  //     abi: abi,
  //     address: privateContract.options.address,
  //   };
  //   const methodGet = {
  //     type: "web3EthContract",
  //     command: "call",
  //     function: "retrieve",
  //     params: { from: sourceEthAccountPubKey },
  //   };
  //   const argsGet = { args: [] };

  //   const results = await apiClient.sendSyncRequest(
  //     contract,
  //     methodGet,
  //     argsGet,
  //   );
  //   expect(results.status).toEqual(200);
  //   expect(results.data).toEqual("0");

  //   //////////////////////////////////////
  //   // 2 - SEND TRANSACTION

  //   // 2a - encodeABI
  //   const methodStore = {
  //     type: "web3EthContract",
  //     command: "encodeABI",
  //     function: "store",
  //     params: { from: sourceEthAccountPubKey },
  //   };
  //   const argsStore = { args: [777] };

  //   const resultsEncode = await apiClient.sendSyncRequest(
  //     contract,
  //     methodStore,
  //     argsStore,
  //   );
  //   expect(resultsEncode.status).toEqual(200);
  //   expect(resultsEncode.data.length).toBeGreaterThan(5);

  //   // 2b - prepare transaction
  //   const txStore = {
  //     data: resultsEncode.data,
  //     from: sourceEthAccountPubKey,
  //     nonce: await web3.eth.getTransactionCount(sourceEthAccountPubKey),
  //     to: privateContract.options.address,
  //     privateFor: [targetTMKey],
  //     gasLimit: "0x24A222",
  //   };

  //   // 2c - sign transaction
  //   const signedStoreTx = await web3.eth.accounts.signTransaction(
  //     txStore,
  //     sourceEthAccountPrivKey.privateKey,
  //   );

  //   // 2d - send signed transaction
  //   const contractSendSigned = {};
  //   const methodSendSigned = {
  //     type: "web3Eth",
  //     command: "sendSignedTransaction",
  //   };
  //   const argsSendSigned = { args: [signedStoreTx.rawTransaction] };

  //   const resultsSendSigned = await apiClient.sendSyncRequest(
  //     contractSendSigned,
  //     methodSendSigned,
  //     argsSendSigned,
  //   );
  //   expect(resultsSendSigned.status).toEqual(200);
  //   expect(resultsSendSigned.data.status).toBeTrue();

  //   //////////////////////////////////////
  //   // 1 - GET INITIAL STATUS
  //   const resultsGetAfter = await apiClient.sendSyncRequest(
  //     contract,
  //     methodGet,
  //     argsGet,
  //   );
  //   expect(resultsGetAfter.status).toEqual(200);
  //   expect(resultsGetAfter.data).toEqual("777");
  // });
});
