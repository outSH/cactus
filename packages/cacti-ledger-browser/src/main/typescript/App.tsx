import { useParams, Outlet, Link, useRoutes } from "react-router-dom";
import { appConfig } from "./common/config";
import ContentLayout from "./components/Layout/ContentLayout";
import Header from "./components/Layout/HeaderBar";

export default function HomeApp() {
  const headerRoutesConfig = appConfig.map((app) => {
    return {
      key: app.path,
      path: `${app.path}/*`,
      element: <Header menuEntries={app.menuEntries} />,
    };
  });
  headerRoutesConfig.push({
    key: "home",
    path: `*`,
    element: <Header />,
  });
  const headerRoutes = useRoutes(headerRoutesConfig);

  const contentRoutesConfig = appConfig.map((app) => {
    return {
      key: app.path,
      path: app.path,
      children: app.routes.map((route) => {
        const toUrl =
          route.path && route.path !== "/"
            ? `${app.path}/${route.path}`
            : app.path;
        return {
          key: route.path,
          path: toUrl,
          element: route.element,
          children: route.children,
        };
      }),
    };
  });
  contentRoutesConfig.push({
    key: "homeContent",
    index: true,
    element: <Home />,
  });

  const contentRoutes = useRoutes([
    {
      key: "contentLayout",
      path: "/",
      element: <ContentLayout />,
      children: contentRoutesConfig,
    },
  ]);

  return (
    <>
      {headerRoutes}
      {contentRoutes}
    </>
  );
}

function Home() {
  return (
    <div>
      <p>This is the home page.</p>
    </div>
  );
}
