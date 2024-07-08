import config from "./config";
import { GuiAppConfig } from "./supabase-types";
import { AppConfig } from "./types/app";

export default function createAppConfig(appsFromDb?: GuiAppConfig[]) {
  const appConfig = [] as AppConfig[];

  if (!appsFromDb) {
    return appConfig;
  }

  for (const app of appsFromDb) {
    try {
      const appConfigFactoryMethod = config.get(app.app_id);

      if (!appConfigFactoryMethod) {
        throw new Error(
          `Unknown app ID found in the database - ${app.app_id}, ensure you're using latest GUI version!`,
        );
      }

      appConfig.push(appConfigFactoryMethod(app));
    } catch (error) {
      console.error(`Could not add app ${app.app_id}: ${error}`);
    }
  }

  return appConfig;
}
