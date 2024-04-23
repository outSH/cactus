import Box from "@mui/material/Box";
import TransactionListPaginationAction from "../../components/TransactionList/TransactionListPaginationAction";
import TransactionList from "../../components/TransactionList/TransactionList";
import PageTitleWithGoBack from "../../../../components/ui/PageTitleWithGoBack";

export default function Transactions() {
  return (
    <Box>
      <PageTitleWithGoBack>Transactions</PageTitleWithGoBack>
      <TransactionList
        footerComponent={TransactionListPaginationAction}
        columns={["hash", "block", "from", "to", "value", "method"]}
        rowsPerPage={40}
        tableSize="small"
      />
    </Box>
  );
}
