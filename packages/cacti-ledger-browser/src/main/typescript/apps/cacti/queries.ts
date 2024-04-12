import { queryOptions } from "@tanstack/react-query";
import { supabase } from "../../common/supabase-client";

export function persistencePluginStatusOptions() {
  return queryOptions({
    queryKey: ["supabase", "plugin_status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plugin_status").select();
      if (error) {
        throw new Error(
          `Could not get plugin statuses from the DB: ${error.message}`,
        );
      }

      return data;
    },
  });
}
