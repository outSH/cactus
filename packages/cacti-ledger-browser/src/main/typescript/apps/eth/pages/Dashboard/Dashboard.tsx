import Transactions from "../Transactions/Transactions";
import Blocks from "../Blocks/Blocks";

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Transactions />
      {/* <Blocks /> */}
    </div>
  );
}

export default Dashboard;
