import Long from "long";
import { X509Certificate } from "crypto";

import {
  LoggerProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import {
  CactiBlockFullResponseV1,
  CactiBlockTransactionEventV1,
  CactiBlockTransactionsResponseV1,
  FullBlockTransactionActionV1,
  FullBlockTransactionEndorsementV1,
  FullBlockTransactionEventV1,
} from "../generated/openapi/typescript-axios";

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

export function formatCactiFullBlockResponse(
  blockEvent: any,
): CactiBlockFullResponseV1 {
  const blockData = blockEvent.data?.data as any;
  if (!blockData) {
    throw new Error("Empty or invalid block received");
  }

  const transactions: FullBlockTransactionEventV1[] = [];
  for (const data of blockData) {
    try {
      const payload = data.payload;
      const channelHeader = payload.header.channel_header;
      const transaction = payload.data;

      const transactionActions: FullBlockTransactionActionV1[] = [];
      for (const action of transaction.actions) {
        const actionPayload = action.payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";
        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;

        const endorsements: FullBlockTransactionEndorsementV1[] =
          actionPayload.action.endorsements.map((e: any) => {
            const endorserCert = new X509Certificate(e.endorser.id_bytes);

            return {
              mspid: e.endorser.mspid,
              endorserCert: {
                serialNumber: endorserCert.serialNumber,
                subject: endorserCert.subject,
                issuer: endorserCert.issuer,
                subjectAltName: endorserCert.subjectAltName,
                validFrom: endorserCert.validFrom,
                validTo: endorserCert.validTo,
                pem: endorserCert.toString(),
              },
              signature: "0x" + Buffer.from(e.signature).toString("hex"),
            };
          });

        transactionActions.push({
          chaincodeId,
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
    cactiFullEvents: {
      blockNumber: longToNumber(blockEvent.header?.number),
      blockHash:
        "0x" + Buffer.from(blockEvent.header?.data_hash as any).toString("hex"),
      previousBlockHash:
        "0x" +
        Buffer.from(blockEvent.header?.previous_hash as any).toString("hex"),
      transactionCount: blockEvent.data?.data?.length ?? 0,
      cactiTransactionsEvents: transactions,
    },
  };
}

export function formatCactiTransactionsBlockResponse(
  blockEvent: any,
): CactiBlockTransactionsResponseV1 {
  const blockData = blockEvent.data?.data as any;
  if (!blockData) {
    log.debug("Block data empty - ignore...");
    return {
      cactiTransactionsEvents: [],
    };
  }

  const transactions: CactiBlockTransactionEventV1[] = [];
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
    cactiTransactionsEvents: transactions,
  };
}
