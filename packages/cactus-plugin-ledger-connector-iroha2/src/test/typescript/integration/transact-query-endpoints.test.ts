/**
 * TODO
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const containerImageName = "ghcr.io/outsh/cactus_iroha2_all_in_one";
const containerImageVersion = "0.2";
const useRunningLedger = true;

// Log settings
const testLogLevel: LogLevelDesc = "debug";
const sutLogLevel: LogLevelDesc = "debug";

import {
  Iroha2ClientConfig,
  Iroha2TestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
  Checks,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import { v4 as uuidv4 } from "uuid";
import http from "http";
import bodyParser from "body-parser";
import { Server as SocketIoServer } from "socket.io";
import "jest-extended";

import {
  Iroha2BaseConfig,
  IrohaInstruction,
  IrohaQuery,
  KeychainReference,
  PluginLedgerConnectorIroha2,
  Iroha2KeyPair,
  Iroha2ApiClient,
} from "../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import { AddressInfo } from "net";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { VersionedCommittedBlock } from "@iroha2/data-model";
import { crypto } from "@iroha2/crypto-target-node";
import { setCrypto } from "@iroha2/client";
import { bytesToHex } from "hada";

setCrypto(crypto);

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "transact-query-endpoints.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Iroha V2 connector tests", () => {
  let ledger: Iroha2TestLedger;
  let connectorServer: http.Server;
  let socketioServer: SocketIoServer;
  let iroha2ConnectorPlugin: PluginLedgerConnectorIroha2;
  let clientConfig: Iroha2ClientConfig;
  let keyPairCredential: Iroha2KeyPair;
  let keychainCredentials: KeychainReference;
  let defaultBaseConfig: Iroha2BaseConfig;
  let apiClient: Iroha2ApiClient;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start Iroha2TestLedger...");
    ledger = new Iroha2TestLedger({
      containerImageName,
      containerImageVersion,
      useRunningLedger,
      emitContainerLogs: true,
      logLevel: testLogLevel,
    });
    log.debug("IrohaV2 image:", ledger.fullContainerImageName);
    expect(ledger).toBeTruthy();
    await ledger.start();

    // Get client config
    clientConfig = await ledger.getClientConfig();

    // Get signingCredential
    keyPairCredential = {
      publicKey: clientConfig.PUBLIC_KEY,
      privateKey: {
        digestFunction: clientConfig.PRIVATE_KEY.digest_function,
        payload: clientConfig.PRIVATE_KEY.payload,
      },
    };

    // Create Keychain Plugin
    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "aliceKey";
    const keychainEntryValue = JSON.stringify(keyPairCredential);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    });

    keychainCredentials = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    iroha2ConnectorPlugin = new PluginLedgerConnectorIroha2({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      logLevel: sutLogLevel,
    });

    defaultBaseConfig = {
      torii: {
        apiURL: clientConfig.TORII_API_URL,
        telemetryURL: clientConfig.TORII_TELEMETRY_URL,
      },
      accountId: {
        name: clientConfig.ACCOUNT_ID.name,
        domainId: clientConfig.ACCOUNT_ID.domain_id.name,
      },
      signingCredential: keychainCredentials,
    };

    // Run http server
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    connectorServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: connectorServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;
    log.debug("Iroha V2 connector URL:", apiHost);

    // Run socketio server
    socketioServer = new SocketIoServer(connectorServer, {
      path: Constants.SocketIoConnectionPathV1,
    });

    // Register services
    await iroha2ConnectorPlugin.getOrCreateWebServices();
    await iroha2ConnectorPlugin.registerWebServices(expressApp, socketioServer);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new Iroha2ApiClient(apiConfig);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    // if (ledger) {
    //   log.info("Stop the fabric ledger...");
    //   await ledger.stop();
    //   await ledger.destroy();
    // }

    if (socketioServer) {
      log.info("Stop the SocketIO server connector...");
      await new Promise<void>((resolve) =>
        socketioServer.close(() => resolve()),
      );
    }

    if (connectorServer) {
      log.info("Stop the fabric connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Helpers
  //////////////////////////////////

  // no better way at the moment I'm afraid
  async function waitForCommit() {
    const timeout = 3 * 1000; // 3 seconds
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  function addRandomSuffix(name: string) {
    return name + (Math.random() + 1).toString(36).substring(7);
  }

  test("Adding random suffix to test strings works (addRandomSuffix)", async () => {
    const a = addRandomSuffix("foo");
    expect(a).toBeTruthy();
    const b = addRandomSuffix("foo");
    expect(b).toBeTruthy();
    expect(a).not.toEqual(b);
  });

  function generateTestIrohaCredentials(): Iroha2KeyPair {
    const seedBytes = Buffer.from(addRandomSuffix("seed"));
    const config = crypto
      .createKeyGenConfiguration()
      .useSeed(Uint8Array.from(seedBytes))
      .withAlgorithm(crypto.AlgorithmEd25519());

    const freeableKeys: { free(): void }[] = [];
    try {
      const keyPair = crypto.generateKeyPairWithConfiguration(config);
      freeableKeys.push(keyPair);

      const multiHashPubKey = crypto.createMultihashFromPublicKey(
        keyPair.publicKey(),
      );
      freeableKeys.push(multiHashPubKey);

      return {
        publicKey: bytesToHex(Array.from(multiHashPubKey.toBytes())),
        privateKey: {
          digestFunction: keyPair.privateKey().digestFunction(),
          payload: bytesToHex(Array.from(keyPair.privateKey().payload())),
        },
      };
    } finally {
      freeableKeys.forEach((x) => x.free());
    }
  }

  test("Test key generation works (generateTestIrohaCredentials)", async () => {
    const credentials = generateTestIrohaCredentials();
    expect(credentials).toBeTruthy();
    expect(credentials.publicKey).toBeTruthy();
    expect(credentials.privateKey.payload).toBeTruthy();
    expect(credentials.privateKey.digestFunction).toBeTruthy();
  });

  //////////////////////////////////
  // Basic Endpoint Tests
  //////////////////////////////////

  describe("Setup and basic endpoint tests", () => {
    test("Connector and request config merge works", async () => {
      const defaultConfig = {
        ...defaultBaseConfig,
        signingCredential: keyPairCredential,
      };
      const defaultConfigConnector = new PluginLedgerConnectorIroha2({
        instanceId: uuidv4(),
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        defaultConfig,
      });

      // Default config
      const allDefault = (await defaultConfigConnector.getClient()).options;
      expect(allDefault.torii).toEqual(defaultConfig.torii);

      // Overwrite by request
      const requestConfig: Iroha2BaseConfig = {
        torii: {
          apiURL: "http://example.com",
        },
      };
      const overwrittenConfig = (
        await defaultConfigConnector.getClient(requestConfig)
      ).options;
      expect(overwrittenConfig.torii).toEqual(requestConfig.torii);
    });

    test("Simple transaction and query endpoints works", async () => {
      const domainName = addRandomSuffix("singleTxTest");

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();

      // Query it
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindDomainById,
        baseConfig: defaultBaseConfig,
        params: [domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.id).toBeTruthy();
      expect(queryResponse.data.response.id.name).toEqual(domainName);
    });

    test("Sending transaction with keychain signatory works", async () => {
      const domainName = addRandomSuffix("keychainSignatoryDomain");

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: {
          ...defaultBaseConfig,
          signingCredential: keychainCredentials,
        },
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();

      // Query it
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindDomainById,
        baseConfig: defaultBaseConfig,
        params: [domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.id).toBeTruthy();
      expect(queryResponse.data.response.id.name).toEqual(domainName);
    });

    test("Sending transaction with keypair signatory works", async () => {
      const domainName = addRandomSuffix("keypairSignatoryDomain");

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: {
          ...defaultBaseConfig,
          signingCredential: keyPairCredential,
        },
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();

      // Query it
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindDomainById,
        baseConfig: defaultBaseConfig,
        params: [domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.id).toBeTruthy();
      expect(queryResponse.data.response.id.name).toEqual(domainName);
    });

    test("Multiple instructions in single transaction works", async () => {
      // Create two new domains
      const firstDomainName = addRandomSuffix("multiTxFirstDomain");
      const secondDomainName = addRandomSuffix("multiTxSecondDomain");
      const transactionResponse = await apiClient.transactV1({
        instruction: [
          {
            name: IrohaInstruction.RegisterDomain,
            params: [firstDomainName],
          },
          {
            name: IrohaInstruction.RegisterDomain,
            params: [secondDomainName],
          },
        ],
        baseConfig: defaultBaseConfig,
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();

      // Query domains
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllDomains,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(
        firstDomainName,
      );
      expect(JSON.stringify(queryResponse.data.response)).toContain(
        secondDomainName,
      );
    });

    test("Unknown transaction instruction name reports error", () => {
      // Send invalid command
      return expect(
        apiClient.transactV1({
          instruction: {
            name: "foo" as IrohaInstruction,
            params: [],
          },
          baseConfig: defaultBaseConfig,
        }),
      ).toReject();
    });

    test("Sending transaction with incomplete config reports error", async () => {
      const domainName = "wrongConfigDomain";

      // Use config without account and keypair (only torii)
      await expect(
        apiClient.transactV1({
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
          baseConfig: {
            torii: defaultBaseConfig.torii,
          },
        }),
      ).toReject();

      // Use config without keypair
      await expect(
        apiClient.transactV1({
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
          baseConfig: {
            torii: defaultBaseConfig.torii,
            accountId: defaultBaseConfig.accountId,
          },
        }),
      ).toReject();

      // Assert it was not created
      await expect(
        apiClient.queryV1({
          queryName: IrohaQuery.FindDomainById,
          baseConfig: defaultBaseConfig,
          params: [domainName],
        }),
      ).toReject();
    });

    test("Unknown query name reports error", () => {
      // Send invalid query
      return expect(
        apiClient.queryV1({
          queryName: "foo" as IrohaQuery,
          baseConfig: defaultBaseConfig,
        }),
      ).toReject();
    });
  });

  describe("Block monitoring tests", () => {
    test("watchBlocksV1 reports new blocks in binary (default) format", async () => {
      // Start monitoring
      const monitorPromise = new Promise<void>((resolve, reject) => {
        const watchObservable = apiClient.watchBlocksV1({
          baseConfig: defaultBaseConfig,
        });

        const subscription = watchObservable.subscribe({
          next(event) {
            try {
              log.info("Received block event from the connector");
              if (!("binaryBlock" in event)) {
                throw new Error("Unknown response type, wanted binary data");
              }
              Checks.truthy(event.binaryBlock);
              const decodedBlock = VersionedCommittedBlock.fromBuffer(
                Buffer.from(event.binaryBlock),
              );
              log.debug("decodedBlock:", decodedBlock);
              expect(decodedBlock.as("V1").header).toBeTruthy();
              subscription.unsubscribe();
              resolve();
            } catch (err) {
              log.error("watchBlocksV1() event check error:", err);
              subscription.unsubscribe();
              reject(err);
            }
          },
          error(err) {
            log.error("watchBlocksV1() error:", err);
            subscription.unsubscribe();
            reject(err);
          },
        });
      });

      // Wait for monitor setup just to be sure
      await waitForCommit();

      // Create new domain to trigger new block creation
      const domainName = addRandomSuffix("watchBlocksBin");
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: defaultBaseConfig,
      });
      log.info("Watch block trigger tx sent to create domain", domainName);
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toEqual("OK");

      await expect(monitorPromise).toResolve();
    });
  });

  describe("Domain tests", () => {
    let domainName: string;

    // Create domain common test
    beforeAll(async () => {
      // Generate random domain and assets name
      domainName = addRandomSuffix("funcTestDomain");
      expect(domainName).toBeTruthy();

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();
    });

    test("Query single domain (FindDomainById)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindDomainById,
        baseConfig: defaultBaseConfig,
        params: [domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.id).toBeTruthy();
      expect(queryResponse.data.response.id.name).toEqual(domainName);
    });

    test("Query all domains (FindAllDomains)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllDomains,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(domainName);
    });
  });

  describe("Account tests", () => {
    let newAccountName: string;
    let newAccountDomainName: string;
    let newAccountCredentials: Iroha2KeyPair;

    // Register new account (RegisterAccount)
    beforeAll(async () => {
      newAccountName = addRandomSuffix("fooAcc");
      expect(newAccountName).toBeTruthy();
      newAccountDomainName = addRandomSuffix("newAccDomain");
      expect(newAccountDomainName).toBeTruthy();

      // Create new domain for our new account
      const registerDomainResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [newAccountDomainName],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerDomainResponse).toBeTruthy();
      expect(registerDomainResponse.status).toEqual(200);
      expect(registerDomainResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Generate new account credentials
      newAccountCredentials = generateTestIrohaCredentials();

      // Register new account
      const registerAccountResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterAccount,
          params: [
            newAccountName,
            newAccountDomainName,
            newAccountCredentials.publicKey,
            newAccountCredentials.privateKey.digestFunction,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerAccountResponse).toBeTruthy();
      expect(registerAccountResponse.status).toEqual(200);
      expect(registerAccountResponse.data.status).toEqual("OK");
      await waitForCommit();
    });

    test("Query single account (FindAccountById)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAccountById,
        baseConfig: defaultBaseConfig,
        params: [newAccountName, newAccountDomainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.name).toEqual(newAccountName);
      expect(responseData.id.domain_id.name).toEqual(newAccountDomainName);
      expect(responseData.signatories.length).toBeGreaterThan(0);
      const receivedPubKey = responseData.signatories.pop().payload;
      expect(bytesToHex(Object.values(receivedPubKey))).toEqual(
        newAccountCredentials.publicKey,
      );
    });

    test("Query all accounts (FindAllAccounts)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllAccounts,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(
        newAccountName,
      );
    });
  });

  describe("Asset tests", () => {
    let assetName: string;
    let domainName: string;
    const valueType = "Quantity";
    const value = 42;
    const mintable = "Infinitely";

    // Create asset definition and asset itself common test
    beforeAll(async () => {
      // Generate random domain and assets name
      assetName = addRandomSuffix("testAsset");
      expect(assetName).toBeTruthy();
      domainName = addRandomSuffix("testAssetDomain");
      expect(domainName).toBeTruthy();

      // Create new domain for our new asset
      const registerDomainResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerDomainResponse).toBeTruthy();
      expect(registerDomainResponse.status).toEqual(200);
      expect(registerDomainResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Create new asset definition
      const registerAssetDefResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterAssetDefinition,
          params: [assetName, domainName, valueType, mintable],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerAssetDefResponse).toBeTruthy();
      expect(registerAssetDefResponse.status).toEqual(200);
      expect(registerAssetDefResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Create new asset
      const registerAssetResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterAsset,
          params: [
            assetName,
            domainName,
            defaultBaseConfig.accountId?.name,
            defaultBaseConfig.accountId?.domainId,
            value,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerAssetResponse).toBeTruthy();
      expect(registerAssetResponse.status).toEqual(200);
      expect(registerAssetResponse.data.status).toEqual("OK");
      await waitForCommit();
    });

    test("Query single asset definition (FindAssetDefinitionById)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetDefinitionById,
        baseConfig: defaultBaseConfig,
        params: [assetName, domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.name).toEqual(assetName);
      expect(responseData.id.domain_id.name).toEqual(domainName);
      expect(responseData.value_type.tag).toEqual(valueType);
      expect(responseData.mintable.tag).toEqual(mintable);
    });

    test("Query all asset definitions (FindAllAssetsDefinitions)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllAssetsDefinitions,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(domainName);
    });

    test("Query single asset (FindAssetById)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [
          assetName,
          domainName,
          defaultBaseConfig.accountId?.name,
          defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.definition_id.name).toEqual(assetName);
      expect(responseData.id.definition_id.domain_id.name).toEqual(domainName);
      expect(responseData.id.account_id.name).toEqual(
        defaultBaseConfig.accountId?.name,
      );
      expect(responseData.id.account_id.domain_id.name).toEqual(
        defaultBaseConfig.accountId?.domainId,
      );
      expect(responseData.value.tag).toEqual(valueType);
    });

    test("Query all assets (FindAllAssets)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllAssets,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(assetName);
    });

    test("Mint asset integer value (MintAsset)", async () => {
      const mintValue = 100;

      // Get initial asset value
      const initQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [
          assetName,
          domainName,
          defaultBaseConfig.accountId?.name,
          defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before mint):", initValue);

      // Mint additional asset value
      const mintResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.MintAsset,
          params: [
            assetName,
            domainName,
            defaultBaseConfig.accountId?.name,
            defaultBaseConfig.accountId?.domainId,
            mintValue,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(mintResponse).toBeTruthy();
      expect(mintResponse.status).toEqual(200);
      expect(mintResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value (after mint)
      const finalQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [
          assetName,
          domainName,
          defaultBaseConfig.accountId?.name,
          defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(finalQueryResponse).toBeTruthy();
      expect(finalQueryResponse.data).toBeTruthy();
      const finalValue = finalQueryResponse.data.response.value.value;
      log.info("Final asset value (after mint):", finalValue);

      expect(finalValue).toEqual(initValue + mintValue);
    });

    test("Burn asset integer value (BurnAsset)", async () => {
      const burnValue = 5;

      // Get initial asset value
      const initQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [
          assetName,
          domainName,
          defaultBaseConfig.accountId?.name,
          defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before burn):", initValue);
      expect(burnValue).toBeLessThan(initValue);

      // Burn asset value
      const burnResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.BurnAsset,
          params: [
            assetName,
            domainName,
            defaultBaseConfig.accountId?.name,
            defaultBaseConfig.accountId?.domainId,
            burnValue,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(burnResponse).toBeTruthy();
      expect(burnResponse.status).toEqual(200);
      expect(burnResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value (after burn)
      const finalQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [
          assetName,
          domainName,
          defaultBaseConfig.accountId?.name,
          defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(finalQueryResponse).toBeTruthy();
      expect(finalQueryResponse.data).toBeTruthy();
      const finalValue = finalQueryResponse.data.response.value.value;
      log.info("Final asset value (after burn):", finalValue);

      expect(finalValue).toEqual(initValue - burnValue);
    });

    test("Transfer asset between accounts (TransferAsset)", async () => {
      const transferValue = 3;
      const sourceAccountName = defaultBaseConfig.accountId?.name;
      const sourceAccountDomain = defaultBaseConfig.accountId?.domainId;
      const targetAccountName = addRandomSuffix("transferTargetAcc");
      const targetAccountDomain = sourceAccountDomain;

      // Get initial asset value
      const initQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [assetName, domainName, sourceAccountName, sourceAccountDomain],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before transfer):", initValue);
      expect(transferValue).toBeLessThan(initValue);

      // Register new account to receive the assets
      const accountCredentials = generateTestIrohaCredentials();
      const registerAccountResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.RegisterAccount,
          params: [
            targetAccountName,
            targetAccountDomain,
            accountCredentials.publicKey,
            accountCredentials.privateKey.digestFunction,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(registerAccountResponse).toBeTruthy();
      expect(registerAccountResponse.status).toEqual(200);
      expect(registerAccountResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Transfer asset to the newly created account
      const transferResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.TransferAsset,
          params: [
            assetName,
            domainName,
            sourceAccountName,
            sourceAccountDomain,
            targetAccountName,
            targetAccountDomain,
            transferValue,
          ],
        },
        baseConfig: defaultBaseConfig,
      });
      expect(transferResponse).toBeTruthy();
      expect(transferResponse.status).toEqual(200);
      expect(transferResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value on source account (after transfer)
      const finalSourceQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [assetName, domainName, sourceAccountName, sourceAccountDomain],
      });
      expect(finalSourceQueryResponse).toBeTruthy();
      expect(finalSourceQueryResponse.data).toBeTruthy();
      const finalSrcValue = finalSourceQueryResponse.data.response.value.value;
      log.info(
        "Final asset value on source account (after transfer):",
        finalSrcValue,
      );
      expect(finalSrcValue).toEqual(initValue - transferValue);

      // Get final asset value on target account (after transfer)
      const finalTargetQueryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: defaultBaseConfig,
        params: [assetName, domainName, targetAccountName, targetAccountDomain],
      });
      expect(finalTargetQueryResponse).toBeTruthy();
      expect(finalTargetQueryResponse.data).toBeTruthy();
      const finalTargetValue =
        finalTargetQueryResponse.data.response.value.value;
      log.info(
        "Final asset value on target account (after transfer):",
        finalTargetValue,
      );
      expect(finalTargetValue).toEqual(transferValue);
    });
  });

  describe("Transaction queries tests", () => {
    test("Query all transactions (FindAllTransactions)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllTransactions,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singleTx = queryResponse.data.response.pop().value.value;
      expect(singleTx.signatures).toBeTruthy();
      expect(singleTx.payload).toBeTruthy();
      expect(singleTx.payload.account_id).toBeTruthy();
      expect(singleTx.payload.instructions).toBeTruthy();
    });

    /**
     * @todo Find a way to calculate / retrieve hash of some transaction.
     *       Right now it's hardcoded for manual testing.
     */
    test.skip("Query single transaction (FindAssetById)", async () => {
      const hash =
        "f1076e718309d9b54a9fc74f110b0d16111f7d1c4f9c470f18c56b9309ad873d";

      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindTransactionByHash,
        baseConfig: defaultBaseConfig,
        params: [hash],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response.value.value;
      expect(responseData).toBeTruthy();
      expect(responseData.signatures).toBeTruthy();
      expect(responseData.payload).toBeTruthy();
      expect(responseData.payload.account_id).toBeTruthy();
      expect(responseData.payload.instructions).toBeTruthy();
    });
  });

  describe("Miscellaneous tests", () => {
    test("Query all peers (FindAllPeers)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllPeers,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singlePeer = queryResponse.data.response.pop();
      expect(singlePeer.id).toBeTruthy();
      expect(singlePeer.id.address).toBeTruthy();
      expect(singlePeer.id.public_key).toBeTruthy();
    });

    test("Query all blocks (FindAllBlocks)", async () => {
      const queryResponse = await apiClient.queryV1({
        queryName: IrohaQuery.FindAllBlocks,
        baseConfig: defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singleBlock = queryResponse.data.response.pop();
      expect(singleBlock.header).toBeTruthy();
      expect(singleBlock.transactions).toBeDefined();
      expect(singleBlock.rejected_transactions).toBeDefined();
      expect(singleBlock.event_recommendations).toBeDefined();
    });
  });
});
