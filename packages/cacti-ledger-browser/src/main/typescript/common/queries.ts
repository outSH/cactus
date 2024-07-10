import { createClient } from "@supabase/supabase-js";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import { GuiAppConfig, PluginStatus } from "./supabase-types";

const supabaseQueryKey = "supabase";
const supabaseUrl = "http://localhost:8000";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get persistence plugin status from the database using it's name.
 */
export function persistencePluginStatus(name: string) {
  const tableName = "plugin_status";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ name });

      if (error) {
        throw new Error(
          `Could not get persistence plugin status with name ${name}: ${error.message}`,
        );
      }

      if (data.length !== 1) {
        throw new Error(
          `Invalid response when persistence plugin status with name ${name}: ${data}`,
        );
      }

      return data.pop() as PluginStatus;
    },
  });
}

/**
 * Get persistence plugin app config from the database.
 */
export function guiAppConfig() {
  const tableName = "gui_app_config";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select();

      if (error) {
        throw new Error(
          `Could not get GUI App configuration: ${error.message}`,
        );
      }

      return data as GuiAppConfig[];
    },
  });
}

export function invalidateGuiAppConfig(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: [supabaseQueryKey, "gui_app_config"],
  });
}

export type AddGuiAppConfigType = {
  app_id: string;
  instance_name: string;
  description: string;
  path: string;
  options: unknown;
};

export async function addGuiAppConfig(appData: AddGuiAppConfigType) {
  const { data, error } = await supabase
    .from("gui_app_config")
    .insert([appData]);

  if (error) {
    throw new Error(`Could not insert GUI App configuration: ${error.message}`);
  }

  console.log("RESPONSE:", data);

  return data;
}
