import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/external/listings/[id]
 *
 * Returns a single external listing by its UUID.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing listing ID" });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return res.status(error.code === "PGRST116" ? 404 : 500).json({
      error: error.code === "PGRST116" ? "Listing not found" : error.message,
    });
  }

  return res.status(200).json({ listing: data });
}
