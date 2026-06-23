import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, getEBayItem, ebayFullResUrl, type EBayItemSummary, type EBayItemDetail } from "@/lib/ebay";

/**
 * POST /api/external/sync
 *
 * Triggers eBay search for all enabled rules, upserts results into external_listings.
 * Admin only. Can also pass ?rule_id=xxx to sync a single rule.
 *
 * Uses parallel item detail fetches with concurrency limits to avoid
 * eBay rate limiting while keeping syncs fast.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Vercel serverless functions have a 60s timeout (hobby) / 900s (pro).
  // Set a reasonable internal deadline so we can return partial results.
  const DEADLINE_MS = 50_000; // 50s — leaves 10s buffer for Vercel overhead
  const startTime = Date.now();
  function hasTimedOut() {
    return Date.now() - startTime > DEADLINE_MS;
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
    enriched: number;
    error?: string;
    timed_out?: boolean;
  }[] = [];

  for (const rule of rules) {
    if (hasTimedOut()) {
      results.push({
        rule_name: rule.name,
        searched: 0,
        inserted: 0,
        enriched: 0,
        timed_out: true,
      });
      continue;
    }

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
        returnsAccepted: rule.returns_accepted_only || undefined,
        itemLocationCountries: (rule.item_location_countries as string[])?.length
          ? (rule.item_location_countries as string[])
          : undefined,
        minFeedbackScore: rule.min_feedback_score ?? undefined,
        excludeSellers: (rule.exclude_sellers as string[])?.length
          ? (rule.exclude_sellers as string[])
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
      let enriched = 0;

      // Step 1: Upsert basic listing info (fast, no item-detail call needed)
      for (const item of items) {
        const images = item.image
          ? [{ url: ebayFullResUrl(item.image.imageUrl), width: item.image.width, height: item.image.height }]
          : [];

        // Build location string with state/province when available
        let locationStr: string | null = null;
        if (item.itemLocation) {
          const parts = [item.itemLocation.city];
          if (item.itemLocation.stateOrProvince) parts.push(item.itemLocation.stateOrProvince);
          parts.push(item.itemLocation.country);
          locationStr = parts.join(", ");
        }

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
              location: locationStr,
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
        }
      }

      // Step 2: Enrich ALL listings in parallel with concurrency cap
      // 5 concurrent calls prevent eBay rate limiting while being much faster than serial
      const CONCURRENCY = 5;
      const itemIds = items.map((i) => i.itemId);

      for (let i = 0; i < itemIds.length; i += CONCURRENCY) {
        if (hasTimedOut()) break;

        const batch = itemIds.slice(i, i + CONCURRENCY);
        const detailResults = await Promise.allSettled(
          batch.map(async (itemId) => {
            const detail: EBayItemDetail = await getEBayItem(itemId);
            return { itemId, detail };
          })
        );

        for (const result of detailResults) {
          if (result.status === "rejected") {
            console.warn(`[sync] Failed to fetch item detail: ${result.reason?.message || result.reason}`);
            continue;
          }

          const { itemId, detail } = result.value;
          const item = items.find((i) => i.itemId === itemId);
          const locationStr = item?.itemLocation
            ? [item.itemLocation.city, item.itemLocation.stateOrProvince, item.itemLocation.country]
                .filter(Boolean)
                .join(", ")
            : null;

          try {
            const isAuction = item?.buyingOptions?.includes("AUCTION");
            await supabase
              .from("external_listings")
              .update({
                current_bid: isAuction && detail.currentBidPrice
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
                feedback_rating_star: detail.seller?.feedbackRatingStar || null,
                estimated_sold: detail.estimatedAvailabilities?.[0]
                  ?.estimatedSoldQuantity ?? null,
                estimated_available_qty: detail.estimatedAvailabilities?.[0]
                  ?.estimatedAvailableQuantity ?? null,
                condition_description: detail.conditionDescription || null,
                category_path: detail.categoryPath || null,
                category_id: detail.categoryId || null,
                watch_count: detail.watchCount ?? null,
                item_creation_date: detail.itemCreationDate || null,
                listing_duration: detail.listingDuration || null,
                quantity: detail.quantity ?? null,
                return_terms: detail.returnTerms || {},
                shipping_options: detail.shippingOptions || [],
                marketing_price: detail.marketingPrice || {},
                location: detail.itemLocation
                  ? [
                      detail.itemLocation.city,
                      detail.itemLocation.stateOrProvince,
                      detail.itemLocation.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : locationStr,
              })
              .eq("source", "ebay")
              .eq("external_id", itemId);

            enriched++;
          } catch (detailErr: any) {
            console.warn(
              `[sync] Failed to update DB for item ${itemId}: ${detailErr.message}`
            );
          }
        }
      }

      results.push({
        rule_name: rule.name,
        searched: items.length,
        inserted,
        enriched,
      });

      // Always update last_synced_at — even if enrichment partially failed
      await supabase
        .from("external_rules")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", rule.id);
    } catch (err: any) {
      // Still update last_synced_at on error so user knows we attempted a sync
      await supabase
        .from("external_rules")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", rule.id);

      results.push({
        rule_name: rule.name,
        searched: 0,
        inserted: 0,
        enriched: 0,
        error: err.message,
      });
    }
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalEnriched = results.reduce((sum, r) => sum + (r.enriched || 0), 0);
  const hadTimeout = results.some((r) => r.timed_out);

  return res.status(200).json({
    message: `Synced ${totalInserted} listings (${totalEnriched} enriched) across ${results.length} rules.${hadTimeout ? " Some rules skipped (timeout)." : ""}`,
    synced: totalInserted,
    enriched: totalEnriched,
    results,
    timed_out: hadTimeout,
  });
}
