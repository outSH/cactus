import { supabaseTableQuery } from "../../common/supabase-client";

export function persistencePluginStatusQuery() {
  return supabaseTableQuery("plugin_status");
}
