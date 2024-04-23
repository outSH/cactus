import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { ethereumAllTransactionsQuery } from "../../queries";
import TransactionsPaginationActions from "./TransactionsPaginationActions";
import ShortHash from "../../../../components/ui/ShortHash";
import { useNotification } from "../../../../common/context/NotificationContext";

const rowsPerPage = 40;
const tableCellHeight = 39;

const StyledTableCellHeader = styled(TableCell)(({ theme }) => ({
  fontSize: 17,
  fontWeight: "bold",
  color: theme.palette.primary.main,
  height: tableCellHeight,
  borderColor: theme.palette.primary.main,
}));

const StyledTableCell = styled(TableCell)(() => ({
  height: tableCellHeight,
}));

export default function Transactions() {
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
            top: "5%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}
      <TableContainer component={Paper}>
        <Table
          sx={{ minWidth: 700 }}
          size="small"
          aria-label="ethereum transactions"
        >
          <TableHead>
            <TableRow>
              <StyledTableCellHeader>Hash</StyledTableCellHeader>
              <StyledTableCellHeader>Block</StyledTableCellHeader>
              <StyledTableCellHeader>From</StyledTableCellHeader>
              <StyledTableCellHeader>To</StyledTableCellHeader>
              <StyledTableCellHeader>Value</StyledTableCellHeader>
              <StyledTableCellHeader>Method</StyledTableCellHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((row) => (
              <TableRow key={row.id}>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  <ShortHash hash={row.hash} />
                </StyledTableCell>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  {row.block_number}
                </StyledTableCell>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  <ShortHash hash={row.from} />
                </StyledTableCell>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  <ShortHash hash={row.to} />
                </StyledTableCell>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  {row.eth_value}
                </StyledTableCell>
                <StyledTableCell style={{ height: tableCellHeight }}>
                  {row.method_name}
                </StyledTableCell>
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: tableCellHeight * emptyRows }}>
                <StyledTableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TransactionsPaginationActions
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
}
