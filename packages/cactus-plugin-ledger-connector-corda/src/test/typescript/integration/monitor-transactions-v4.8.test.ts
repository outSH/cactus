/**
 * Test low-level state change monitoring interface in Kotlin Corda v4 component.
 */

// Contants: Log Levels
const testLogLevel: LogLevelDesc = "debug";
const sutLogLevel: LogLevelDesc = "info";

// Contants: Test ledger
const ledgerImageName =
  "ghcr.io/hyperledger/cactus-corda-4-8-all-in-one-obligation";
const ledgerImageVersion = "2022-03-31-28f0cbf--1956";
const partyARpcUsername = "user1";
const partyARpcPassword = "password";
const partyBRpcUsername = partyARpcUsername;
const partyBRpcPassword = partyARpcPassword;
const stateToMonitor = "net.corda.samples.example.states.IOUState";
const flowToInvoke = "net.corda.samples.example.flows.ExampleFlow$Initiator";

// Contants: Kotlin connector server
const kotlinServerImageName = "ghcr.io/outsh/cactus-connector-corda-server";
const kotlinServerImageVersion = "corda-dev-1";

import "jest-extended";
import { v4 as internalIpV4 } from "internal-ip";

import {
  CordaTestLedger,
  SampleCordappEnum,
  CordaConnectorContainer,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  CordappDeploymentConfig,
  DeployContractJarsV1Request,
  FlowInvocationType,
  StartMonitorV1Request,
  GetMonitorTransactionsV1Request,
  InvokeContractV1Request,
  JvmTypeKind,
  PublicKey,
  StopMonitorV1Request,
  ClearMonitorTransactionsV1Request,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { CordaApiClient } from "../../../main/typescript/api-client/corda-api-client";
import { Configuration } from "@hyperledger/cactus-core-api";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "kotlin-server-monitor-transactions-v4.8.test",
  level: testLogLevel,
});

//////////////////////////////////
// Helper Functions
//////////////////////////////////

async function deployContract(
  apiClient: CordaApiClient,
  ledger: CordaTestLedger,
  rpcPort: number,
  internalIp: string,
) {
  log.info("deployContract() called...");

  const sshConfig = await ledger.getSshConfig();
  const corDappsDirPartyA = await ledger.getCorDappsDirPartyA();

  const cdcA: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyA,
    cordaNodeStartCmd: "supervisorctl start corda-a",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/",
    rpcCredentials: {
      hostname: internalIp,
      port: rpcPort,
      username: partyARpcUsername,
      password: partyARpcPassword,
    },
    sshCredentials: {
      hostKeyEntry: "foo",
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const partyBRpcPort = await ledger.getRpcBPublicPort();
  const corDappsDirPartyB = await ledger.getCorDappsDirPartyB();

  const cdcB: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyB,
    cordaNodeStartCmd: "supervisorctl start corda-b",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyBRpcPort,
      username: partyBRpcUsername,
      password: partyBRpcPassword,
    },
    sshCredentials: {
      hostKeyEntry: "foo",
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [cdcA, cdcB];
  log.debug("cordappDeploymentConfigs:", cordappDeploymentConfigs);

  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.BASIC_CORDAPP,
  );
  expect(jarFiles).toBeTruthy();

  const deployReq: DeployContractJarsV1Request = {
    jarFiles,
    cordappDeploymentConfigs,
  };
  const deployRes = await apiClient.deployContractJarsV1(deployReq);
  expect(deployRes.data.deployedJarFiles.length).toBeGreaterThan(0);

  const flowsRes = await apiClient.listFlowsV1();
  expect(flowsRes.data.flowNames).toContain(flowToInvoke);
}

async function invokeContract(apiClient: CordaApiClient, publicKey: PublicKey) {
  const req: InvokeContractV1Request = ({
    timeoutMs: 60000,
    flowFullClassName: flowToInvoke,
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.Integer",
        },
        primitiveValue: 42,
      },
      {
        jvmTypeKind: JvmTypeKind.Reference,
        jvmType: {
          fqClassName: "net.corda.core.identity.Party",
        },
        jvmCtorArgs: [
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName: "net.corda.core.identity.CordaX500Name",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "ParticipantB",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "New York",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "US",
              },
            ],
          },
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName:
                "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.algorithm,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.format,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: publicKey?.encoded,
              },
            ],
          },
        ],
      },
    ],
  } as unknown) as InvokeContractV1Request;

  const res = await apiClient.invokeContractV1(req);
  expect(res).toBeTruthy();
  expect(res.status).toBe(200);
  expect(res.data.success).toBeTrue();
}

//////////////////////////////////
// Monitor Tests
//////////////////////////////////

describe("Monitor Tests", () => {
  let ledger: CordaTestLedger;
  let connector: CordaConnectorContainer;
  let apiClient: CordaApiClient;
  let partyBPublicKey: PublicKey;

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    ledger = new CordaTestLedger({
      imageName: ledgerImageName,
      imageVersion: ledgerImageVersion,
      logLevel: testLogLevel,
    });

    const ledgerContainer = await ledger.start();
    expect(ledgerContainer).toBeTruthy();
    log.debug("Corda ledger started...");

    await ledger.logDebugPorts();
    const partyARpcPort = await ledger.getRpcAPublicPort();

    const internalIp = (await internalIpV4()) as string;
    expect(internalIp).toBeTruthy();
    log.info("Internal IP (based on default gateway):", internalIp);

    const springAppConfig = {
      logging: {
        level: {
          root: sutLogLevel,
          "net.corda": sutLogLevel,
          "org.hyperledger.cactus": sutLogLevel,
        },
      },
      cactus: {
        corda: {
          node: { host: internalIp },
          rpc: {
            port: partyARpcPort,
            username: partyARpcUsername,
            password: partyARpcPassword,
          },
        },
      },
    };
    const springApplicationJson = JSON.stringify(springAppConfig);
    const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;
    log.debug(envVarSpringAppJson);

    connector = new CordaConnectorContainer({
      logLevel: sutLogLevel,
      imageName: kotlinServerImageName,
      imageVersion: kotlinServerImageVersion,
      envVars: [envVarSpringAppJson],
    });
    expect(connector).toBeTruthy();

    await connector.start();
    await connector.logDebugPorts();
    const apiUrl = await connector.getApiLocalhostUrl();

    const config = new Configuration({ basePath: apiUrl });
    apiClient = new CordaApiClient(config);
    expect(apiClient).toBeTruthy();

    await deployContract(apiClient, ledger, partyARpcPort, internalIp);

    log.info("Fetching network map for Corda network...");
    const networkMapRes = await apiClient.networkMapV1();
    expect(networkMapRes.data).toBeTruthy();

    const partyB = networkMapRes.data.find((it) =>
      it.legalIdentities.some((li) => li.name.organisation === "ParticipantB"),
    );
    partyBPublicKey = partyB?.legalIdentities[0].owningKey as PublicKey;
    expect(partyBPublicKey).toBeTruthy();
  });

  afterAll(async () => {
    if (ledger) {
      await ledger.stop();
      await ledger.destroy();
    }

    if (connector) {
      await connector.stop();
      await connector.destroy();
    }
  });

  describe("Low-level StartMonitor, StopMonitor tests", () => {
    afterEach(async () => {
      // Stop Monitor
      const reqStopMonitor: StopMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      await apiClient.stopMonitorV1(reqStopMonitor);
    });

    test("New transactions are not reported when monitor not started yet", async () => {
      // Get transactions before sending start monitor - should be 0
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPre = await apiClient.getMonitorTransactionsV1(reqGetTx);
      expect(resGetTxPre.status).toBe(200);
      expect(resGetTxPre.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPre.data.tx.length).toBe(0);
    });

    test("Transactions can be read repeatedly until cleared or monitoring stop", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Get transactions before invoke - should be 0
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPre = await apiClient.getMonitorTransactionsV1(reqGetTx);
      expect(resGetTxPre.status).toBe(200);
      expect(resGetTxPre.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPre.data.tx.length).toBe(0);

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions after invoke
      const resGetTxPost = await apiClient.getMonitorTransactionsV1(reqGetTx);
      expect(resGetTxPost.status).toBe(200);
      expect(resGetTxPost.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPost.data.tx.length).toBe(transactionCount);
      const seenIndexes = new Set<string>();
      resGetTxPost.data.tx.forEach((tx) => {
        expect(tx.index).toBeTruthy();
        // Expect indexes to be unique
        expect(seenIndexes).not.toContain(tx.index);
        seenIndexes.add(tx.index as string);
        expect(tx.data).toBeTruthy();
      });

      // Get transactions after already reading all current ones - should be the same as before
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPost.data.tx.length).toBe(transactionCount);
      resGetTxPost.data.tx.forEach((tx) => {
        expect(tx.index).toBeTruthy();
        expect(seenIndexes).toContain(tx.index);
        expect(tx.data).toBeTruthy();
      });
    });

    test("Received transactions can be cleared so they can't be read anymore", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions after invoke
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPost = await apiClient.getMonitorTransactionsV1(reqGetTx);
      expect(resGetTxPost.status).toBe(200);
      expect(resGetTxPost.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPost.data.tx.length).toBe(transactionCount);

      // Clear seen transactions
      const readTxIdx = resGetTxPost.data.tx.map((tx) => tx.index);
      const reqClearTx: ClearMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
        txIndexes: readTxIdx as string[],
      };
      const resClearTx = await apiClient.clearMonitorTransactionsV1(reqClearTx);
      expect(resClearTx.status).toBe(200);
      expect(resClearTx.data.success).toBeTrue();

      // Get transactions after clear - should be 0
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx.length).toBe(0);
    });

    test("Clearing unknown state transactions should do nothing and return success", async () => {
      const reqClearTx: ClearMonitorTransactionsV1Request = {
        stateFullClassName: "foo.bar.unknown",
        txIndexes: ["999", "998"],
      };
      const resClearTx = await apiClient.clearMonitorTransactionsV1(reqClearTx);
      expect(resClearTx.status).toBe(200);
      expect(resClearTx.data.success).toBeTrue();
    });

    test("No new transactions are reported after stopMonitor", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Stop Monitor
      const reqStopMonitor: StopMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resStopMonitor = await apiClient.stopMonitorV1(reqStopMonitor);
      expect(resStopMonitor.status).toBe(200);
      expect(resStopMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions after invoke and stopMonitor - should be 0
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx.length).toBe(0);
    });

    test("Sending stopMonitor clears transactions not read yet", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Stop Monitor
      const reqStopMonitor: StopMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resStopMonitor = await apiClient.stopMonitorV1(reqStopMonitor);
      expect(resStopMonitor.status).toBe(200);
      expect(resStopMonitor.data.success).toBeTrue();

      // Get transactions after invoke and stopMonitor - should be 0
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx.length).toBe(0);
    });

    test("Sending startMonitor repeatedly doesn't affect monitor results", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke first transactions
      const firstTransactionCount = 3;
      for (let i = 0; i < firstTransactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Start monitor once again
      const resMonitorAgain = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitorAgain.status).toBe(200);
      expect(resMonitorAgain.data.success).toBeTrue();

      // Invoke second transactions
      const secondTransactionCount = 3;
      for (let i = 0; i < secondTransactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get final transactions
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx.length).toEqual(
        firstTransactionCount + secondTransactionCount,
      );
    });

    test("Monitoring restart after previous stop works", async () => {
      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions
      const transactionCount = 3;
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Stop Monitor
      const reqStopMonitor: StopMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resStopMonitor = await apiClient.stopMonitorV1(reqStopMonitor);
      expect(resStopMonitor.status).toBe(200);
      expect(resStopMonitor.data.success).toBeTrue();

      // Get transactions after invoke and stopMonitor - should be 0
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPostRead = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRead.status).toBe(200);
      expect(resGetTxPostRead.data.stateFullClassName).toEqual(stateToMonitor);
      expect(resGetTxPostRead.data.tx.length).toBe(0);

      // Restart Monitor
      const resMonitorRestart = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitorRestart.status).toBe(200);
      expect(resMonitorRestart.data.success).toBeTrue();

      // Invoke transactions after restart
      for (let i = 0; i < transactionCount; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions should return new ones
      const resGetTxPostRestartPostRestart = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRestartPostRestart.status).toBe(200);
      expect(resGetTxPostRestartPostRestart.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxPostRestartPostRestart.data.tx.length).toBe(
        transactionCount,
      );
    });

    test("Monitor returns only transactions after monitor was started, not previous ones", async () => {
      // Invoke initial transactions
      const transactionCountFirst = 5;
      for (let i = 0; i < transactionCountFirst; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Start monitor
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resMonitor = await apiClient.startMonitorV1(reqMonitor);
      expect(resMonitor.status).toBe(200);
      expect(resMonitor.data.success).toBeTrue();

      // Invoke transactions after start
      const transactionCountAfterStart = 2;
      for (let i = 0; i < transactionCountAfterStart; i++) {
        await invokeContract(apiClient, partyBPublicKey);
      }

      // Get transactions
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: stateToMonitor,
      };
      const resGetTxPostRestart = await apiClient.getMonitorTransactionsV1(
        reqGetTx,
      );
      expect(resGetTxPostRestart.status).toBe(200);
      expect(resGetTxPostRestart.data.stateFullClassName).toEqual(
        stateToMonitor,
      );
      expect(resGetTxPostRestart.data.tx.length).toBe(
        transactionCountAfterStart,
      );
    });

    test("Start monitoring with unknown state returns error", async () => {
      const reqMonitor: StartMonitorV1Request = {
        stateFullClassName: "foo.bar.non.existent",
      };
      expect(apiClient.startMonitorV1(reqMonitor)).toReject();
    });

    test("Stop monitoring with unknown state does nothing and returns success", async () => {
      const reqMonitor: StopMonitorV1Request = {
        stateFullClassName: "foo.bar.non.existent",
      };
      const resGet = await apiClient.stopMonitorV1(reqMonitor);
      expect(resGet.status).toBe(200);
      expect(resGet.data.success).toBeTrue();
    });

    test("Reading unknown state transactions returns an empty list", async () => {
      const reqGetTx: GetMonitorTransactionsV1Request = {
        stateFullClassName: "foo.bar.unknown",
      };
      const resGet = await apiClient.getMonitorTransactionsV1(reqGetTx);
      expect(resGet.status).toBe(200);
      expect(resGet.data.stateFullClassName).toEqual("foo.bar.unknown");
      expect(resGet.data.tx.length).toBe(0);
    });
  });

  describe("watchBlocks tests", () => {
    // watchBlocks tests are async, don't wait so long if something goes wrong
    const watchBlockTestTimeout = 60 * 1000;

    test(
      "watchBlocksV1 reports all transactions",
      (done) => {
        const transactionCount = 10;
        let transactionsReceived = 0;

        const seenIndexes = new Set<string>();

        const sub = apiClient
          .watchBlocksV1({
            stateFullClassName: stateToMonitor,
            pollRate: 150,
          })
          .subscribe({
            next(tx) {
              let error: string | undefined;

              log.debug("Received transaction from monitor:", tx);

              if (tx.index === undefined || !tx.data) {
                error = `Wrong transaction format - idx ${tx.index} data ${tx.data}`;
              } else if (seenIndexes.has(tx.index)) {
                error = `Received duplicated transaction with index ${tx.index}`;
              }

              transactionsReceived++;
              seenIndexes.add(tx.index as string);

              if (error) {
                log.error(error);
                sub.unsubscribe();
                done(error);
              }

              if (transactionsReceived === transactionCount) {
                log.info(`Read all ${transactionCount} transactions - OK`);
                sub.unsubscribe();
                done();
              }
            },
            error(err) {
              log.error("watchBlocksV1 failed:", err);
              sub.unsubscribe();
              done(err);
            },
          });

        // Invoke transactions
        for (let i = 0; i < transactionCount; i++) {
          invokeContract(apiClient, partyBPublicKey);
        }
      },
      watchBlockTestTimeout,
    );

    test(
      "Running watchBlocksV1 with unknown state report an error on rxjs subject",
      (done) => {
        const sub = apiClient
          .watchBlocksV1({
            stateFullClassName: "foo.bar.unknown",
          })
          .subscribe({
            next() {
              sub.unsubscribe();
              done("Monitor reported new transaction when it should fail.");
            },
            error(err) {
              log.info("watchBlocksV1 error reported as expected:", err);
              sub.unsubscribe();
              done();
            },
          });
      },
      watchBlockTestTimeout,
    );
  });
});
