import Long from "long";

import {
  LoggerProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import { WatchBlocksCactusTransactionsEventV1 } from "../generated/openapi/typescript-axios";

const level = "INFO";
const label = "cacti-block-formatters";
const log = LoggerProvider.getOrCreate({ level, label });

function longToNumber(longNumberObject: any) {
  const longValue = new Long(
    longNumberObject.low,
    longNumberObject.hight,
    longNumberObject.unsigned,
  );
  return longValue.toNumber();
}

export function formatCactiFullBlockResponse(blockEvent: any) {
  const blockData = blockEvent.data?.data as any;
  if (!blockData) {
    log.debug("Block data empty - ignore...");
    return;
  }

  const transactions: any[] = [];
  for (const data of blockData) {
    try {
      const payload = data.payload;
      const channelHeader = payload.header.channel_header;
      const transaction = payload.data;

      const transactionActions: any[] = [];
      for (const action of transaction.actions) {
        const actionPayload = action.payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";

        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;
        const channelHeader = payload.header.channel_header;
        const transactionId = channelHeader.tx_id;

        const endorsements = actionPayload.action.endorsements.map((e: any) => {
          return {
            mspid: e.endorser.mspid,
            signature: "0x" + Buffer.from(e.signature).toString("hex"),
          };
        });

        transactionActions.push({
          chaincodeId,
          transactionId,
          functionName,
          functionArgs: decodedArgs,
          endorsements,
        });
      }

      transactions.push({
        hash: channelHeader.tx_id,
        channelId: channelHeader.channel_id,
        timestamp: channelHeader.timestamp,
        protocolVersion: channelHeader.version,
        type: channelHeader.typeString,
        epoch: longToNumber(channelHeader.epoch),
        actions: transactionActions,
      });
    } catch (error) {
      log.warn(
        "Could not retrieve transaction from received block. Error:",
        safeStringifyException(error),
      );
    }
  }

  return {
    blockNumber: longToNumber(blockEvent.header?.number),
    blockHash:
      "0x" + Buffer.from(blockEvent.header?.data_hash as any).toString("hex"),
    previousBlockHash:
      "0x" +
      Buffer.from(blockEvent.header?.previous_hash as any).toString("hex"),
    transactionCount: blockEvent.data?.data?.length ?? 0,
    cactusTransactionsEvents: transactions,
  };
}

export function formatCactiTransactionsBlockResponse(blockEvent: any) {
  const blockData = blockEvent.data?.data as any;
  if (!blockData) {
    log.debug("Block data empty - ignore...");
    return {
      cactusTransactionsEvents: [],
    };
  }

  const transactions: WatchBlocksCactusTransactionsEventV1[] = [];
  for (const data of blockData) {
    try {
      const payload = data.payload;
      const transaction = payload.data;
      for (const action of transaction.actions) {
        const actionPayload = action.payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";

        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;
        const channelHeader = payload.header.channel_header;
        const transactionId = channelHeader.tx_id;

        transactions.push({
          chaincodeId,
          transactionId,
          functionName,
          functionArgs: decodedArgs,
        });
      }
    } catch (error) {
      log.warn(
        "Could not retrieve transaction from received block. Error:",
        safeStringifyException(error),
      );
    }
  }

  return {
    cactusTransactionsEvents: transactions,
  };
}
