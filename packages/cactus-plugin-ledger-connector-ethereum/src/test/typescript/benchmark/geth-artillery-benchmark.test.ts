/*
 * Copyright 2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test script to start ethereum environment and run the artillery stress test on it.
 *
 * IMPORTANT!
 * Must be run from the cactus root dir (to match artillery binary path)!
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "info";
const sutLogLevel = "info";
const artilleryBinPath = "./node_modules/artillery/bin/run";

import "jest-extended";
import { exec } from "child_process";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  BenchmarkEnvironmentConfig,
  cleanupBenchmarkEnvironment,
  getDefaultArtilleryConfigPath,
  setupBenchmarkEnvironment,
} from "./setup/geth-benchmark-env";

const log = LoggerProvider.getOrCreate({
  level: testLogLevel,
  label: "geth-artillery-benchmark.test",
});

describe("Ethereum connector artillery stress test", () => {
  let config: BenchmarkEnvironmentConfig;

  beforeAll(async () => {
    log.info("Setup test environment...");
    config = await setupBenchmarkEnvironment(sutLogLevel);
    expect(config).toBeTruthy();
    expect(config.target).toBeTruthy();
    expect(config.variables).toBeTruthy();
  });

  afterAll(async () => {
    log.info("FINISH THE TEST");
    await cleanupBenchmarkEnvironment();
  });

  /**
   * Note: The variables must be escaped on Windows! Works on Linux / MacOS.
   */
  test("artillery stress test", (done) => {
    const artilleryCommand = `${artilleryBinPath} run ${getDefaultArtilleryConfigPath()} --target ${
      config.target
    } --variables '${JSON.stringify(config.variables)}'`;
    log.info("Command:", artilleryCommand);
    log.info("Running the stress test (please wait)...");

    // Run the command
    exec(artilleryCommand, (error, stdout, stderr) => {
      if (error) {
        log.error("Artillery failed with error:", error);
      }
      log.info("Artillery Output:\n", stdout);
      if (stderr.length > 0) {
        log.warn("Artillery Errors:\n", stderr);
      }
      done(error);
    });
  });
});
