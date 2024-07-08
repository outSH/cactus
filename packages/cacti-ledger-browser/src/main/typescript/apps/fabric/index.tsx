import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import { Outlet } from "react-router-dom";
import TransactionDetails from "./pages/TransactionDetails/TransactionDetails";
import {
  AppConfig,
  AppConfigPersistencePluginOptions,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";

const fabricOptions: AppConfigPersistencePluginOptions = {
  instanceName: "Fabric",
  description:
    "Applicaion for browsing Hyperledger Fabric ledger blocks and transactions. Requires Fabric persistence plugin to work correctly.",
  path: "/fabric",
  supabaseSchema: "fabric",
  supabaseUrl: "http://localhost:8000",
  supabaseKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
},

const fabricConfig: AppConfig<AppConfigPersistencePluginOptions> = {
  appName: "Hyperledger Fabric Browser",
  options: fabricOptions,
  menuEntries: [
    {
      title: "Dashboard",
      url: "/",
    },
  ],
  routes: [
    {
      element: <Dashboard />,
    },
    {
      path: "blocks",
      element: <Blocks />,
    },
    {
      path: "transactions",
      element: <Transactions />,
    },
    {
      path: "transaction",
      element: <Outlet context={fabricOptions} />,
      children: [
        {
          path: ":hash",
          element: (
            <div>
              <TransactionDetails />
            </div>
          ),
        },
      ],
    },
  ],
  useAppStatus: () => usePersistenceAppStatus("PluginPersistenceFabric"),
  StatusComponent: (
    <PersistencePluginStatus pluginName="PluginPersistenceFabric" />
  ),
};

export default fabricConfig;
