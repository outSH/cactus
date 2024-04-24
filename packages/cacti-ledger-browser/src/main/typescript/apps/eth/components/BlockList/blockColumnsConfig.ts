type ColumnConfigEntry = {
  name: string;
  field: string;
  isHash?: boolean;
};

/**
 * Component user can select columns to be rendered in a table list.
 * Possible fields and their configurations are defined in here.
 */
export const blockColumnsConfig = {
  hash: {
    name: "Hash",
    field: "hash",
    isHash: true,
  } as ColumnConfigEntry,
  number: {
    name: "Number",
    field: "number",
  } as ColumnConfigEntry,
  createdAt: {
    name: "Created At",
    field: "created_at",
  } as ColumnConfigEntry,
  txCount: {
    name: "Transaction Count",
    field: "number_of_tx",
  } as ColumnConfigEntry,
};
