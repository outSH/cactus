/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-fabric.ts
 */

////////
// Usage
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
 */

import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import {
  createSigningToken,
  getFabricConnector,
  getSignerIdentity,
} from "./fabric-connector";
import { FabricContractInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

const moduleName = "TransactionFabric";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export async function transferOwnership(
  assetID: string,
  fabricAccountTo: string,
) {
  const connector = await getFabricConnector();

  const transferResponse = await connector.transactOfflineSign({
    signerCertificate: getSignerIdentity().credentials.certificate,
    signerMspID: getSignerIdentity().mspId,
    channelName: config.assetTradeInfo.fabric.channelName,
    invocationType: FabricContractInvocationType.Send,
    contractName: config.assetTradeInfo.fabric.chaincodeID,
    methodName: "TransferAsset",
    params: [assetID, fabricAccountTo],
    uniqueTransactionData: createSigningToken("transferOwnership"),
  });
  logger.debug("transferResponse:", transferResponse);

  if (!transferResponse.success) {
    throw new Error(`Transfer failed! ${transferResponse.functionOutput}`);
  }

  return transferResponse;
}

export async function queryAsset(assetID: string): Promise<unknown> {
  const connector = await getFabricConnector();

  const queryResponse = await connector.transactOfflineSign({
    signerCertificate: getSignerIdentity().credentials.certificate,
    signerMspID: getSignerIdentity().mspId,
    channelName: config.assetTradeInfo.fabric.channelName,
    invocationType: FabricContractInvocationType.Call,
    contractName: config.assetTradeInfo.fabric.chaincodeID,
    methodName: "ReadAsset",
    params: [assetID],
    uniqueTransactionData: createSigningToken("queryAsset"),
  });
  logger.debug("queryResponse:", queryResponse);

  if (!queryResponse.success) {
    throw new Error(`ReadAsset failed! ${queryResponse.functionOutput}`);
  }

  return JSON.parse(queryResponse.functionOutput);
}

export async function queryAllAssets(): Promise<unknown> {
  const connector = await getFabricConnector();

  const queryResponse = await connector.transactOfflineSign({
    signerCertificate: getSignerIdentity().credentials.certificate,
    signerMspID: getSignerIdentity().mspId,
    channelName: config.assetTradeInfo.fabric.channelName,
    invocationType: FabricContractInvocationType.Call,
    contractName: config.assetTradeInfo.fabric.chaincodeID,
    methodName: "GetAllAssets",
    params: [],
    uniqueTransactionData: createSigningToken("queryAllAssets"),
  });
  logger.debug("queryResponse:", queryResponse);

  if (!queryResponse.success) {
    throw new Error(`ReadAsset failed! ${queryResponse.functionOutput}`);
  }

  return JSON.parse(queryResponse.functionOutput);
}
