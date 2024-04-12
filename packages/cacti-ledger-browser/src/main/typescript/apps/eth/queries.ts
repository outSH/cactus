import { queryOptions } from "@tanstack/react-query";
import {
  supabase,
  supabaseQueryKey,
  supabaseQueryTable,
  supabaseQuerySingleMatchingEntry,
  supabaseQueryAllMatchingEntries,
} from "../../common/supabase-client";
import { Transaction, Block, TokenTransfer } from "../../common/supabase-types";

export function ethereumAllTransactionsQuery() {
  return supabaseQueryTable<Transaction>("transaction");
}

export function ethereumAllBlocksQuery() {
  return supabaseQueryTable<Block>("block");
}

export function ethereumBlockByNumber(blockNumber: number | string) {
  return supabaseQuerySingleMatchingEntry<Block>(
    "block",
    { number: blockNumber },
    Infinity,
  );
}

export function ethereumTxById(txId: number | string) {
  return supabaseQuerySingleMatchingEntry<Transaction>(
    "transaction",
    { id: txId },
    Infinity,
  );
}

export function ethereumTokenTransfersByTxId(txId: number | string) {
  return supabaseQueryAllMatchingEntries<TokenTransfer[]>(
    "token_transfer",
    { transaction_id: txId },
    Infinity,
  );
}
