import { TokenHistoryItem20 } from "../../../../common/supabase-types";

export type BalanceHistoryListData = {
  created_at: string;
  balance: number;
};

export function createBalanceHistoryList(
  txHistory: TokenHistoryItem20[],
  ownerAddress: string,
) {
  if (!txHistory) {
    return [];
  }

  let balance = 0;
  const balances = txHistory.map((txn) => {
    let txn_value = txn.value || 0;
    if (txn.recipient !== ownerAddress) {
      txn_value *= -1;
    }
    balance += txn_value;
    return {
      created_at: txn.created_at + "Z",
      balance: balance,
    };
  });

  return balances as BalanceHistoryListData[];
}
