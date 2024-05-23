/**
 * Functional test of basic operations on fabric persistence plugin (packages/cactus-plugin-persistence-fabric).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60 * 3; // 3 minutes timeout for setup
const testTimeout = 1000 * 60 * 5; // 5 minutes timeout for some async tests

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-functional.test",
  level: testLogLevel,
});

describe("Ethereum persistence plugin tests", () => {
  let ledger: FabricTestLedgerV1;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug("Fabric Version:", FABRIC_25_LTS_AIO_FABRIC_VERSION);
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Sample test
   */
  test("Sample test", async () => {
    expect(true).toBeTruthy();
  });
});
