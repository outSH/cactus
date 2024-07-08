import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import {
  AppConfig,
  AppConfigPersistencePluginOptions,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";

const ethConfig: AppConfig<AppConfigPersistencePluginOptions> = {
  appName: "Ethereum Browser",
  instanceName: "Ethereum",
  description:
    "Applicaion for browsing Ethereum ledger blocks, transactions and tokens. Requires Ethereum persistence plugin to work correctly.",
  path: "/eth",
  options: {
    supabaseSchema: "ethereum",
    supabaseUrl: "http://localhost:8000",
    supabaseKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
  },
  menuEntries: [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "Accounts",
      url: "/accounts",
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
      path: "accounts",
      element: <Accounts />,
    },
  ],
  useAppStatus: () => usePersistenceAppStatus("PluginPersistenceEthereum"),
  StatusComponent: (
    <PersistencePluginStatus pluginName="PluginPersistenceEthereum" />
  ),
};

export default ethConfig;
