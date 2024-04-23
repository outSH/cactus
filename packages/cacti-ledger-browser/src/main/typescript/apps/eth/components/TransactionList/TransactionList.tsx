import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import CircularProgress from "@mui/material/CircularProgress";

import { ethereumAllTransactionsQuery } from "../../queries";
import ShortHash from "../../../../components/ui/ShortHash";
import { useNotification } from "../../../../common/context/NotificationContext";
import { Transaction } from "../../../../common/supabase-types";
import {
  TransactionTableCell,
  TransactionTableCellHeader,
  tableCellHeight,
} from "./TransactionTableCell";
import { transactionColumnsConfig } from "./transactionColumnsConfig";

/**
 * List of columns that can be rendered in a transaction list table
 */
export type TransactionListColumn = keyof typeof transactionColumnsConfig;

/**
 * TransactionList footer component interface.
 */
export interface TransactionListFooterComponentProps {
  page: number;
  disableNext: boolean;
  onPageChange: (newPage: number) => void;
  onPageRefresh: () => void;
}

/**
 * TransactionList properties.
 */
export interface TransactionListProps {
  footerComponent: React.ComponentType<TransactionListFooterComponentProps>;
  columns: TransactionListColumn[];
  rowsPerPage: number;
  tableSize?: "small" | "medium";
}

/**
 * TransactionList - Show table with ethereum transactions.
 * Supports paging and error handling. Will show empty entries if number of entries
 * is smaller then requested `rowsPerPage` to keep UI in place.
 *
 * @param footerComponent component will be rendered in a footer of a transaction list table.
 * @param columns list of columns to be rendered.
 * @param rowsPerPage how many rows to show per page.
 */
const TransactionList: React.FC<TransactionListProps> = ({
  footerComponent: FooterComponent,
  columns,
  rowsPerPage,
  tableSize,
}) => {
  const [page, setPage] = React.useState(0);
  const { isError, isPending, data, error, refetch } = useQuery({
    ...ethereumAllTransactionsQuery(page, rowsPerPage),
    placeholderData: keepPreviousData,
  });
  const { showNotification } = useNotification();
  const transactions = data ?? [];

  React.useEffect(() => {
    isError &&
      showNotification(`Could not fetch transactions: ${error}`, "error");
  }, [isError]);

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = Math.max(0, rowsPerPage - transactions.length);

  return (
    <Box position="relative">
      {isPending && (
        <CircularProgress
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}
      <TableContainer component={Paper}>
        <Table
          sx={{ minWidth: 700 }}
          size={tableSize}
          aria-label="ethereum transactions"
        >
          <TableHead>
            <TableRow>
              {columns.map((colName) => {
                return (
                  <TransactionTableCellHeader key={`${colName}-header-cell`}>
                    {transactionColumnsConfig[colName].name}
                  </TransactionTableCellHeader>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((row) => (
              <TableRow key={row.id}>
                {columns.map((colName) => {
                  const config = transactionColumnsConfig[colName];
                  const value = row[config.field as keyof Transaction];
                  return (
                    <TransactionTableCell key={`${row.id}-${colName}`}>
                      {config.isHash ? (
                        <ShortHash hash={value as string} />
                      ) : (
                        value
                      )}
                    </TransactionTableCell>
                  );
                })}
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: tableCellHeight * emptyRows }}>
                <TransactionTableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        <FooterComponent
          page={page}
          onPageChange={(newPage: number) => {
            setPage(newPage);
          }}
          onPageRefresh={() => {
            refetch();
          }}
          disableNext={emptyRows > 0}
        />
      </TableContainer>
    </Box>
  );
};

export default TransactionList;
