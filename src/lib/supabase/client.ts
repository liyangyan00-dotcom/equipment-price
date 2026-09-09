import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    const config = getSupabasePublicConfig();
    browserClient = createBrowserClient(config.url, config.publishableKey);
  }

  return browserClient;
}
