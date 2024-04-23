import TransactionSummary from "./TransactionSummary";
import Box from "@mui/material/Box";
import PageTitle from "../../../../components/ui/PageTitle";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";

function Dashboard() {
  return (
    <Box>
      <PageTitle>Dashboard</PageTitle>
      <Stack
        direction={{ lg: "column", xl: "row" }}
        spacing={5}
        justifyContent="space-between"
        alignItems="center"
      >
        <Box width={"80%"}>
          <Typography variant="h6" component="h3" marginBottom={2}>
            Blocks
          </Typography>
          <TransactionSummary />
        </Box>

        <Box width={"80%"}>
          <Typography variant="h6" component="h3" marginBottom={2}>
            Transactions
          </Typography>
          <TransactionSummary />
        </Box>
      </Stack>
    </Box>
  );
}

export default Dashboard;
