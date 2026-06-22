import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/external/listings/[id]/price-history
 *
 * Returns price history for a listing, ordered by recorded_at ascending.
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
    .from("listing_price_history")
    .select("price, current_bid, currency, recorded_at")
    .eq("listing_id", id)
    .order("recorded_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    listing_id: id,
    history: data || [],
  });
}
