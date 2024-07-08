import { Outlet } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import TransactionDetails from "./pages/TransactionDetails/TransactionDetails";
import {
  AppConfigPersistencePluginOptions,
  CreateAppConfigFactoryType,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";
import { GuiAppConfig } from "../../common/supabase-types";

const createFabricAppConfig: CreateAppConfigFactoryType = (
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
      `Invalid fabric app specific options in the database: ${JSON.stringify(supabaseOptions)}`,
    );
  }

  return {
    appName: "Hyperledger Fabric Browser",
    instanceName: app.instance_name,
    description: app.description,
    path: app.path,
    options: supabaseOptions,
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
        element: <Outlet context={supabaseOptions} />,
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
};

export default createFabricAppConfig;
