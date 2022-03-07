// //////////////////////////////////
// // Constants
// //////////////////////////////////

// const testLogLevel: LogLevelDesc = "info";
// const sutLogLevel: LogLevelDesc = "info";
// // const containerImageName = "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
// // const containerImageVersion = "2021-08-24--feat-1244";

// import "jest-extended";
// import {
//   Logger,
//   LoggerProvider,
//   LogLevelDesc,
//   IListenOptions,
//   Servers,
// } from "@hyperledger/cactus-common";
// import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
// import Web3 from "web3";
// import {
//   IVerifierEventListener,
//   LedgerEvent,
//   VerifierFactory,
//   VerifierFactoryConfig,
// } from "@hyperledger/cactus-verifier-client";

// // Unit Test logger setup
// const log: Logger = LoggerProvider.getOrCreate({
//   label: "verifier-integration-with-legacy-socketio-validators.test",
//   level: testLogLevel,
// });
// log.info("Test started");

// describe("Verifier and VerifierFactory integration with legacy socketio validators tests", () => {
//   const goEthValidatorId = "ethereum_validator_id";

//   //////////////////////////////////
//   // Environment Setup
//   //////////////////////////////////

//   beforeAll(async () => {
//     log.info("Prune Docker...");
//     await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

//     log.info("Start GoEthereumTestLedger...");
//     log.debug("Besu image:", containerImageName);
//     log.debug("Besu version:", containerImageVersion);
//     besuTestLedger = new BesuTestLedger({
//       containerImageName,
//       containerImageVersion,
//     });
//     await besuTestLedger.start();
//   });

//   // afterAll(async () => {
//   //   log.info("Shutdown the server...");
//   //   if (server) {
//   //     await Servers.shutdown(server);
//   //   }
//   //   log.info("Stop and destroy the test ledger...");
//   //   await besuTestLedger.stop();
//   //   await besuTestLedger.destroy();
//   //   log.info("Prune docker...");
//   //   await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
//   // });
// });
