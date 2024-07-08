import createEthereumAppConfig from "../apps/eth";
import createFabricAppConfig from "../apps/fabric";
import { CreateAppConfigFactoryType } from "./types/app";

const config = new Map<string, CreateAppConfigFactoryType>([
  ["ethereumPersistenceBrowser", createEthereumAppConfig],
  ["fabricPersistenceBrowser", createFabricAppConfig],
]);

export default config;
