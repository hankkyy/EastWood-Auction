import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/external/rules/ids
 *
 * Returns enabled rule IDs for cron job matrix dispatch.
 * Auth: CRON_SYNC_SECRET
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const secret = process.env.CRON_SYNC_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "CRON_SYNC_SECRET not set" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_rules")
    .select("id")
    .eq("enabled", true);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json((data || []).map((r) => r.id));
}
