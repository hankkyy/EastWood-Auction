import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * POST /api/external/export
 *
 * Export selected external listings as CSV.
 * Body: { ids: string[] } — array of listing UUIDs to export.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Provide listing IDs array." });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_listings")
    .select("*")
    .in("id", ids);

  if (error) return res.status(500).json({ error: error.message });

  // Build CSV
  const headers = [
    "Title", "Price", "Currency", "Condition", "Seller",
    "Seller Rating", "Location", "URL", "Discovered",
  ];
  const rows = (data || []).map((item) => [
    `"${(item.title || "").replace(/"/g, '""')}"`,
    item.price ?? "",
    item.currency ?? "",
    item.condition ?? "",
    item.seller ?? "",
    item.seller_rating ?? "",
    item.location ?? "",
    item.listing_url ?? "",
    item.discovered_at ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="eastwood-market-watch-${Date.now()}.csv"`
  );
  return res.status(200).send(csv);
}
