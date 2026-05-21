export const getSupabaseClientConfig = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const getSupabaseServerConfig = () => ({
  ...getSupabaseClientConfig(),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export const hasSupabaseClientConfig = () => {
  const { url, anonKey } = getSupabaseClientConfig();
  return Boolean(url && anonKey);
};

export const hasSupabaseServerConfig = () => {
  const { url, anonKey, serviceRoleKey } = getSupabaseServerConfig();
  return Boolean(url && anonKey && serviceRoleKey);
};

export const assertSupabaseClientConfig = () => {
  const { url, anonKey } = getSupabaseClientConfig();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase client credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, anonKey };
};

export const assertSupabaseServerConfig = () => {
  const { url, anonKey, serviceRoleKey } = getSupabaseServerConfig();

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { url, anonKey, serviceRoleKey };
};
