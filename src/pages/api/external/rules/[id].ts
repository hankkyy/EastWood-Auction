import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * PUT    /api/external/rules/[id] — update a rule (admin only)
 * DELETE /api/external/rules/[id] — delete a rule (admin only)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Rule ID required." });
  }

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!auth.isAdmin) return res.status(403).json({ error: "Admin only." });

  const supabase = getSupabaseAdmin();

  if (req.method === "PUT") {
    const {
      name,
      keywords,
      category_ids,
      price_min,
      price_max,
      currency,
      conditions,
      listing_types,
      enabled,
      returns_accepted_only,
      item_location_countries,
      item_location_regions,
      min_feedback_score,
      exclude_sellers,
    } = req.body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (category_ids !== undefined) updateData.category_ids = category_ids;
    if (price_min !== undefined) updateData.price_min = price_min;
    if (price_max !== undefined) updateData.price_max = price_max;
    if (currency !== undefined) updateData.currency = currency;
    if (conditions !== undefined) updateData.conditions = conditions;
    if (listing_types !== undefined) updateData.listing_types = listing_types;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (returns_accepted_only !== undefined) updateData.returns_accepted_only = returns_accepted_only;
    if (item_location_countries !== undefined) updateData.item_location_countries = item_location_countries;
    if (item_location_regions !== undefined) updateData.item_location_regions = item_location_regions;
    if (min_feedback_score !== undefined) updateData.min_feedback_score = min_feedback_score;
    if (exclude_sellers !== undefined) updateData.exclude_sellers = exclude_sellers;

    const { data, error } = await supabase
      .from("external_rules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rule: data });
  }

  if (req.method === "DELETE") {
    // Delete associated listings first
    await supabase.from("external_listings").delete().eq("rule_id", id);
    const { error } = await supabase.from("external_rules").delete().eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
