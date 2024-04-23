type TransactionColumnConfigEntry = {
  name: string;
  field: string;
  isHash?: boolean;
};

/**
 * Component user can select columns to be rendered in transaction list.
 * Possible fields and their configurations are defined in transactionColumnsConfig.
 */
export const transactionColumnsConfig = {
  hash: {
    name: "Hash",
    field: "hash",
    isHash: true,
  } as TransactionColumnConfigEntry,
  block: {
    name: "Block",
    field: "block_number",
  } as TransactionColumnConfigEntry,
  from: {
    name: "From",
    field: "from",
    isHash: true,
  } as TransactionColumnConfigEntry,
  to: {
    name: "To",
    field: "to",
    isHash: true,
  } as TransactionColumnConfigEntry,
  value: {
    name: "Value",
    field: "eth_value",
  } as TransactionColumnConfigEntry,
  method: {
    name: "Method",
    field: "method_name",
  } as TransactionColumnConfigEntry,
};
