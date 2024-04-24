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

import { ethereumAllBlocksQuery } from "../../queries";
import ShortHash from "../../../../components/ui/ShortHash";
import { useNotification } from "../../../../common/context/NotificationContext";
import { Block } from "../../../../common/supabase-types";
import {
  StyledTableCell,
  StyledTableCellHeader,
  tableCellHeight,
} from "./StyledTableCell";
import { blockColumnsConfig } from "./blockColumnsConfig";
import { TablePaginationActionProps } from "./TablePaginationAction";

/**
 * List of columns that can be rendered in a transaction list table
 */
export type BlockListColumn = keyof typeof blockColumnsConfig;

/**
 * BlockList properties.
 */
export interface BlockListProps {
  footerComponent: React.ComponentType<TablePaginationActionProps>;
  columns: BlockListColumn[];
  rowsPerPage: number;
  tableSize?: "small" | "medium";
}

/**
 * BlockList - Show table with ethereum blocks.
 * Supports paging and error handling. Will show empty entries if number of entries
 * is smaller then requested `rowsPerPage` to keep UI in place.
 *
 * @param footerComponent component will be rendered in a footer of a transaction list table.
 * @param columns list of columns to be rendered.
 * @param rowsPerPage how many rows to show per page.
 */
const BlockList: React.FC<BlockListProps> = ({
  footerComponent: FooterComponent,
  columns,
  rowsPerPage,
  tableSize,
}) => {
  const [page, setPage] = React.useState(0);
  const { isError, isPending, data, error, refetch } = useQuery({
    ...ethereumAllBlocksQuery(page, rowsPerPage),
    placeholderData: keepPreviousData,
  });
  const { showNotification } = useNotification();
  const blocks = data ?? [];

  React.useEffect(() => {
    isError && showNotification(`Could not fetch blocks: ${error}`, "error");
  }, [isError]);

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = Math.max(0, rowsPerPage - blocks.length);

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
          aria-label="ethereum blocks"
        >
          <TableHead>
            <TableRow>
              {columns.map((colName) => {
                return (
                  <StyledTableCellHeader key={`${colName}-header-cell`}>
                    {blockColumnsConfig[colName].name}
                  </StyledTableCellHeader>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.map((row) => (
              <TableRow key={row.number}>
                {columns.map((colName) => {
                  const config = blockColumnsConfig[colName];
                  const value = row[config.field as keyof Block];
                  return (
                    <StyledTableCell key={`${row.number}-${colName}`}>
                      {/* TODO - format dates as well */}
                      {config.isHash ? (
                        <ShortHash hash={value as string} />
                      ) : (
                        value
                      )}
                    </StyledTableCell>
                  );
                })}
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: tableCellHeight * emptyRows }}>
                <StyledTableCell colSpan={6} />
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

export default BlockList;
