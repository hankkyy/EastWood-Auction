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
    } = req.body;

    const { data, error } = await supabase
      .from("external_rules")
      .update({
        ...(name !== undefined && { name }),
        ...(keywords !== undefined && { keywords }),
        ...(category_ids !== undefined && { category_ids }),
        ...(price_min !== undefined && { price_min }),
        ...(price_max !== undefined && { price_max }),
        ...(currency !== undefined && { currency }),
        ...(conditions !== undefined && { conditions }),
        ...(listing_types !== undefined && { listing_types }),
        ...(enabled !== undefined && { enabled }),
        updated_at: new Date().toISOString(),
      })
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
