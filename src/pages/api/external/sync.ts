import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, getEBayItem, ebayFullResUrl, type EBayItemSummary, type EBayItemDetail } from "@/lib/ebay";

/**
 * POST /api/external/sync
 *
 * Triggers eBay search for all enabled rules, upserts results into external_listings.
 * Admin only. Can also pass ?rule_id=xxx to sync a single rule.
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
  if (!auth.isAdmin) return res.status(403).json({ error: "Admin only." });

  const supabase = getSupabaseAdmin();
  const { rule_id } = req.query;

  // Fetch rules to sync
  let rulesQuery = supabase.from("external_rules").select("*").eq("enabled", true);
  if (rule_id) rulesQuery = rulesQuery.eq("id", String(rule_id));

  const { data: rules, error: rulesError } = await rulesQuery;
  if (rulesError) return res.status(500).json({ error: rulesError.message });
  if (!rules || rules.length === 0) {
    return res.status(200).json({ message: "No enabled rules to sync.", synced: 0 });
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
        category_ids: (rule.category_ids as string[])?.join(",") || undefined,
        filter: filter || undefined,
        limit: 50,
      });

      const items = ebayRes.itemSummaries || [];
      let inserted = 0;

      for (const item of items) {
        const images = item.image
          ? [{ url: ebayFullResUrl(item.image.imageUrl), width: item.image.width, height: item.image.height }]
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
              buying_options: item.buyingOptions || [],
              discovered_at: new Date().toISOString(),
            },
            { onConflict: "source,external_id" }
          );

        if (!upsertErr) {
          inserted++;

          // Enrich auction listings with bid count, current bid, description
          if (item.buyingOptions?.includes("AUCTION")) {
            try {
              const detail: EBayItemDetail = await getEBayItem(item.itemId);
              await supabase
                .from("external_listings")
                .update({
                  current_bid: detail.currentBidPrice
                    ? parseFloat(detail.currentBidPrice.value)
                    : null,
                  bid_count: detail.bidCount ?? null,
                  reserve_price_met: detail.reservePriceMet ?? null,
                  short_description: detail.shortDescription || null,
                  description: detail.description || null,
                  extra_images: detail.additionalImages?.map((img) => ({
                    url: ebayFullResUrl(img.imageUrl),
                    width: img.width,
                    height: img.height,
                  })) || [],
                  item_specifics: detail.localizedAspects || [],
                  feedback_pct: detail.seller?.feedbackPercentage || null,
                  estimated_sold: detail.estimatedAvailabilities?.[0]
                    ?.estimatedSoldQuantity ?? null,
                })
                .eq("source", "ebay")
                .eq("external_id", item.itemId);
            } catch (detailErr: any) {
              console.warn(
                `[sync] Failed to fetch item detail for ${item.itemId}: ${detailErr.message}`
              );
            }
          }
        }
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

  return res.status(200).json({
    message: `Synced ${totalInserted} listings across ${results.length} rules.`,
    synced: totalInserted,
    results,
  });
}
