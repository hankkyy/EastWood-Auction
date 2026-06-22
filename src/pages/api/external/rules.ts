import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET  /api/external/rules — list all rules (authenticated)
 * POST /api/external/rules — create a rule (admin only)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const auth = await verifySupabaseUser(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { data, error } = await supabase
      .from("external_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data });
  }

  if (req.method === "POST") {
    const auth = await verifySupabaseUser(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!auth.isAdmin) return res.status(403).json({ error: "Admin only." });

    const {
      name,
      keywords,
      category_ids,
      price_min,
      price_max,
      currency,
      conditions,
      listing_types,
      returns_accepted_only,
      item_location_countries,
      item_location_regions,
      min_feedback_score,
      exclude_sellers,
    } = req.body;

    if (!name || !keywords || keywords.length === 0) {
      return res.status(400).json({ error: "name and keywords are required." });
    }

    const { data, error } = await supabase
      .from("external_rules")
      .insert({
        name,
        keywords,
        category_ids: category_ids || [],
        price_min: price_min || null,
        price_max: price_max || null,
        currency: currency || "USD",
        conditions: conditions || [],
        listing_types: listing_types || [],
        returns_accepted_only: returns_accepted_only || false,
        item_location_countries: item_location_countries || [],
        item_location_regions: item_location_regions || [],
        min_feedback_score: min_feedback_score || null,
        exclude_sellers: exclude_sellers || [],
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ rule: data });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
