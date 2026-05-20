import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type AdminProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
};

type VerifyAdminResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

const verifyAdmin = async (req: NextApiRequest): Promise<VerifyAdminResult> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Authorization required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase not configured" };
  }

  const token = authHeader.substring(7);
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || (profile as any).role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, userId: user.id };
};

const toSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, user_id, role, created_at, updated_at")
      .order("role", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ profiles: toSerializable((data ?? []) as AdminProfileRow[]) });
  }

  if (req.method === "PATCH") {
    const { id, role } = req.body as { id?: string; role?: "admin" | "user" };

    if (!id || (role !== "admin" && role !== "user")) {
      return res.status(400).json({ error: "Valid profile id and role are required." });
    }

    if (auth.userId === id && role === "user") {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return res.status(500).json({ error: countError.message });
      }

      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: "At least one administrator must remain." });
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("id, email, first_name, last_name, user_id, role, created_at, updated_at")
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Unable to update role." });
    }

    return res.status(200).json({ profile: toSerializable(data as AdminProfileRow) });
  }

  if (req.method === "DELETE") {
    const { id } = req.body as { id?: string };

    if (!id) {
      return res.status(400).json({ error: "Valid profile id is required." });
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", id)
      .single();

    if (targetError || !targetProfile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    if ((targetProfile as any).role === "admin") {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return res.status(500).json({ error: countError.message });
      }

      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: "At least one administrator must remain." });
      }
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id);
    if (deleteAuthError) {
      return res.status(500).json({ error: deleteAuthError.message });
    }

    return res.status(200).json({ ok: true, deletedId: id });
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
