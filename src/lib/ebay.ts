/**
 * eBay Browse API client.
 *
 * Auth: OAuth 2.0 Client Credentials (application access token)
 * Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html
 *
 * Rate limit: 5000 calls/day (Tier 1, free)
 */

const EBAY_API_BASE =
  process.env.EBAY_ENV === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";

const EBAY_OAUTH_URL = `${EBAY_API_BASE}/identity/v1/oauth2/token`;

export interface EBaySearchParams {
  q?: string;
  category_ids?: string;
  filter?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface EBayImage {
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface EBayItemSummary {
  itemId: string;
  title: string;
  price?: {
    value: string;
    currency: string;
  };
  image?: EBayImage;
  itemWebUrl: string;
  seller?: {
    username: string;
    feedbackPercentage?: string;
    feedbackScore?: number;
  };
  condition?: string;
  itemLocation?: {
    city: string;
    stateOrProvince?: string;
    country: string;
  };
  itemEndDate?: string;
  buyingOptions?: string[];
  shortDescription?: string;
}

export interface EBayItemDetail {
  itemId: string;
  title: string;
  shortDescription?: string;
  description?: string;
  price?: {
    value: string;
    currency: string;
  };
  currentBidPrice?: {
    value: string;
    currency: string;
  };
  bidCount?: number;
  reservePriceMet?: boolean;
  image?: EBayImage;
  additionalImages?: EBayImage[];
  itemWebUrl: string;
  seller?: {
    username: string;
    feedbackPercentage?: string;
    feedbackScore?: number;
    feedbackRatingStar?: string;
  };
  condition?: string;
  conditionDescription?: string;
  itemLocation?: {
    city: string;
    stateOrProvince?: string;
    country: string;
    postalCode?: string;
  };
  buyingOptions?: string[];
  itemEndDate?: string;
  localizedAspects?: {
    name: string;
    value: string;
  }[];
  estimatedAvailabilities?: {
    estimatedAvailableQuantity?: number;
    estimatedSoldQuantity?: number;
  }[];
  categoryPath?: string;
  categoryId?: string;
  watchCount?: number;
  itemCreationDate?: string;
  listingDuration?: string;
  quantity?: number;
  returnTerms?: {
    returnsAccepted?: boolean;
    refundMethod?: string;
    restockingFeePercentage?: string;
    returnShippingCostPayer?: string;
    returnPeriod?: { unit: string; value: number };
  };
  shippingOptions?: {
    shippingCost?: { value: string; currency: string };
    shippingCostType?: string;
    shippingServiceCode?: string;
    estimatedDeliveryDates?: { minDate?: string; maxDate?: string };
    additionalShippingCostPerUnit?: { value: string; currency: string };
  }[];
  marketingPrice?: {
    originalPrice?: { value: string; currency: string };
    discountAmount?: { value: string; currency: string };
    discountPercentage?: string;
    priceTreatment?: string;
  };
}

export interface EBaySearchResponse {
  total: number;
  limit: number;
  offset: number;
  itemSummaries?: EBayItemSummary[];
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (5 min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 300_000) {
    return tokenCache.token;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error("EBAY_APP_ID and EBAY_CERT_ID must be set in environment.");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  };

  return tokenCache.token;
}

/**
 * Search eBay items using the Browse API.
 */
export async function searchEBayItems(
  params: EBaySearchParams
): Promise<EBaySearchResponse> {
  const token = await getAccessToken();

  const url = new URL(`${EBAY_API_BASE}/buy/browse/v1/item_summary/search`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.category_ids) url.searchParams.set("category_ids", params.category_ids);
  if (params.filter) url.searchParams.set("filter", params.filter);
  if (params.sort) url.searchParams.set("sort", params.sort);
  url.searchParams.set("limit", String(params.limit || 50));
  if (params.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Fetch a single eBay item's full details via the Browse API.
 * Returns bid count, current bid, description, additional images, etc.
 * Useful for auction items and detail pages.
 */
export async function getEBayItem(
  itemId: string
): Promise<EBayItemDetail> {
  const token = await getAccessToken();

  const url = `${EBAY_API_BASE}/buy/browse/v1/item/${encodeURIComponent(itemId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay item fetch failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Convert eBay image URL to full resolution.
 * eBay URLs use size codes like s-l500, s-l64 — replace with s-l1600.
 */
export function ebayFullResUrl(imageUrl: string): string {
  return imageUrl.replace(/\/s-l\d+(\.\w+)$/, "/s-l1600$1");
}

/**
 * Build a filter string from rule config.
 * eBay filter syntax: https://developer.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html
 */
export function buildEBayFilter(params: {
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  conditions?: string[];
  listingTypes?: string[];
  returnsAccepted?: boolean;
  itemLocationCountries?: string[];
  minFeedbackScore?: number;
  excludeSellers?: string[];
}): string {
  const parts: string[] = [];

  // Price range
  if (params.priceMin || params.priceMax) {
    const min = params.priceMin ? `[${params.priceMin}` : "[0";
    const max = params.priceMax ? `${params.priceMax}]` : "]";
    parts.push(`price:${min}..${max}`);
    if (params.currency) {
      parts.push(`priceCurrency:${params.currency}`);
    }
  }

  // Conditions
  if (params.conditions && params.conditions.length > 0) {
    const condStr = params.conditions.map((c) => `{${c}}`).join(",");
    parts.push(`conditions:${condStr}`);
  }

  // Buying options
  if (params.listingTypes && params.listingTypes.length > 0) {
    const types = params.listingTypes.map((t) => `{${t}}`).join(",");
    parts.push(`buyingOptions:${types}`);
  }

  // Returns accepted
  if (params.returnsAccepted === true) {
    parts.push("returnsAccepted:{true}");
  }

  // Item location countries
  if (params.itemLocationCountries && params.itemLocationCountries.length > 0) {
    const countries = params.itemLocationCountries.map((c) => `{${c}}`).join(",");
    parts.push(`itemLocationCountry:${countries}`);
  }

  // Minimum feedback score
  if (params.minFeedbackScore) {
    parts.push(`feedbacks:{${params.minFeedbackScore}}`);
  }

  // Exclude sellers
  if (params.excludeSellers && params.excludeSellers.length > 0) {
    const sellers = params.excludeSellers.map((s) => `{${s}}`).join("|");
    parts.push(`excludeSellers:{${sellers}}`);
  }

  return parts.join(",");
}

// Common eBay antique categories
export const EBAY_ANTIQUE_CATEGORIES: Record<string, string> = {
  "Asian Antiques": "20081",
  "Chinese Antiques": "37978",
  "Vases": "37978",          // same as Chinese Antiques
  "Porcelain": "38310",
  "Jade": "38304",
  "Bronze": "37979",
  "Paintings": "38320",
  "Furniture": "38298",
  "Ceramics": "38305",
  "Snuff Bottles": "37997",
};
