import { useRoutes, BrowserRouter, RouteObject } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { themeOptions } from "./theme";
import ContentLayout from "./components/Layout/ContentLayout";
import HeaderBar from "./components/Layout/HeaderBar";
import WelcomePage from "./components/WelcomePage";
import { AppConfig, AppListEntry } from "./common/types/app";

type AppConfigProps = {
  appConfig: AppConfig[];
};

/**
 * Get list of all apps from the config
 */
function getAppList(appConfig: AppConfig[]) {
  const appList: AppListEntry[] = appConfig.map((app) => {
    return {
      path: app.path,
      name: app.name,
    };
  });

  appList.unshift({
    path: "/",
    name: "Home",
  });

  return appList;
}

/**
 * Create header bar for each app based on app menuEntries field in config.
 */
function getHeaderBarRoutes(appConfig: AppConfig[]) {
  const appList = getAppList(appConfig);

  const headerRoutesConfig = appConfig.map((app) => {
    return {
      key: app.path,
      path: `${app.path}/*`,
      element: <HeaderBar appList={appList} menuEntries={app.menuEntries} />,
    };
  });
  headerRoutesConfig.push({
    key: "home",
    path: `*`,
    element: <HeaderBar appList={appList} />,
  });
  return useRoutes(headerRoutesConfig);
}

/**
 * Add application path to route path where applicable.
 *
 * Example: "blocks" route under "eth" app will create a path /eth/blocks
 */
function patchAppRoutePath(appPath: string, routePath?: string) {
  return routePath && routePath !== "/" ? `${appPath}/${routePath}` : appPath;
}

/**
 * Create content routes
 */
function getContentRoutes(appConfig: AppConfig[]) {
  const appRoutes: RouteObject[] = appConfig.map((app) => {
    return {
      key: app.path,
      path: app.path,
      children: app.routes.map((route) => {
        return {
          key: route.path,
          path: patchAppRoutePath(app.path, route.path),
          element: route.element,
          children: route.children,
        };
      }),
    };
  });

  // Include landing / welcome page
  appRoutes.push({
    index: true,
    element: <WelcomePage />,
  });

  return useRoutes([
    {
      path: "/",
      element: <ContentLayout />,
      children: appRoutes,
    },
  ]);
}

const App: React.FC<AppConfigProps> = ({ appConfig }) => {
  const headerRoutes = getHeaderBarRoutes(appConfig);
  const contentRoutes = getContentRoutes(appConfig);

  return (
    <div>
      {headerRoutes}
      {contentRoutes}
    </div>
  );
};

const theme = createTheme(themeOptions);

const CactiLedgerBrowserApp: React.FC<AppConfigProps> = ({ appConfig }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App appConfig={appConfig} />
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default CactiLedgerBrowserApp;
