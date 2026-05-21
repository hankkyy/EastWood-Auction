import { createClient } from "@supabase/supabase-js";
import { assertSupabaseServerConfig } from "@/lib/supabase/config";

let cachedClient: ReturnType<typeof createClient<any>> | null = null;

export const getSupabaseAdmin = () => {
  const { url, serviceRoleKey } = assertSupabaseServerConfig();

  if (!cachedClient) {
    cachedClient = createClient<any>(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
};

export const getSupabaseBucket = () =>
  process.env.SUPABASE_STORAGE_BUCKET || "artwork-images";
