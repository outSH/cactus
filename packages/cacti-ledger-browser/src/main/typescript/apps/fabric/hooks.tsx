import { useOutletContext } from "react-router-dom";
import { AppConfigPersistencePluginOptions } from "../../common/types/app";

export function useFabricAppConfig() {
  return useOutletContext<AppConfigPersistencePluginOptions>();
}

export function useFabricSupabaseConfig() {
  const appConfig = useFabricAppConfig();

  return {
    schema: appConfig.supabaseSchema,
    url: appConfig.supabaseUrl,
    key: appConfig.supabaseKey,
  };
}
