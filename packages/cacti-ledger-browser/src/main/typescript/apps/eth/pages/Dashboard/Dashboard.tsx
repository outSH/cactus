import { useNavigate } from "react-router-dom";
import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./Dashboard.module.css";
import {
  ethereumAllBlocksQuery,
  ethereumAllTransactionsQuery,
} from "../../queries";
import { useQuery } from "@tanstack/react-query";

function Dashboard() {
  const navigate = useNavigate();
  const {
    isSuccess: txIsSuccess,
    isError: txIsError,
    data: txData,
    error: txError,
  } = useQuery(ethereumAllTransactionsQuery());
  const {
    isSuccess: blockIsSuccess,
    isError: blockIsError,
    data: blockData,
    error: blockError,
  } = useQuery(ethereumAllBlocksQuery());

  if (txIsError) {
    console.error("Tranactions fetch error:", txError);
  }

  if (blockIsError) {
    console.error("Tranactions fetch error:", blockError);
  }

  const txnTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/eth/txn-details/${param}`);
      },
      prop: "id",
    },
    schema: [
      { display: "transaction id", objProp: ["id"] },
      { display: "sender/recipient", objProp: ["from", "to"] },
      { display: "token value", objProp: ["eth_value"] },
    ],
  };

  const blocksTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/eth/block-details/${param}`);
      },
      prop: "number",
    },
    schema: [
      { display: "created at", objProp: ["created_at"] },
      { display: "block number", objProp: ["number"] },
      { display: "hash", objProp: ["hash"] },
    ],
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div className={styles["dashboard-wrapper"]}>
        <CardWrapper
          columns={txnTableProps}
          title="Transactions"
          display="small"
          trimmed={true}
          data={txIsSuccess ? txData : []}
        ></CardWrapper>
        <CardWrapper
          columns={blocksTableProps}
          title="Blocks"
          display="small"
          trimmed={true}
          data={blockIsSuccess ? blockData : []}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default Dashboard;
