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

const ledgerData = {
  tessera: {
    member2: {
      publicKey: "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=",
    },
    member1: {
      publicKey: "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=",
    },
    member3: {
      publicKey: "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=",
    },
  },
  quorum: {
    member2: {
      name: "member2",
      url: "http://127.0.0.1:20000",
      wsUrl: "ws://127.0.0.1:20001",
      privateUrl: "http://127.0.0.1:9081",
      privateKey:
        "b9a4bd1539c15bcc83fa9078fe89200b6e9e802ae992f13cd83c853f16e8bed4",
      accountAddress: "f0e2db6c8dc6c681bb5d6ad121a107f300e9b2b5",
    },
    member1: {
      name: "member1",
      url: "http://127.0.0.1:20002",
      wsUrl: "ws://127.0.0.1:20003",
      privateUrl: "http://127.0.0.1:9082",
      privateKey:
        "f18166704e19b895c1e2698ebc82b4e007e6d2933f4b31be23662dd0ec602570",
      accountAddress: "ca843569e3427144cead5e4d5999a3d0ccf92b8e",
    },
    member3: {
      name: "member3",
      url: "http://127.0.0.1:20004",
      wsUrl: "ws://127.0.0.1:20005",
      privateUrl: "http://127.0.0.1:9083",
      privateKey:
        "4107f0b6bf67a3bc679a15fe36f640415cf4da6a4820affaac89c8b280dfd1b3",
      accountAddress: "0fbdc686b912d7722dc86510934589e0aaf3b55a",
    },
  },
};

describe("Quorum Monitoring", () => {
  let server: http.Server;
  let connector: PluginLedgerConnectorQuorum;
  let apiClient: QuorumApiClient;

  const web3 = new Web3(ledgerData.quorum.member1.url);

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
    try {
      var contractInstance = new web3.eth.Contract(abi as any);
      var deployData = contractInstance
        .deploy({
          data: bytecode,
        })
        .encodeABI();

      var tx = {
        data: deployData,
        from: ledgerData.quorum.member1.accountAddress,
        privateFor: [ledgerData.tessera.member3.publicKey],
        gasLimit: "0x24A22",
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        ledgerData.quorum.member1.privateKey,
      );

      const deployReceipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction as string,
      );

      return new web3.eth.Contract(abi as any, deployReceipt.contractAddress);
    } catch (err) {
      log.error(err);
      throw err;
    }
  }

  async function createContract() {
    const contractInstance = new web3.eth.Contract(abi as any);
    const ci = await contractInstance
      .deploy({ data: "0x" + bytecode })
      .send({
        from: ledgerData.quorum.member1.accountAddress,
        privateFor: [ledgerData.tessera.member3.publicKey],
        gasLimit: "0x24A22",
      } as any)
      .on("transactionHash", function (hash) {
        console.log("The transaction hash is: " + hash);
      });
    return ci;
  }

  async function logBalances() {
    // GET ACCOUNT A BALANCE
    const accountABalance = web3.utils.fromWei(
      await web3.eth.getBalance(ledgerData.quorum.member1.accountAddress),
    );
    log.info("Source has balance of: " + accountABalance);

    // GET ACCOUNT B BALANCE
    const accountBBalance = web3.utils.fromWei(
      await web3.eth.getBalance(ledgerData.quorum.member2.accountAddress),
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
    log.debug("rpcApiHttpHost:", ledgerData.quorum.member1.url);
    log.debug("rpcApiWsHost:", ledgerData.quorum.member1.wsUrl);

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
      rpcApiHttpHost: ledgerData.quorum.member1.url,
      rpcApiWsHost: ledgerData.quorum.member1.wsUrl,
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
    try {
      //privateContract = await createPrivateContract();
      privateContract = await createContract();
    } catch (err) {
      log.error(err);
      throw err;
    }

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
    await logBalances();
  });

  async function sendTransactionOnBesuLedger() {
    log.info("sendTransactionOnBesuLedger() called");

    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: ledgerData.quorum.member1.accountAddress,
        to: ledgerData.quorum.member2.accountAddress,
        value: 8,
        gas: 100,
      },
      ledgerData.quorum.member1.privateKey,
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

    //await sendTransactionOnBesuLedger();
    return expect(newBlock).toResolve();
  });

  test("web3Eth test", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [ledgerData.quorum.member1.accountAddress] };

    apiClient.sendAsyncRequest(contract, method, args);

    const results = await apiClient.sendSyncRequest(contract, method, args);
    expect(results.data > 100);
  });

  // async function getValueAtAddress(host:string, nodeName="node", deployedContractAbi: any, deployedContractAddress: any){
  //   const web3 = new Web3(host);
  //   const contractInstance = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);
  //   // contractInstance.defaultCommon.customChain = {name: 'GoQuorum', chainId: 1337};
  //   const res = await contractInstance.methods.get().call().catch(() => {});
  //   log.warn(nodeName + " obtained value at deployed contract is: "+ res);
  //   return res
  // }

  // You need to use the accountAddress details provided to Quorum to send/interact with contracts
  async function setValueAtAddress(
    host: string,
    value: number,
    deployedContractAbi: any,
    deployedContractAddress: any,
    fromAddress: any,
    toPublicKey: any,
  ) {
    const web3 = new Web3(host);
    const contractInstance = new web3.eth.Contract(
      deployedContractAbi,
      deployedContractAddress,
    );
    const res = await contractInstance.methods
      .store(value)
      .send({
        from: fromAddress,
        privateFor: [toPublicKey],
        gasLimit: "0x24A22",
      });
    // verify the updated value
    // const readRes = await contractInstance.methods.get().call();
    // console.log("Obtained value at deployed contract is: "+ readRes);
    log.warn(res);
    return res;
  }

  test("web3EthContract manual test", async () => {
    const res = await privateContract.methods
      .retrieve()
      .call({ from: ledgerData.quorum.member1.accountAddress });
    expect(res).toEqual("0");
    log.error("first: " + res);

    // const reqAbi = await privateContract.methods.store(125).encodeABI();

    // var tx = {
    //   data: reqAbi,
    //   from: ledgerData.quorum.member1.accountAddress,
    //   // nonce: await web3.eth.getTransactionCount(
    //   //   ledgerData.quorum.member1.accountAddress,
    //   // ),
    //   to: privateContract.options.address,
    //   privateFor: [ledgerData.tessera.member3.publicKey],
    //   gasLimit: "0x24A222",
    // };

    // log.debug(tx);

    // const signedTx = await web3.eth.accounts.signTransaction(
    //   tx,
    //   ledgerData.quorum.member1.privateKey,
    // );

    // const sendRes = await web3.eth.sendSignedTransaction(
    //   signedTx.rawTransaction as string,
    // );
    // log.warn(sendRes);
    // log.warn(await web3.eth.getTransaction(sendRes.transactionHash));
    await setValueAtAddress(
      ledgerData.quorum.member1.url,
      125,
      abi,
      privateContract.options.address,
      ledgerData.quorum.member1.accountAddress,
      ledgerData.tessera.member3.publicKey,
    );

    const getAfterRes = await privateContract.methods
      .retrieve()
      .call({ from: ledgerData.quorum.member1.accountAddress });
    expect(getAfterRes).toEqual("125");
    log.error("getAfterRes: " + getAfterRes);

    // should be not visible??
    // const web33 = new Web3(ledgerData.quorum.member2.url);
    // expect(async () => {
    //   const anotherContractInstance = new web33.eth.Contract(
    //     abi as any,
    //     privateContract.options.address,
    //   );
    //   const getAfterResOtherGuy = await anotherContractInstance.methods
    //     .retrieve()
    //     .call({ from: ledgerData.quorum.member2.accountAddress });
    //   log.warn(getAfterResOtherGuy);
    // }).toThrow();

    // expect(getAfterResOtherGuy).toEqual("125");
    // log.error("getAfterResOtherGuy: " + getAfterResOtherGuy);
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
