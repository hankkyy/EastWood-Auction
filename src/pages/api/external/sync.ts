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

          // Enrich ALL listings with full details from getEBayItem
          try {
            const detail: EBayItemDetail = await getEBayItem(item.itemId);

            await supabase
              .from("external_listings")
              .update({
                // Auction-specific
                current_bid: detail.currentBidPrice
                  ? parseFloat(detail.currentBidPrice.value)
                  : null,
                bid_count: detail.bidCount ?? null,
                reserve_price_met: detail.reservePriceMet ?? null,

                // Descriptions
                short_description: detail.shortDescription || null,
                description: detail.description || null,

                // Images
                extra_images: detail.additionalImages?.map((img) => ({
                  url: ebayFullResUrl(img.imageUrl),
                  width: img.width,
                  height: img.height,
                })) || [],

                // Item specifics (localizedAspects)
                item_specifics: detail.localizedAspects || [],

                // Seller details
                feedback_pct: detail.seller?.feedbackPercentage || null,
                feedback_rating_star: detail.seller?.feedbackRatingStar || null,

                // Availability
                estimated_sold: detail.estimatedAvailabilities?.[0]
                  ?.estimatedSoldQuantity ?? null,
                estimated_available_qty: detail.estimatedAvailabilities?.[0]
                  ?.estimatedAvailableQuantity ?? null,

                // Condition
                condition_description: detail.conditionDescription || null,

                // Category
                category_path: detail.categoryPath || null,
                category_id: detail.categoryId || null,

                // Engagement
                watch_count: detail.watchCount ?? null,

                // Listing metadata
                item_creation_date: detail.itemCreationDate || null,
                listing_duration: detail.listingDuration || null,
                quantity: detail.quantity ?? null,

                // Policies
                return_terms: detail.returnTerms || {},
                shipping_options: detail.shippingOptions || [],
                marketing_price: detail.marketingPrice || {},

                // Update location with full detail (includes state + postal when available)
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
              .eq("external_id", item.itemId);
          } catch (detailErr: any) {
            console.warn(
              `[sync] Failed to fetch item detail for ${item.itemId}: ${detailErr.message}`
            );
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
