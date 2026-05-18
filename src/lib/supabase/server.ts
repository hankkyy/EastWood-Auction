import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
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
