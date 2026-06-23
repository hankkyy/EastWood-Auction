import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, getEBayItem, ebayFullResUrl, type EBayItemSummary, type EBayItemDetail } from "@/lib/ebay";

/**
 * POST /api/external/cron-sync
 *
 * Cron-friendly sync endpoint. Authenticated via CRON_SYNC_SECRET
 * instead of user session, so Vercel cron / GitHub Actions can trigger it.
 *
 * Optional query param: ?rule_id=xxx to sync a single rule.
 *
 * Vercel Hobby has a 10s timeout — each call must finish within that.
 * Performance improvements vs old version:
 *   - Parallel upserts (was sequential per-item)
 *   - Batch post-upsert SELECT (was N sequential queries)
 *   - discovers_at only set on first insert (was overwritten every sync)
 *   - Enrichment batched with concurrency=5, 8s soft deadline
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

  const DEADLINE_MS = 8_000; // 8s under Vercel Hobby 10s limit
  const startTime = Date.now();
  function hasTimedOut() {
    return Date.now() - startTime > DEADLINE_MS;
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
        itemLocationRegions: (rule.item_location_regions as string[])?.length
          ? (rule.item_location_regions as string[])
          : undefined,
        minFeedbackScore: rule.min_feedback_score ?? undefined,
        excludeSellers: (rule.exclude_sellers as string[])?.length
          ? (rule.exclude_sellers as string[])
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

      // Pre-fetch existing external_ids so we know which items are new
      // (discovered_at should only be set on first insert)
      const itemIds = items.map((item) => item.itemId);
      const { data: existingRows } = await supabase
        .from("external_listings")
        .select("external_id")
        .eq("source", "ebay")
        .in("external_id", itemIds);

      const existingIds = new Set((existingRows || []).map((r) => r.external_id));

      // Parallel upsert all items
      const upsertResults = await Promise.allSettled(
        items.map(async (item) => {
          const images = item.image
            ? [
                {
                  url: ebayFullResUrl(item.image.imageUrl),
                  width: item.image.width,
                  height: item.image.height,
                },
              ]
            : [];

          const isNew = !existingIds.has(item.itemId);

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
                feedback_pct: item.seller?.feedbackPercentage || null,
                condition: item.condition || null,
                location: item.itemLocation
                  ? [
                      item.itemLocation.city,
                      item.itemLocation.stateOrProvince,
                      item.itemLocation.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : null,
                matched_keywords: keywords.filter((kw: string) =>
                  item.title?.toLowerCase().includes(kw.toLowerCase())
                ),
                ends_at: item.itemEndDate || null,
                buying_options: item.buyingOptions || [],
                // Only set discovered_at for newly discovered items
                ...(isNew ? { discovered_at: new Date().toISOString() } : {}),
              },
              { onConflict: "source,external_id" }
            );

          return { item, upsertErr, isNew };
        })
      );

      // Collect succeeded items
      const succeeded = upsertResults
        .filter(
          (r) =>
            r.status === "fulfilled" &&
            !(r as PromiseFulfilledResult<{ item: EBayItemSummary; upsertErr: any; isNew: boolean }>).value.upsertErr
        )
        .map(
          (r) =>
            (r as PromiseFulfilledResult<{ item: EBayItemSummary; upsertErr: any; isNew: boolean }>).value
        );

      let inserted = succeeded.length;

      if (succeeded.length > 0) {
        // Batch-fetch listing IDs (was N sequential SELECTs)
        const externalIds = succeeded.map((s) => s.item.itemId);
        const { data: fetchedListings } = await supabase
          .from("external_listings")
          .select("id, external_id, price, current_bid, description, return_terms, shipping_options, item_specifics")
          .eq("source", "ebay")
          .in("external_id", externalIds);

        const listingMap = new Map<string, { id: string; price: number | null; current_bid: number | null; description: any; return_terms: any; shipping_options: any; item_specifics: any }>();
        for (const row of fetchedListings || []) {
          listingMap.set(row.external_id, row);
        }

        // Identify items needing enrichment
        const enrichedIds: { itemId: string; item: EBayItemSummary; listingId: string; isAuction: boolean; isNew: boolean }[] = [];

        for (const { item, isNew } of succeeded) {
          const listing = listingMap.get(item.itemId);
          if (!listing?.id) continue;

          const isAuction = item.buyingOptions?.includes("AUCTION");
          const needsEnrichment =
            isAuction ||
            !listing.description ||
            !listing.return_terms || Object.keys(listing.return_terms as Record<string, unknown>).length === 0 ||
            ((listing.shipping_options as any[]) || []).length === 0 ||
            ((listing.item_specifics as any[]) || []).length === 0;

          if (needsEnrichment) {
            enrichedIds.push({ itemId: item.itemId, item, listingId: listing.id, isAuction: isAuction || false, isNew });
          }
        }

        // Enrich in parallel batches of 5
        let enriched = 0;
        if (enrichedIds.length > 0) {
          const CONCURRENCY = 5;
          for (let i = 0; i < enrichedIds.length; i += CONCURRENCY) {
            if (hasTimedOut()) break;

            const batch = enrichedIds.slice(i, i + CONCURRENCY);
            const detailResults = await Promise.allSettled(
              batch.map(async ({ itemId }) => {
                const detail: EBayItemDetail = await getEBayItem(itemId);
                return { itemId, detail };
              })
            );

            for (const result of detailResults) {
              if (result.status === "rejected") {
                console.warn(`[cron-sync] Failed to fetch item detail: ${result.reason?.message || result.reason}`);
                continue;
              }

              const { itemId, detail } = result.value;
              const entry = enrichedIds.find((e) => e.itemId === itemId);
              if (!entry) continue;

              const { item, listingId, isAuction } = entry;

              try {
                // Only AUCTION items have meaningful current_bid — FIXED_PRICE
                // items may have a slightly different currentBidPrice from eBay
                // that creates fake ±0.1% trends in price history.
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
                    condition_description: detail.conditionDescription || null,
                    estimated_sold: detail.estimatedAvailabilities?.[0]
                      ?.estimatedSoldQuantity ?? null,
                    estimated_available_qty: detail.estimatedAvailabilities?.[0]
                      ?.estimatedAvailableQuantity ?? null,
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
                          detail.itemLocation.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : undefined,
                  })
                  .eq("source", "ebay")
                  .eq("external_id", itemId);

                enriched++;
              } catch (detailErr: any) {
                console.warn(
                  `[cron-sync] Failed to fetch item detail for ${itemId}: ${detailErr.message}`
                );
              }
            }
          }
          results.push({ rule_name: rule.name, searched: items.length, inserted, enriched });
        } else {
          results.push({ rule_name: rule.name, searched: items.length, inserted, enriched: 0 });
        }

        // Record price history for each succeeded item
        for (const { item, isNew } of succeeded) {
          const listing = listingMap.get(item.itemId);
          const listingId = listing?.id;
          if (!listingId) continue;

          try {
            const { data: lastRecord } = await supabase
              .from("listing_price_history")
              .select("price, current_bid")
              .eq("listing_id", listingId)
              .order("recorded_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const isAuction = item.buyingOptions?.includes("AUCTION");
            const price = item.price ? parseFloat(item.price.value) : null;
            const bid = isAuction ? (listing?.current_bid ?? null) : null;

            const priceChanged = !lastRecord || lastRecord.price !== price;
            const bidChanged = !lastRecord || (lastRecord.current_bid ?? null) !== (bid ?? null);

            if (priceChanged || bidChanged) {
              await supabase.from("listing_price_history").insert({
                listing_id: listingId,
                price,
                current_bid: bid,
                currency: item.price?.currency || "USD",
              });
            }
          } catch (_) {
            // Non-critical
          }
        }
      } else {
        results.push({ rule_name: rule.name, searched: items.length, inserted: 0, enriched: 0 });
      }

      // Update last_synced_at for this rule
      await supabase
        .from("external_rules")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", rule.id);

    } catch (err: any) {
      // Still update last_synced_at on error
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

  console.log(
    `[cron-sync] ${totalInserted} listings (${totalEnriched} enriched) across ${results.length} rules`
  );
  if (results.some((r) => r.error)) {
    console.warn(
      "[cron-sync] Errors:",
      results.filter((r) => r.error).map((r) => `${r.rule_name}: ${r.error}`)
    );
  }

  return res.status(200).json({
    message: `Synced ${totalInserted} listings (${totalEnriched} enriched) across ${results.length} rules.${hadTimeout ? " Some rules skipped (timeout)." : ""}`,
    synced: totalInserted,
    enriched: totalEnriched,
    results,
    timed_out: hadTimeout,
  });
}
