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

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-functional.test",
  level: testLogLevel,
});

describe("Ethereum persistence plugin tests", () => {
  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("TODO: Setup test");
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");
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
