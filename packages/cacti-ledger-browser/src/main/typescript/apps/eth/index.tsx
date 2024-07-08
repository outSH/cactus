import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import {
  AppConfigPersistencePluginOptions,
  CreateAppConfigFactoryType,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";
import { GuiAppConfig } from "../../common/supabase-types";

const createEthereumAppConfig: CreateAppConfigFactoryType = (
  app: GuiAppConfig,
) => {
  const supabaseOptions =
    app.options as any as AppConfigPersistencePluginOptions;

  if (
    !supabaseOptions ||
    !supabaseOptions.supabaseUrl ||
    !supabaseOptions.supabaseKey ||
    !supabaseOptions.supabaseSchema
  ) {
    throw new Error(
      `Invalid ethereum app specific options in the database: ${JSON.stringify(supabaseOptions)}`,
    );
  }

  return {
    appName: "Ethereum Browser",
    instanceName: app.instance_name,
    description: app.description,
    path: app.path,
    options: supabaseOptions,
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
};

export default createEthereumAppConfig;
