/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// @todo - info
const testLogLevel = "debug";
const sutLogLevel = "debug";

// @todo Replace with cactus ghcr when this image will be available
const containerImageName = "ghcr.io/outsh/cactus-quorum-multi-party-all-in-one";
const containerImageVersion = "2022-03-10-b298004";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorQuorum,
  WatchBlocksV1BlockData,
  WatchBlocksV1Progress,
  Web3BlockHeader,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  IVerifierEventListener,
  LedgerEvent,
} from "@hyperledger/cactus-core-api";
import { AddressInfo } from "net";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

import { VerifierFactory } from "@hyperledger/cactus-verifier-client";
import {
  pruneDockerAllIfGithubAction,
  QuorumMultiPartyTestLedger,
} from "@hyperledger/cactus-test-tooling";

import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";

// Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier-integration-with-quorum-connector.test",
  level: testLogLevel,
});

log.info("Test started");

describe("Verifier integration with quorum connector tests", () => {
  let quorumTestLedger: QuorumMultiPartyTestLedger;
  let apiServer: ApiServer;
  let connector: PluginLedgerConnectorQuorum;
  let keychainPlugin: PluginKeychainMemory;
  let connectionProfile: ReturnType<
    typeof QuorumMultiPartyTestLedger.prototype.getKeys
  > extends Promise<infer T>
    ? T
    : never;

  const quorumValidatorId = "testQuorumId";
  let globalVerifierFactory: VerifierFactory;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start QuorumMultiPartyTestLedger...");
    log.debug("QuorumMultiParty image:", containerImageName);
    log.debug("QuorumMultiParty version:", containerImageVersion);
    quorumTestLedger = new QuorumMultiPartyTestLedger({
      containerImageName,
      containerImageVersion,
      logLevel: sutLogLevel,
      emitContainerLogs: false,
    });
    await quorumTestLedger.start();

    connectionProfile = await quorumTestLedger.getKeys();
    log.debug("connectionProfile:", connectionProfile);

    // Setup ApiServer plugins
    const plugins: ICactusPlugin[] = [];
    const pluginRegistry = new PluginRegistry({ plugins });

    log.info("Create PluginKeychainMemory...");
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: sutLogLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    plugins.push(keychainPlugin);

    log.info("Create PluginLedgerConnectorQuorum...");
    connector = new PluginLedgerConnectorQuorum({
      rpcApiHttpHost: connectionProfile.quorum.member1.url,
      rpcApiWsHost: connectionProfile.quorum.member1.wsUrl,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    plugins.push(connector);

    // Create Api Server
    log.info("Create ApiServer...");
    const configService = new ConfigService();
    const cactusApiServerOptions = await configService.newExampleConfig();
    cactusApiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    cactusApiServerOptions.configFile = "";
    cactusApiServerOptions.apiCorsDomainCsv = "*";
    cactusApiServerOptions.apiTlsEnabled = false;
    cactusApiServerOptions.apiPort = 0;
    const config = await configService.newExampleConfigConvict(
      cactusApiServerOptions,
    );

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    // Start ApiServer
    const apiServerStartOut = await apiServer.start();
    log.debug(`apiServerStartOut:`, apiServerStartOut);
    const httpServer = apiServer.getHttpServerApi();

    const addressInfo = httpServer?.address() as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    // Create VerifierFactory
    log.info("Create VerifierFactory with Quorum Validator...");
    globalVerifierFactory = new VerifierFactory(
      [
        {
          validatorID: quorumValidatorId,
          validatorType: "QUORUM_2X",
          basePath: apiHost,
          logLevel: sutLogLevel,
        },
      ],
      sutLogLevel,
    );
  });

  afterAll(async () => {
    log.info("Shutdown the server...");
    if (apiServer) {
      await apiServer.shutdown();
    }

    log.info("Stop and destroy the test ledger...");
    if (quorumTestLedger) {
      await quorumTestLedger.stop();
      await quorumTestLedger.destroy();
    }

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  test("Verifier of QuorumApiClient is created by VerifierFactory", () => {
    const sut = globalVerifierFactory.getVerifier(quorumValidatorId);
    expect(sut.ledgerApi.className).toEqual("QuorumApiClient");
  });

  test("Verifier of QuorumApiClient supports web3EthContract function", async () => {
    // Deploy contract to interact with
    const deployOut = await connector.deployContract({
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: connectionProfile.quorum.member2.accountAddress,
        secret: connectionProfile.quorum.member2.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    expect(deployOut.transactionReceipt.status).toBeTrue();

    // web3EthContract.call
    const contractCommon = {
      abi: HelloWorldContractJson.abi,
      address: deployOut.transactionReceipt.contractAddress,
    };
    const methodCall = {
      type: "web3EthContract",
      command: "call",
      function: "sayHello",
      params: { from: connectionProfile.quorum.member2.accountAddress },
    };
    const argsCall = { args: [] };

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contractCommon, methodCall, argsCall);
    expect(results.status).toEqual(200);
    expect(results.data).toEqual("Hello World!");
    log.error(results);

    // web3EthContract.encodeABI
    const methodEncode = {
      type: "web3EthContract",
      command: "encodeABI",
      function: "setName",
      params: { from: connectionProfile.quorum.member2.accountAddress },
    };
    const argsEncode = { args: ["CactusQuorum"] };

    const resultsEncode = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contractCommon, methodEncode, argsEncode);
    expect(resultsEncode.status).toEqual(200);
    expect(resultsEncode.data.length).toBeGreaterThan(5);
  });

  test("Verifier of QuorumApiClient supports web3Eth function", async () => {
    // web3Eth.getBalance
    const contract = {};
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [connectionProfile.quorum.member2.accountAddress] };

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, method, args);

    expect(results.data.length).toBeGreaterThan(0);
  });

  test("QuorumApiClient web3Eth throws error on unknown method", async () => {
    const contract = {};
    const method = { type: "web3Eth", command: "foo" };
    const args = {};

    const results = await globalVerifierFactory
      .getVerifier(quorumValidatorId)
      .sendSyncRequest(contract, method, args);

    expect(results).toBeTruthy();
    expect(results.status).toEqual(504);
    expect(results.errorDetail).toBeTruthy();
  });

  function monitorAndGetBlock(
    options: Record<string, unknown> = {},
  ): Promise<LedgerEvent<WatchBlocksV1Progress>> {
    return new Promise<LedgerEvent<WatchBlocksV1Progress>>(
      (resolve, reject) => {
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
              resolve(ledgerEvent);
            } catch (err) {
              reject(err);
            }
          },
          onError(err: any): void {
            log.error("Ledger monitoring error:", err);
            reject(err);
          },
        };

        sut.startMonitor(appId, options, monitor);
      },
    );
  }

  test("Monitor new blocks headers on Quorum", async () => {
    const ledgerEvent = await monitorAndGetBlock();
    expect(ledgerEvent.id).toEqual("");
    expect(ledgerEvent.verifierId).toEqual(quorumValidatorId);
    expect(ledgerEvent.data).toBeTruthy();
    // blockData should not be present if called with empty options
    expect(ledgerEvent.data?.blockData).toBeUndefined();
    const blockHeader = ledgerEvent.data?.blockHeader as Web3BlockHeader;
    expect(blockHeader).toBeTruthy();
    expect(blockHeader.number).toBeGreaterThanOrEqual(0);
    expect(blockHeader.hash.length).toBeGreaterThanOrEqual(5);
    expect(blockHeader.parentHash.length).toBeGreaterThanOrEqual(5);
    expect(blockHeader.nonce.length).toBeGreaterThanOrEqual(5);
    expect(blockHeader.miner.length).toBeGreaterThanOrEqual(5);
    expect(blockHeader.gasLimit).toBeGreaterThan(0);
    expect(blockHeader.gasUsed).toBeGreaterThanOrEqual(0);
    expect(blockHeader.timestamp).toBeGreaterThan(0);
  });

  test("Monitor new blocks data on Quorum", async () => {
    const ledgerEvent = await monitorAndGetBlock({ includeBlockData: true });
    expect(ledgerEvent.data).toBeTruthy();
    // both header and data should be present
    expect(ledgerEvent.data?.blockHeader).toBeTruthy();
    const blockData = ledgerEvent.data?.blockData as WatchBlocksV1BlockData;
    expect(blockData).toBeTruthy();
    expect(blockData.size).toBeGreaterThan(0);
    expect(parseInt(blockData.totalDifficulty)).toBeGreaterThanOrEqual(0);
    expect(blockData.uncles).toBeDefined();
    expect(blockData.transactions).toBeDefined();
  });
});
