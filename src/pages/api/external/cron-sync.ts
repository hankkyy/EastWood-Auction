import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchEBayItems, buildEBayFilter, getEBayItem, ebayFullResUrl, type EBayItemSummary, type EBayItemDetail } from "@/lib/ebay";

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
                url: ebayFullResUrl(item.image.imageUrl),
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
              discovered_at: new Date().toISOString(),
            },
            { onConflict: "source,external_id" }
          );

        if (!upsertErr) {
          inserted++;

          // Get the listing ID for price history and enrichment
          const { data: listing } = await supabase
            .from("external_listings")
            .select("id, price, current_bid, description")
            .eq("source", "ebay")
            .eq("external_id", item.itemId)
            .single();

          const listingId = listing?.id;

          // Record price history
          if (listingId) {
            try {
              const { data: lastRecord } = await supabase
                .from("listing_price_history")
                .select("price, current_bid")
                .eq("listing_id", listingId)
                .order("recorded_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              const price = item.price ? parseFloat(item.price.value) : null;
              const shouldRecord =
                !lastRecord ||
                lastRecord.price !== price ||
                (lastRecord.current_bid !== null);

              if (shouldRecord) {
                await supabase.from("listing_price_history").insert({
                  listing_id: listingId,
                  price,
                  current_bid: null,
                  currency: item.price?.currency || "USD",
                });
              }
            } catch (_) {
              // Non-critical — don't fail sync over price history
            }
          }

          // Enrich listings with eBay item detail (bid count, description, specifics, etc.)
          // - AUCTION items: always enrich (to get fresh bid data)
          // - FIXED_PRICE items: enrich once (check if description is missing)
          const needsEnrichment =
            item.buyingOptions?.includes("AUCTION") ||
            !listing?.description;

          if (needsEnrichment) {
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
                  feedback_rating_star: detail.seller?.feedbackRatingStar || null,
                  condition_description: detail.conditionDescription || null,
                  estimated_sold: detail.estimatedAvailabilities?.[0]
                    ?.estimatedSoldQuantity ?? null,
                  estimated_available_qty: detail.estimatedAvailabilities?.[0]
                    ?.estimatedAvailableQuantity ?? null,
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
                .eq("external_id", item.itemId);

            // Record current_bid in price history after enrichment
            if (listingId && detail.currentBidPrice) {
              try {
                await supabase.from("listing_price_history").insert({
                  listing_id: listingId,
                  price: item.price ? parseFloat(item.price.value) : null,
                  current_bid: parseFloat(detail.currentBidPrice.value),
                  currency: detail.currentBidPrice.currency || "USD",
                });
              } catch (_) {
                // Non-critical
              }
            }
          } catch (detailErr: any) {
              console.warn(
                `[cron-sync] Failed to fetch item detail for ${item.itemId}: ${detailErr.message}`
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
