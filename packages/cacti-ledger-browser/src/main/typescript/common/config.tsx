import { RouteObject } from "react-router-dom";
import cactiGuiConfig from "../apps/cacti/index";
import ethereumGuiConfig from "../apps/eth";
import fabricAppConfig from "../apps/fabric";

interface AppConfig {
  name: string;
  path: string;
  menuEntries: {
    title: string;
    url: string;
  }[];
  routes: RouteObject[];
}


export const appConfig: AppConfig[] = [
  // cactiGuiConfig,
  ethereumGuiConfig,
  // fabricAppConfig,
];
