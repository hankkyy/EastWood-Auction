import { randomInt } from "crypto";
import type { NextApiRequest } from "next";
import { createClient, type User } from "@supabase/supabase-js";
import { assertSupabaseClientConfig } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type ProfileRole = "admin" | "user";

type ProfileRoleLookupResult =
  | {
      ok: true;
      role: ProfileRole;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export type VerifiedSupabaseUser =
  | {
      ok: true;
      userId: string;
      role: ProfileRole;
      isAdmin: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

const buildUserIdBase = (user: User) => {
  const metadataFirstName =
    typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "";
  const metadataLastName =
    typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : "";
  const emailLocalPart = user.email?.split("@")[0] ?? "";

  const preferredBase = metadataLastName || metadataFirstName || emailLocalPart || "user";
  const normalizedBase = preferredBase.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const safeBase = normalizedBase.length >= 2 ? normalizedBase : "user";

  return safeBase.slice(0, 10);
};

const createCandidateUserId = (user: User) =>
  `${buildUserIdBase(user)}${randomInt(0, 1000).toString().padStart(3, "0")}`;

const ensureProfileForUser = async (user: User): Promise<ProfileRoleLookupResult> => {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return {
      ok: false,
      status: 500,
      error: existingProfileError.message,
    };
  }

  if (existingProfile?.role === "admin" || existingProfile?.role === "user") {
    return {
      ok: true,
      role: existingProfile.role,
    };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        role: "user",
        first_name:
          typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "",
        last_name:
          typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : "",
        user_id: createCandidateUserId(user),
      } as any)
      .select("role")
      .single();

    if (!createError && createdProfile?.role === "admin") {
      return { ok: true, role: "admin" };
    }

    if (!createError && createdProfile?.role === "user") {
      return { ok: true, role: "user" };
    }

    if (createError?.code === "23505") {
      continue;
    }

    return {
      ok: false,
      status: 500,
      error: createError?.message || "Failed to create user profile.",
    };
  }

  return {
    ok: false,
    status: 500,
    error: "Failed to generate a unique profile user_id.",
  };
};

export const verifySupabaseUser = async (
  req: NextApiRequest
): Promise<VerifiedSupabaseUser> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { ok: false, status: 401, error: "Authorization required" };
    }

    const { url, anonKey } = assertSupabaseClientConfig();
    const token = authHeader.substring(7);
    const supabaseClient = createClient(url, anonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return { ok: false, status: 401, error: "Invalid token" };
    }

    const profile = await ensureProfileForUser(user);
    if (!profile.ok) {
      return profile;
    }

    return {
      ok: true,
      userId: user.id,
      role: profile.role,
      isAdmin: profile.role === "admin",
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Supabase authentication failed.",
    };
  }
};
