import { Agent } from "@aries-framework/core";
import inquirer from "inquirer";
import * as log from "loglevel";
import {
  createAliceAgent,
  createNewConnectionInvitation,
  getAgentCredentials,
  waitForConnection,
} from "../public-api";

log.setDefaultLevel("DEBUG");

enum PromptOptions {
  StartTrade = "Start the trade",
  GetCredentials = "Get this agent credentials",
  GetAssets = "Get assets",
  Exit = "Exit",
}

async function connectAgentToBLP(clientAgent: Agent) {
  log.debug("Connecting to the discounted asset trade sample app agent...");

  // Create invitation
  const { outOfBandRecord, invitationUrl } =
    await createNewConnectionInvitation(clientAgent);
  const isConnectedPromise = waitForConnection(clientAgent, outOfBandRecord.id);

  // Send request to the BLP agent
  // TODO - send with HTTP
  log.debug("Invitation link:", invitationUrl);

  // Wait for connection
  await isConnectedPromise;
  log.info("Connected to the discounted asset trade sample app agent!");
}

async function sendTradeRequest() {
  // TODO
  log.info("Trade request sent!");
}

async function printAgentCredentials(agent: Agent) {
  const credentials = await getAgentCredentials(agent);
  log.info(JSON.stringify(credentials, undefined, 2));
}

async function getAssetsFromSampleApp() {
  // TODO
  log.info("Assets: foo");
}

async function getPromptChoice() {
  return inquirer.prompt({
    type: "list",
    prefix: "",
    name: "menu",
    message: "Action:",
    choices: Object.values(PromptOptions),
  });
}

async function menuLoop(agent: Agent) {
  let isRunning = true;

  while (isRunning) {
    try {
      const choice = await getPromptChoice();
      switch (choice.menu) {
        case PromptOptions.StartTrade:
          await sendTradeRequest();
          break;
        case PromptOptions.GetCredentials:
          await printAgentCredentials(agent);
          break;
        case PromptOptions.GetAssets:
          await getAssetsFromSampleApp();
          break;
        case PromptOptions.Exit:
          isRunning = false;
          break;
      }
    } catch (error) {
      if (error.isTtyError) {
        log.error("Prompt couldn't be rendered in the current environment:");
        isRunning = false;
      } else {
        log.error("Menu action error:", error);
      }
    }
  }
}

async function run() {
  const aliceAgent = await createAliceAgent();
  log.debug("Alice (client) agent created");

  try {
    await connectAgentToBLP(aliceAgent);

    log.debug("Running menu loop...");
    await menuLoop(aliceAgent);
  } catch (error) {
    log.error("Client app error:", error);
  } finally {
    log.info("Exiting the client app...");
    aliceAgent.shutdown();
  }
}

run();
