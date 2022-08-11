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
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import { v4 as uuidv4 } from "uuid";
import http from "http";
import bodyParser from "body-parser";

import "jest-extended";
import {
  Iroha2BaseConfig,
  IrohaInstruction,
  IrohaQuery,
  KeychainReference,
  PluginLedgerConnectorIroha2,
  DefaultApi as Iroha2Api,
  Iroha2KeyPair,
} from "../../../main/typescript";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";

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
  let iroha2ConnectorPlugin: PluginLedgerConnectorIroha2;
  let clientConfig: Iroha2ClientConfig;
  let keyPairCredential: Iroha2KeyPair;
  let keychainCredentials: KeychainReference;
  let defaultBaseConfig: Iroha2BaseConfig;
  let apiClient: Iroha2Api;

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

    iroha2ConnectorPlugin = new PluginLedgerConnectorIroha2({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      logLevel: sutLogLevel,
    });

    keychainCredentials = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

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

    // Register services
    await iroha2ConnectorPlugin.getOrCreateWebServices();
    await iroha2ConnectorPlugin.registerWebServices(expressApp);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new Iroha2Api(apiConfig);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    // if (ledger) {
    //   log.info("Stop the fabric ledger...");
    //   await ledger.stop();
    //   await ledger.destroy();
    // }

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
      const domainName = "singleTxTest";

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.CreateDomain,
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
      const domainName = "keychainSignatoryDomain";

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.CreateDomain,
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
      const domainName = "keypairSignatoryDomain";

      // Create new domain
      const transactionResponse = await apiClient.transactV1({
        instruction: {
          name: IrohaInstruction.CreateDomain,
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
      const firstDomainName = "multiTxFirstDomain";
      const secondDomainName = "multiTxSecondDomain";
      const transactionResponse = await apiClient.transactV1({
        instruction: [
          {
            name: IrohaInstruction.CreateDomain,
            params: [firstDomainName],
          },
          {
            name: IrohaInstruction.CreateDomain,
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
            name: IrohaInstruction.CreateDomain,
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
            name: IrohaInstruction.CreateDomain,
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
});
