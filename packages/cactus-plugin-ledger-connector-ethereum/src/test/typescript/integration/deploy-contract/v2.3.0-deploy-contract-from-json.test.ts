import Web3 from "web3";
import { Web3Account } from "web3-eth-accounts";
import { v4 as uuidV4 } from "uuid";
import "jest-extended";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";
import HelloWorldWithArgContractJson from "../../../solidity/hello-world-with-arg-contract/HelloWorldWithArg.json";

import { K_CACTUS_ETHEREUM_TOTAL_TX_COUNT } from "../../../../main/typescript/prometheus-exporter/metrics";

import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
} from "../../../../main/typescript/public-api";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { Server as SocketIoServer } from "socket.io";

const testCase = "Ethereum Ledger Connector Plugin";
const BASE_FEE = 0x1ac017b6;

describe(testCase, () => {
  const logLevel: LogLevelDesc = "DEBUG";
  const contractName = "HelloWorld";
  const keychainEntryKey = uuidV4();
  let testEthAccount: Web3Account,
    web3: Web3,
    addressInfo,
    address: string,
    port: number,
    contractAddress: string,
    apiHost,
    apiConfig,
    ledger: GethTestLedger,
    apiClient: EthereumApi,
    connector: PluginLedgerConnectorEthereum,
    rpcApiHttpHost: string,
    keychainPlugin: PluginKeychainMemory;
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    //ledger = new GethTestLedger({ emitContainerLogs: true, logLevel });
    ledger = new GethTestLedger({});
    await ledger.start(true);
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });

  afterAll(async () => await Servers.shutdown(server));

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new EthereumApi(apiConfig);
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create();

    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    keychainPlugin.set(
      HelloWorldWithArgContractJson.contractName,
      JSON.stringify(HelloWorldWithArgContractJson),
    );
    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  test(testCase, async () => {
    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    const initTransferValue = web3.utils.toWei(5000, "ether");
    await connector.transact({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: initTransferValue,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toBe(initTransferValue);
  });

  test("deploys contract via .json file", async () => {
    const deployOut = await connector.deployContract({
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(typeof contractAddress).toBe("string");
    const { callOutput: helloMsg } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: "1000000",
    });
    expect(helloMsg).toBeTruthy();
    expect(typeof helloMsg).toBe("string");
  });

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      nonce: "2",
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: "2",
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const getNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(getNameOut.success).toBeTruthy();

    const { callOutput: getNameOut2 } = await connector.getContractInfoKeychain(
      {
        contractName,
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      },
    );
    expect(getNameOut2).toBe(newName);
  });

  test("invoke Web3SigningCredentialType.NONE", async () => {
    const testEthAccount2 = web3.eth.accounts.create();

    const value = 10e6;

    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: testEthAccount.address,
        to: testEthAccount2.address,
        value,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: BASE_FEE,
        gasLimit: 21000,
      },
      testEthAccount.privateKey,
    );

    await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    expect(balance2).toBeTruthy();
    expect(balance2.toString()).toBe(value.toString());
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: "1",
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: "1",
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut).toBe(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut2).toBeTruthy();
  });

  test("invoke Web3SigningCredentialType.CactusKeychainRef", async () => {
    const newName = `DrCactus${uuidV4()}`;

    const web3SigningCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      gas: "1000000",
      web3SigningCredential,
      nonce: "3",
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: "3",
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential,
    });
    expect(getNameOut).toContain(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential,
    });
    expect(getNameOut2).toBeTruthy();
  });

  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      '"} 5';
    expect(res);
    expect(res.data);
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });

  test("deploys contract via .json file with constructorArgs", async () => {
    const deployOut = await connector.deployContract({
      contractName: HelloWorldWithArgContractJson.contractName,
      contractJSON: HelloWorldWithArgContractJson,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
      constructorArgs: ["Johnny"],
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(contractAddress).toBeString();
  });
});
