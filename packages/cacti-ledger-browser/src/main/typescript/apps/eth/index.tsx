import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import {
  AppCategory,
  AppInstancePersistencePluginOptions,
  AppDefinition,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";
import { GuiAppConfig } from "../../common/supabase-types";

const ethBrowserAppDefinition: AppDefinition = {
  appName: "Ethereum Browser",
  category: AppCategory.LedgerBrowser,
  defaultInstanceName: "My Eth Browser",
  defaultDescription:
    "Applicaion for browsing Ethereum ledger blocks, transactions and tokens. Requires Ethereum persistence plugin to work correctly.",
  defaultPath: "/eth",
  defaultOptions: "foo",

  createAppInstance(app: GuiAppConfig) {
    const supabaseOptions =
      app.options as any as AppInstancePersistencePluginOptions;

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
  },
};

export default ethBrowserAppDefinition;
