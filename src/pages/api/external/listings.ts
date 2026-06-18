import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/external/listings
 *
 * Query params:
 *   source   — 'ebay' (default: all)
 *   rule_id  — filter by rule UUID
 *   search   — search in title
 *   min_price / max_price
 *   sort     — 'price_asc', 'price_desc', 'newest' (default)
 *   page     — default 1
 *   limit    — default 20
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const supabase = getSupabaseAdmin();
  const {
    source,
    rule_id,
    search,
    min_price,
    max_price,
    sort = "newest",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase.from("external_listings").select("*", { count: "exact" });

  if (source) query = query.eq("source", String(source));
  if (rule_id) query = query.eq("rule_id", String(rule_id));
  if (search) query = query.ilike("title", `%${String(search)}%`);
  if (min_price) query = query.gte("price", Number(min_price));
  if (max_price) query = query.lte("price", Number(max_price));

  switch (sort) {
    case "price_asc": query = query.order("price", { ascending: true }); break;
    case "price_desc": query = query.order("price", { ascending: false }); break;
    default: query = query.order("discovered_at", { ascending: false });
  }

  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    listings: data || [],
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil((count || 0) / limitNum),
  });
}
