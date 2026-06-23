import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, getEBayItem, ebayFullResUrl, type EBayItemSummary, type EBayItemDetail } from "@/lib/ebay";

/**
 * POST /api/external/sync
 *
 * Processes ONE enabled rule per call. Accepts ?rule_index=N to skip
 * already-processed rules (for incremental / resumable sync). Also
 * accepts ?rule_id=xxx to sync a single rule directly (backward-compat).
 *
 * Returns:
 *   { result, rule_index, total_rules, done, synced, enriched, timed_out? }
 *
 * Client drives the loop: call with rule_index=0, then rule_index=1, etc.
 * until done===true. Progress persists in localStorage so user can
 * navigate away and resume.
 *
 * Performance fixes vs old version:
 *   - Batched post-upsert SELECT (was O(n) sequential queries)
 *   - Concurrency=5 for enrichment calls
 *   - 8-second soft deadline per call (under Vercel Hobby 10s)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const DEADLINE_MS = 8_000; // 8s — safe under Vercel Hobby 10s limit
  const startTime = Date.now();
  function hasTimedOut() {
    return Date.now() - startTime > DEADLINE_MS;
  }

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!auth.isAdmin) return res.status(403).json({ error: "Admin only." });

  const supabase = getSupabaseAdmin();
  const { rule_id, rule_index } = req.query;

  // Fetch enabled rules
  let rulesQuery = supabase.from("external_rules").select("*").eq("enabled", true).order("created_at", { ascending: true });
  if (rule_id) rulesQuery = rulesQuery.eq("id", String(rule_id));

  const { data: rules, error: rulesError } = await rulesQuery;
  if (rulesError) return res.status(500).json({ error: rulesError.message });
  if (!rules || rules.length === 0) {
    return res.status(200).json({
      message: "No enabled rules to sync.",
      synced: 0,
      enriched: 0,
      results: [],
      rule_index: 0,
      total_rules: 0,
      done: true,
    });
  }

  // Determine which rule to process this call
  const idx = rule_index ? Math.max(0, parseInt(String(rule_index), 10) || 0) : 0;
  if (idx >= rules.length) {
    return res.status(200).json({
      message: "All rules already synced.",
      synced: 0,
      enriched: 0,
      results: [],
      rule_index: rules.length,
      total_rules: rules.length,
      done: true,
    });
  }

  const rule = rules[idx];
  let inserted = 0;
  let enriched = 0;
  let errorMsg: string | undefined;
  let timedOut = false;

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

    // Pre-fetch existing external_ids so we only set discovered_at for new items
    const itemIds = items.map((item) => item.itemId);
    const { data: existingRows } = await supabase
      .from("external_listings")
      .select("external_id")
      .eq("source", "ebay")
      .in("external_id", itemIds);

    const existingIds = new Set((existingRows || []).map((r) => r.external_id));

    // Step 1: Parallel upsert all items
    const upsertResults = await Promise.allSettled(
      items.map(async (item) => {
        const images = item.image
          ? [{ url: ebayFullResUrl(item.image.imageUrl), width: item.image.width, height: item.image.height }]
          : [];

        let locationStr: string | null = null;
        if (item.itemLocation) {
          const parts = [item.itemLocation.city];
          if (item.itemLocation.stateOrProvince) parts.push(item.itemLocation.stateOrProvince);
          parts.push(item.itemLocation.country);
          locationStr = parts.join(", ");
        }

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
              condition: item.condition || null,
              location: locationStr,
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

        return { item, upsertErr };
      })
    );

    // PERF FIX: Batch-fetch listing IDs instead of N sequential SELECTs
    const succeededItems = upsertResults
      .filter((r) => r.status === "fulfilled" && !r.value.upsertErr)
      .map((r) => (r as PromiseFulfilledResult<{ item: EBayItemSummary; upsertErr: any }>).value.item);

    inserted = succeededItems.length;

    if (succeededItems.length > 0) {
      const externalIds = succeededItems.map((item) => item.itemId);

      const { data: fetchedListings } = await supabase
        .from("external_listings")
        .select("id, external_id, description, return_terms, shipping_options, item_specifics")
        .eq("source", "ebay")
        .in("external_id", externalIds);

      // Build lookup map: external_id → listing row
      const listingMap = new Map<string, { id: string; description: any; return_terms: any; shipping_options: any; item_specifics: any }>();
      for (const row of fetchedListings || []) {
        listingMap.set(row.external_id, row);
      }

      // Identify items that need enrichment
      const enrichedIds: { itemId: string; item: EBayItemSummary; listingId: string; isAuction: boolean }[] = [];

      for (const item of succeededItems) {
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
          enrichedIds.push({ itemId: item.itemId, item, listingId: listing.id, isAuction: isAuction || false });
        }
      }

      // Step 2: Enrich in parallel batches of 5
      if (enrichedIds.length > 0) {
        const CONCURRENCY = 5;
        for (let i = 0; i < enrichedIds.length; i += CONCURRENCY) {
          if (hasTimedOut()) {
            timedOut = true;
            break;
          }

          const batch = enrichedIds.slice(i, i + CONCURRENCY);
          const detailResults = await Promise.allSettled(
            batch.map(async ({ itemId }) => {
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
            const entry = enrichedIds.find((e) => e.itemId === itemId);
            if (!entry) continue;

            const { item, listingId, isAuction } = entry;

            try {
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
                    : undefined,
                })
                .eq("source", "ebay")
                .eq("external_id", itemId);

              enriched++;
            } catch (detailErr: any) {
              console.warn(`[sync] Failed to update DB for item ${itemId}: ${detailErr.message}`);
            }
          }
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from("external_rules")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", rule.id);

  } catch (err: any) {
    errorMsg = err.message;
    // Still update last_synced_at on error
    await supabase
      .from("external_rules")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", rule.id);
  }

  const nextIndex = idx + 1;
  const done = nextIndex >= rules.length;

  return res.status(200).json({
    result: {
      rule_name: rule.name,
      searched: inserted,
      inserted,
      enriched,
      error: errorMsg,
      timed_out: timedOut,
    },
    rule_index: nextIndex,
    total_rules: rules.length,
    done,
    synced: inserted,
    enriched,
    timed_out: timedOut,
  });
}
