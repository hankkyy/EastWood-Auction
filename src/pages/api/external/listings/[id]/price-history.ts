import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/external/listings/[id]/price-history
 *
 * Returns deduplicated price history for a listing, ordered by recorded_at ascending.
 * Rows within 2s of each other are merged (preferring the one with current_bid data).
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

  // Deduplicate: merge rows within 2s, then reverse (newest first)
  const deduped: typeof data = [];
  const THRESHOLD_MS = 2000;

  for (const row of data || []) {
    const prev = deduped[deduped.length - 1];
    if (prev) {
      const prevTime = new Date(prev.recorded_at).getTime();
      const currTime = new Date(row.recorded_at).getTime();
      if (currTime - prevTime <= THRESHOLD_MS) {
        if (row.current_bid != null && prev.current_bid == null) {
          deduped[deduped.length - 1] = row;
        } else if (row.price != null && prev.price == null && row.current_bid != null) {
          deduped[deduped.length - 1] = row;
        }
        continue;
      }
    }
    deduped.push(row);
  }

  deduped.reverse();

  return res.status(200).json({
    listing_id: id,
    history: deduped,
  });
}
