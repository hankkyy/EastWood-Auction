import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, type EBayItemSummary } from "@/lib/ebay";

/**
 * POST /api/external/cron-sync
 *
 * Cron-friendly sync endpoint. Authenticated via CRON_SYNC_SECRET
 * instead of user session, so Vercel cron jobs can trigger it.
 *
 * Vercel cron job passes Authorization: Bearer <CRON_SYNC_SECRET>
 *
 * Optional query param: ?rule_id=xxx to sync a single rule.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate via shared secret
  const secret = process.env.CRON_SYNC_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: "CRON_SYNC_SECRET is not set. Cron sync cannot run.",
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseAdmin();
  const { rule_id } = req.query;

  // Fetch enabled rules
  let rulesQuery = supabase
    .from("external_rules")
    .select("*")
    .eq("enabled", true);
  if (rule_id) rulesQuery = rulesQuery.eq("id", String(rule_id));

  const { data: rules, error: rulesError } = await rulesQuery;
  if (rulesError) return res.status(500).json({ error: rulesError.message });
  if (!rules || rules.length === 0) {
    return res
      .status(200)
      .json({ message: "No enabled rules to sync.", synced: 0 });
  }

  const results: {
    rule_name: string;
    searched: number;
    inserted: number;
    error?: string;
  }[] = [];

  for (const rule of rules) {
    try {
      const keywords = (rule.keywords as string[]) || [];
      const query = keywords.join(" ");
      const filter = buildEBayFilter({
        priceMin: rule.price_min ?? undefined,
        priceMax: rule.price_max ?? undefined,
        currency: rule.currency ?? "USD",
        conditions: (rule.conditions as string[])?.length
          ? (rule.conditions as string[])
          : undefined,
        listingTypes: (rule.listing_types as string[])?.length
          ? (rule.listing_types as string[])
          : undefined,
      });

      const ebayRes = await searchEBayItems({
        q: query,
        category_ids:
          (rule.category_ids as string[])?.join(",") || undefined,
        filter: filter || undefined,
        limit: 50,
      });

      const items = ebayRes.itemSummaries || [];
      let inserted = 0;

      for (const item of items) {
        const images = item.image
          ? [
              {
                url: item.image.imageUrl,
                width: item.image.width,
                height: item.image.height,
              },
            ]
          : [];

        const { error: upsertErr } = await supabase
          .from("external_listings")
          .upsert(
            {
              rule_id: rule.id,
              source: "ebay",
              external_id: item.itemId,
              title: item.title,
              price: item.price ? parseFloat(item.price.value) : null,
              currency: item.price?.currency || "USD",
              images,
              listing_url: item.itemWebUrl,
              seller: item.seller?.username || null,
              seller_rating: item.seller?.feedbackScore || null,
              condition: item.condition || null,
              location: item.itemLocation
                ? `${item.itemLocation.city}, ${item.itemLocation.country}`
                : null,
              matched_keywords: keywords.filter((kw: string) =>
                item.title?.toLowerCase().includes(kw.toLowerCase())
              ),
              ends_at: item.itemEndDate || null,
              discovered_at: new Date().toISOString(),
            },
            { onConflict: "source,external_id" }
          );

        if (!upsertErr) inserted++;
      }

      results.push({
        rule_name: rule.name,
        searched: items.length,
        inserted,
      });
    } catch (err: any) {
      results.push({
        rule_name: rule.name,
        searched: 0,
        inserted: 0,
        error: err.message,
      });
    }
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);

  console.log(
    `[cron-sync] ${totalInserted} listings synced across ${results.length} rules`
  );
  if (results.some((r) => r.error)) {
    console.warn(
      "[cron-sync] Errors:",
      results.filter((r) => r.error).map((r) => `${r.rule_name}: ${r.error}`)
    );
  }

  return res.status(200).json({
    message: `Synced ${totalInserted} listings across ${results.length} rules.`,
    synced: totalInserted,
    results,
  });
}
