import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  ActionIcon,
  Progress,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconHeart,
  IconHeartFilled,
  IconArrowBack,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeHtml } from "@/lib/sanitize";
import { ebayFullResUrl } from "@/lib/ebay";
import {
  appMutedTextColor,
  appSurfaceBackground,
  appSurfaceBorder,
  appTextColor,
} from "@/components/artworkStyles";

interface ListingDetail {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  current_bid: number | null;
  bid_count: number | null;
  reserve_price_met: boolean | null;
  images: { url: string; width?: number; height?: number }[];
  extra_images?: { url: string; width?: number; height?: number }[];
  listing_url: string;
  seller: string | null;
  seller_rating: number | null;
  feedback_pct?: string | null;
  feedback_rating_star?: string | null;
  condition: string | null;
  condition_description?: string | null;
  location: string | null;
  discovered_at: string;
  ends_at: string | null;
  matched_keywords: string[];
  buying_options: string[];
  short_description: string | null;
  description?: string | null;
  item_specifics?: { name: string; value: string }[];
  estimated_sold?: number | null;
  estimated_available_qty?: number | null;
  category_path?: string | null;
  category_id?: string | null;
  watch_count?: number | null;
  item_creation_date?: string | null;
  listing_duration?: string | null;
  quantity?: number | null;
  return_terms?: any;
  shipping_options?: any[];
  marketing_price?: any;
  is_saved?: boolean;
}

interface PricePoint {
  price: number | null;
  current_bid: number | null;
  currency: string;
  recorded_at: string;
}

const formatPrice = (price: number | null, currency: string) => {
  if (price == null) return "";
  const a = Math.round(price);
  return currency === "CNY"
    ? `¥${a.toLocaleString()}`
    : `$${a.toLocaleString()}`;
};

const formatEndsAt = (endsAt: string | null): { text: string; urgent: boolean } => {
  if (!endsAt) return { text: "", urgent: false };
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Ended", urgent: true };
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const diffD = Math.floor(diffH / 24);
  if (diffD > 0) return { text: `Ends in ${diffD}d ${diffH % 24}h`, urgent: diffD <= 1 };
  if (diffH > 0) return { text: `Ends in ${diffH}h ${diffM}m`, urgent: diffH <= 3 };
  return { text: `Ends in ${diffM}m`, urgent: true };
};

export default function MarketWatchDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [relatedListings, setRelatedListings] = useState<ListingDetail[]>([]);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const id = typeof router.query.id === "string" ? router.query.id : "";

  const fetchSavedStatus = useCallback(async () => {
    if (!user || !id) return;
    try {
      const res = await fetch("/api/external/saved", {
        headers: { Authorization: `Bearer ${(await supabaseAuth())}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSaved((data.saved_ids || []).includes(id));
      }
    } catch (_) {}
  }, [user, id]);

  const supabaseAuth = async () => {
    const { supabase } = await import("@/lib/supabase/client");
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  };

  const toggleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await supabaseAuth();
      const action = saved ? "unsave" : "save";
      const res = await fetch("/api/external/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listing_id: id, action }),
      });
      if (res.ok) {
        setSaved(!saved);
      }
    } catch (_) {}
    setSaving(false);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/external/listings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setListing(data.listing);
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchSavedStatus();
  }, [fetchSavedStatus]);

  // Fetch related listings — search by all keywords, fall back to recent listings
  useEffect(() => {
    if (!listing?.id) return;
    const keywords = listing.matched_keywords || [];

    // Try keyword search first
    const searchQuery = keywords.length > 0
      ? keywords.slice(0, 3).join(" ")
      : listing.title?.split(" ").slice(0, 3).join(" ") || "";

    fetch(`/api/external/listings?limit=15&search=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        const others = (data.listings || []).filter(
          (r: ListingDetail) => r.id !== listing.id
        );
        // Prefer items that share keywords, then fill with any others
        const keywordSet = new Set(keywords.map((k: string) => k.toLowerCase()));
        const matched = others.filter((r: ListingDetail) =>
          (r.matched_keywords || []).some((k: string) => keywordSet.has(k.toLowerCase()))
        );
        const result = [...matched, ...others.filter((r: ListingDetail) => !matched.includes(r))].slice(0, 4);
        setRelatedListings(result);
      })
      .catch(() => {});
  }, [listing?.id, listing?.matched_keywords, listing?.title]);

  // Fetch price history
  useEffect(() => {
    if (!id) return;
    fetch(`/api/external/listings/${id}/price-history`)
      .then((res) => res.json())
      .then((data) => setPriceHistory(data.history || []))
      .catch(() => {});
  }, [id]);

  // Preload all images so there's never a loading flash when switching
  const preloadedRef = useRef<Set<string>>(new Set());

  // Compute allImages from listing (safe for null during loading)
  const allImages = useMemo(() => {
    if (!listing) return [];
    const seen = new Set<string>();
    const result: { url: string; width?: number; height?: number }[] = [];
    for (const img of [...(listing.images || []), ...(listing.extra_images || [])]) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        result.push(img);
      }
    }
    return result;
  }, [listing]);

  const goToPrevImage = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const goToNextImage = useCallback(() => {
    setSelectedIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  useEffect(() => {
    for (const img of allImages) {
      if (img.url && !preloadedRef.current.has(img.url)) {
        const imageEl = new Image();
        imageEl.src = img.url;
        preloadedRef.current.add(img.url);
      }
    }
  }, [allImages]);

  if (loading) {
    return (
      <Wrapper>
        <Container py={60} px={isMobile ? 16 : undefined}>
          <Skeleton height={400} radius="md" mb="lg" />
          <Skeleton height={32} width="70%" mb="sm" />
          <Skeleton height={24} width="40%" />
        </Container>
      </Wrapper>
    );
  }

  if (!listing) {
    return (
      <Wrapper>
        <Container py={60} px={isMobile ? 16 : undefined}>
          <Stack align="center" spacing="lg">
            <Title order={3}>{locale === "zh" ? "未找到该商品" : "Listing Not Found"}</Title>
            <Button component={Link} href="/market-watch" variant="subtle">
              ← {locale === "zh" ? "返回市场监控" : "Back to Market Watch"}
            </Button>
          </Stack>
        </Container>
      </Wrapper>
    );
  }

  const endInfo = formatEndsAt(listing.ends_at);
  const isAuction = listing.buying_options?.includes("AUCTION");
  const isFixedPrice = listing.buying_options?.includes("FIXED_PRICE");
  const isBestOffer = listing.buying_options?.includes("BEST_OFFER");
  const displayedPrice = isAuction && listing.current_bid
    ? listing.current_bid
    : listing.price;

  const selectedImage = allImages[selectedIndex]?.url || "";

  // Scroll thumbnails left/right
  const scrollThumbnails = (dir: "left" | "right") => {
    if (thumbnailsRef.current) {
      thumbnailsRef.current.scrollBy({
        left: dir === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  // Price trend calculation
  const priceTrend = (() => {
    if (priceHistory.length < 2) return null;
    const first = priceHistory[priceHistory.length - 1];
    const last = priceHistory[0];
    const firstVal = first.current_bid ?? first.price;
    const lastVal = last.current_bid ?? last.price;
    if (firstVal == null || lastVal == null || firstVal === 0) return null;
    const change = ((lastVal - firstVal) / firstVal) * 100;
    return { up: change > 0, pct: Math.abs(change).toFixed(1) };
  })();

  return (
    <>
      <Head>
        <title>{listing.title} — Market Watch — Eastwood Auction</title>
        {locale === "zh" && (
          <>
            <script
              src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInitDetail"
              async
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  function googleTranslateElementInitDetail() {
                    new google.translate.TranslateElement(
                      { pageLanguage: 'en', includedLanguages: 'en,zh-CN', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
                      'google_translate_element_detail'
                    );
                  }
                `,
              }}
            />
          </>
        )}
      </Head>
      <Wrapper>
        <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined}>
          {/* Breadcrumb */}
          <Group spacing={6} mb={isMobile ? 24 : 36} sx={{ opacity: 0.7 }}>
            <Text
              size="sm" component={Link} href="/"
              sx={(theme) => ({
                color: appMutedTextColor(theme), textDecoration: "none",
                "&:hover": { color: "#c4a255", textDecoration: "underline" },
              })}
            >
              {locale === "zh" ? "首页" : "Home"}
            </Text>
            <Text size="sm" sx={(theme) => ({ color: appMutedTextColor(theme), opacity: 0.5 })}>∕</Text>
            <Text
              size="sm" component={Link} href="/market-watch"
              sx={(theme) => ({
                color: appMutedTextColor(theme), textDecoration: "none",
                "&:hover": { color: "#c4a255", textDecoration: "underline" },
              })}
            >
              {locale === "zh" ? "市场监控" : "Market Watch"}
            </Text>
            <Text size="sm" sx={(theme) => ({ color: appMutedTextColor(theme), opacity: 0.5 })}>∕</Text>
            <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })} lineClamp={1}>
              {listing.title.length > 40 ? listing.title.slice(0, 40) + "..." : listing.title}
            </Text>
          </Group>

          {/* Back link + Save + Translate */}
          <Group position="apart" mb="lg">
            <Group spacing="xs">
              <Button
                component={Link} href="/market-watch"
                variant="subtle" leftIcon={<IconArrowLeft size={16} />} px={0}
              >
                {locale === "zh" ? "返回" : "Back"}
              </Button>
              {locale === "zh" && (
                <>
                  <div id="google_translate_element_detail" />
                  <Button
                    variant="outline" size="xs"
                    leftIcon={<IconArrowBack size={14} />}
                    onClick={() => {
                      document.cookie = "googtrans=/en/en;path=/;max-age=0";
                      document.cookie = "googtrans=/en/en;path=/";
                      window.location.reload();
                    }}
                    sx={(theme) => ({
                      borderColor: "rgba(196,162,85,0.3)",
                      color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                      "&:hover": { borderColor: "#c4a255", color: "#c4a255" },
                    })}
                  >
                    恢复原文
                  </Button>
                </>
              )}
            </Group>
            <Tooltip label={user ? "" : t("marketWatch.loginToSave")} disabled={!!user}>
              <Button
                variant="subtle"
                color={saved ? "red" : "gray"}
                leftIcon={saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                onClick={toggleSave}
                loading={saving}
                disabled={!user}
              >
                {saved ? t("marketWatch.unsaveListing") : t("marketWatch.saveListing")}
              </Button>
            </Tooltip>
          </Group>

          {/* Translate guidance + disclaimer */}
          {locale === "zh" && (
            <Box mb="lg">
              <Text size="xs" color="dimmed" lh={1.5}>
                点击下拉菜单选择翻译语言，或点击「恢复原文」按钮取消翻译
              </Text>
              <Text size="xs" mt={4} sx={(theme) => ({ color: appMutedTextColor(theme), opacity: 0.55, lineHeight: 1.5 })}>
                ⚠️ 翻译由 Google 第三方提供，可能存在误翻或滞后。商品描述、属性、退货政策等关键信息请以英文原文为准。
              </Text>
            </Box>
          )}

          {/* Two-column layout */}
          <Box sx={{ display: "flex", gap: 40, flexDirection: isMobile ? "column" : "row" }}>
            {/* Left — Images */}
            <Box
              sx={{
                flex: isMobile ? "none" : "0 0 45%",
                maxWidth: isMobile ? "100%" : "45%",
                minWidth: isMobile ? "100%" : 280,
              }}
            >
              {/* Main image with arrows — aspect-ratio locks height, prevents arrow bounce */}
              <Box
                sx={{
                  position: "relative",
                  aspectRatio: "1",
                  userSelect: "none",
                  overscrollBehavior: "contain",
                }}
              >
                <Box
                  sx={(theme) => ({
                    borderRadius: 2, overflow: "hidden",
                    background: appSurfaceBackground(theme),
                    border: `1px solid ${appSurfaceBorder(theme)}`,
                  })}
                >
                  <Box
                    sx={{
                      width: "100%", paddingBottom: "100%", position: "relative",
                      background: selectedImage
                        ? `url(${selectedImage}) center/contain no-repeat`
                        : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                      backgroundColor: "#1a1815",
                    }}
                  >
                  </Box>
                </Box>

                {/* Left/Right arrow overlays */}
                {allImages.length > 1 && (
                  <>
                    <Box
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToPrevImage(); }}
                      sx={{
                        position: "absolute", top: 0, bottom: 0, left: 0,
                        width: "25%", zIndex: 3, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "flex-start",
                        paddingLeft: 4,
                      }}
                    >
                      <ActionIcon
                        variant="filled" radius="xl" size="xl"
                        tabIndex={-1}
                        sx={{
                          backgroundColor: "rgba(0,0,0,0.45)", color: "#fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          pointerEvents: "none",
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.65)" },
                        }}
                      >
                        <IconChevronLeft size={22} />
                      </ActionIcon>
                    </Box>
                    <Box
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToNextImage(); }}
                      sx={{
                        position: "absolute", top: 0, bottom: 0, right: 0,
                        width: "25%", zIndex: 3, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "flex-end",
                        paddingRight: 4,
                      }}
                    >
                      <ActionIcon
                        variant="filled" radius="xl" size="xl"
                        tabIndex={-1}
                        sx={{
                          backgroundColor: "rgba(0,0,0,0.45)", color: "#fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          pointerEvents: "none",
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.65)" },
                        }}
                      >
                        <IconChevronRight size={22} />
                      </ActionIcon>
                    </Box>
                  </>
                )}
              </Box>

              {/* Extra images thumbnails — scrollable */}
              {allImages.length > 1 && (
                <Box mt="sm" sx={{ position: "relative" }}>
                  <Group spacing={0} noWrap sx={{ overflow: "hidden", position: "relative" }}>
                    <Box
                      ref={thumbnailsRef}
                      sx={{
                        display: "flex", gap: 8, overflowX: "auto",
                        scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
                        paddingBottom: 4,
                      }}
                    >
                      {allImages.map((img, i) => (
                        <Box
                          key={img.url}
                          onClick={() => setSelectedIndex(i)}
                          sx={(theme) => ({
                            width: 72, height: 72, flexShrink: 0,
                            borderRadius: 4, cursor: "pointer",
                            background: `url(${img.url}) center/cover`,
                            border: i === selectedIndex
                              ? `2px solid #c4a255`
                              : `1px solid ${appSurfaceBorder(theme)}`,
                            opacity: i === selectedIndex ? 1 : 0.6,
                            "&:hover": { opacity: 1 },
                          })}
                        />
                      ))}
                    </Box>
                    {allImages.length > 6 && (
                      <>
                        <ActionIcon
                          size="sm" variant="filled" radius="xl"
                          tabIndex={-1}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollThumbnails("left"); }}
                          sx={{
                            position: "absolute", left: 0, top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(0,0,0,0.45)", color: "#fff",
                            zIndex: 2,
                          }}
                        >
                          <IconChevronLeft size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm" variant="filled" radius="xl"
                          tabIndex={-1}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollThumbnails("right"); }}
                          sx={{
                            position: "absolute", right: 0, top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(0,0,0,0.45)", color: "#fff",
                            zIndex: 2,
                          }}
                        >
                          <IconChevronRight size={14} />
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </Box>
              )}
            </Box>

            {/* Right — Info */}
            <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <Stack spacing="md">
                {/* Title */}
                <Title
                  order={3}
                  sx={(theme) => ({
                    color: appTextColor(theme), fontWeight: 400,
                    fontFamily: "\"Playfair Display\", Georgia, 'Times New Roman', serif",
                    letterSpacing: "-0.02em",
                  })}
                >
                  {listing.title}
                </Title>

                {/* eBay category path */}
                {listing.category_path && (
                  <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                    {listing.category_path}
                    {listing.category_id && (
                      <Text component="span" size="xs" sx={(theme) => ({ color: appMutedTextColor(theme), opacity: 0.6 })}>
                        {" "}· ID: {listing.category_id}
                      </Text>
                    )}
                  </Text>
                )}

                {/* Matched keywords */}
                {listing.matched_keywords?.length > 0 && (
                  <Group spacing={6}>
                    {listing.matched_keywords.map((kw) => (
                      <Badge key={kw} size="sm" variant="light"
                        sx={(theme) => ({
                          backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.15)" : "rgba(196,162,85,0.12)",
                          color: "#c4a255", fontWeight: 400, textTransform: "none",
                        })}
                      >
                        {kw}
                      </Badge>
                    ))}
                  </Group>
                )}

                {/* Price */}
                <Box>
                  <Text size="xs" color="dimmed" mb={2}>
                    {isAuction ? (locale === "zh" ? "当前出价" : "Current Bid") : (locale === "zh" ? "价格" : "Price")}
                  </Text>
                  <Text size={28} weight={700} color="#c4a255">
                    {formatPrice(displayedPrice, listing.currency)}
                  </Text>
                  {isAuction && listing.price && listing.current_bid && (
                    <Text size="xs" color="dimmed" mt={2}>
                      {locale === "zh" ? "一口价" : "Buy It Now"}: {formatPrice(listing.price, listing.currency)}
                    </Text>
                  )}
                  {!isAuction && listing.estimated_available_qty != null && listing.estimated_available_qty > 0 && (
                    <Text size="xs" color="dimmed" mt={2}>
                      {listing.estimated_available_qty} {locale === "zh" ? "件可售" : "available"}
                    </Text>
                  )}
                  {listing.marketing_price?.originalPrice && (
                    <Text size="xs" color="dimmed" mt={2} strikethrough>
                      {locale === "zh" ? "原价" : "Was"}: {formatPrice(parseFloat(listing.marketing_price.originalPrice.value), listing.marketing_price.originalPrice.currency)}
                      {listing.marketing_price.discountPercentage && (
                        <Text component="span" color="green" ml={4} sx={{ textDecoration: "none" }}>
                          -{listing.marketing_price.discountPercentage}%
                        </Text>
                      )}
                    </Text>
                  )}
                  {listing.marketing_price?.discountAmount && (
                    <Text size="xs" color="green" mt={2}>
                      {locale === "zh" ? "省" : "Save"}: {formatPrice(parseFloat(listing.marketing_price.discountAmount.value), listing.marketing_price.discountAmount.currency)}
                    </Text>
                  )}
                  {listing.marketing_price?.priceTreatment && (
                    <Text size="xs" color="dimmed" mt={2}>{listing.marketing_price.priceTreatment}</Text>
                  )}
                  {/* Shipping options */}
                  {(() => {
                    const opts = listing.shipping_options;
                    if (!opts || opts.length === 0) return null;
                    const cheapest = opts.reduce((min: any, s: any) => {
                      const cost = parseFloat(s.shippingCost?.value || "0");
                      const minCost = parseFloat(min?.shippingCost?.value || "999999");
                      return cost < minCost ? s : min;
                    }, null);
                    const serviceLabels: Record<string, string> = {
                      USPSPriority: "USPS Priority", USPSFirstClass: "USPS First Class",
                      FedExHomeDelivery: "FedEx Home", FedExGround: "FedEx Ground",
                      FedEx2Day: "FedEx 2Day", UPSGround: "UPS Ground",
                      UPS2ndDay: "UPS 2nd Day", UPSNextDay: "UPS Next Day",
                      StandardShipping: locale === "zh" ? "标准物流" : "Standard",
                      EconomyShipping: locale === "zh" ? "经济物流" : "Economy",
                      ExpeditedShipping: locale === "zh" ? "加急物流" : "Expedited",
                    };
                    const svcCode = cheapest?.shippingServiceCode || "";
                    const serviceName = serviceLabels[svcCode] || svcCode;
                    const estDelivery = cheapest?.estimatedDeliveryDates;
                    const formatEstDate = (d?: string) => {
                      if (!d) return "";
                      return new Date(d).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
                    };
                    if (cheapest?.shippingCost) {
                      const cost = parseFloat(cheapest.shippingCost.value);
                      const free = cost === 0;
                      return (
                        <Stack spacing={2} mt={2}>
                          <Text size="xs" sx={(theme) => ({ color: free ? theme.colors.green[6] : undefined })}>
                            🚚 {free ? (locale === "zh" ? "免运费" : "Free shipping") : `${locale === "zh" ? "运费" : "Shipping"}: ${formatPrice(cost, cheapest.shippingCost.currency)}`}
                            {serviceName && ` · ${serviceName}`}
                          </Text>
                          {estDelivery?.minDate && (
                            <Text size="xs" color="dimmed">
                              📦 {locale === "zh" ? "预计送达" : "Est. delivery"}: {formatEstDate(estDelivery.minDate)}
                              {estDelivery.maxDate && ` — ${formatEstDate(estDelivery.maxDate)}`}
                            </Text>
                          )}
                        </Stack>
                      );
                    }
                    return null;
                  })()}
                </Box>

                {/* Quick Facts Card */}
                <Box
                  sx={(theme) => ({
                    borderRadius: 4, padding: "14px 18px",
                    background: appSurfaceBackground(theme),
                    border: `1px solid ${appSurfaceBorder(theme)}`,
                  })}
                >
                  <SimpleGrid cols={2} spacing="sm">
                    {listing.condition && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{locale === "zh" ? "品相" : "Condition"}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.condition}</Text>
                      </Box>
                    )}
                    {listing.listing_duration && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{locale === "zh" ? "上架周期" : "Duration"}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.listing_duration}</Text>
                      </Box>
                    )}
                    {listing.watch_count != null && listing.watch_count > 0 && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{locale === "zh" ? "关注人数" : "Watchers"}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>👁 {listing.watch_count}</Text>
                      </Box>
                    )}
                    {listing.item_creation_date && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{locale === "zh" ? "上架时间" : "Listed"}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>
                          {new Date(listing.item_creation_date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </Text>
                      </Box>
                    )}
                    {listing.location && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{locale === "zh" ? "发货地" : "Location"}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.location}</Text>
                      </Box>
                    )}
                    {listing.estimated_sold != null && listing.estimated_sold > 0 && (
                      <Box>
                        <Text size="xs" color="#c4a255" weight={500} mb={2}>{t("marketWatch.estimatedSold")}</Text>
                        <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.estimated_sold}</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                </Box>

                {/* Ornament divider */}
                <Group spacing={8} noWrap>
                  <Box sx={(theme) => ({ flex: 1, height: 1, background: theme.colorScheme === "dark" ? "linear-gradient(90deg, rgba(196,162,85,0.3), rgba(196,162,85,0.05))" : "linear-gradient(90deg, rgba(196,162,85,0.4), rgba(196,162,85,0.05))" })} />
                  <Text size="xs" sx={{ color: "#c4a255", opacity: 0.6 }}>✦</Text>
                  <Box sx={(theme) => ({ flex: 1, height: 1, background: theme.colorScheme === "dark" ? "linear-gradient(270deg, rgba(196,162,85,0.3), rgba(196,162,85,0.05))" : "linear-gradient(270deg, rgba(196,162,85,0.4), rgba(196,162,85,0.05))" })} />
                </Group>

                {/* Auction details */}
                {isAuction && (
                  <Group spacing="lg">
                    {listing.bid_count != null && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "出价次数" : "Bids"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({ color: appTextColor(theme) })}>{listing.bid_count}</Text>
                      </Box>
                    )}
                    {listing.reserve_price_met != null && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "底价" : "Reserve"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({ color: listing.reserve_price_met ? theme.colors.green[6] : theme.colors.red[6] })}>
                          {listing.reserve_price_met ? (locale === "zh" ? "已到" : "Met") : (locale === "zh" ? "未到" : "Not Met")}
                        </Text>
                      </Box>
                    )}
                    {endInfo.text && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "结束时间" : "Ends"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({ color: endInfo.urgent ? theme.colors.red[6] : appTextColor(theme) })}>
                          {endInfo.text}
                        </Text>
                        {listing.ends_at && (
                          <Progress
                            value={(() => {
                              const startDate = listing.item_creation_date || listing.discovered_at;
                              if (!startDate) return 0;
                              const start = new Date(startDate).getTime();
                              const end = new Date(listing.ends_at).getTime();
                              const now = Date.now();
                              if (end <= start) return 100;
                              const pct = ((now - start) / (end - start)) * 100;
                              return Math.min(100, Math.max(0, pct));
                            })()}
                            size="xs"
                            color={endInfo.urgent ? "red" : "yellow"}
                            mt={4}
                            sx={{ maxWidth: 100 }}
                          />
                        )}
                      </Box>
                    )}
                  </Group>
                )}

                {/* Description */}
                {(listing.description || listing.short_description) && (
                  <Box>
                    <Text size="xs" color="dimmed" mb={4}>{t("marketWatch.fullDescription")}</Text>
                    {listing.description ? (
                      <Box
                        sx={(theme) => ({
                          color: appTextColor(theme), lineHeight: 1.7, fontSize: 14,
                          wordBreak: "break-word", overflowWrap: "break-word",
                          maxHeight: 600, overflowY: "auto",
                          border: `1px solid ${appSurfaceBorder(theme)}`,
                          borderRadius: 4, padding: 12,
                          "& *": { maxWidth: "100%" },
                          "& p": { margin: "0 0 0.5em" },
                          "& ul, & ol": { paddingLeft: 20, margin: "0 0 0.5em" },
                          "& img": { maxWidth: "100%", height: "auto" },
                          "& table": { display: "block", maxWidth: "100%", overflowX: "auto" },
                          "& a": { color: "#c4a255" },
                          // Kill all hardcoded background/color from eBay HTML
                          "& *, & td, & th, & tr, & table, & div, & span, & p, & li": {
                            backgroundColor: "transparent !important",
                            background: "none !important",
                          },
                          // Ensure text inherits the container color
                          "& td, & th, & div, & span, & p, & li, & font": {
                            color: `${appTextColor(theme)} !important`,
                          },
                        })}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(listing.description) }}
                      />
                    ) : (
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme), lineHeight: 1.6 })}>
                        {listing.short_description}
                      </Text>
                    )}
                  </Box>
                )}

                {/* Item specifics */}
                {listing.item_specifics && listing.item_specifics.length > 0 && (
                  <Box>
                    <Text size="xs" color="dimmed" mb={6}>{t("marketWatch.itemSpecifics")}</Text>
                    <Table fontSize="sm"
                      sx={(theme) => ({
                        "&": { display: "block", overflowX: "auto" },
                        "& td": { borderBottom: `1px solid ${appSurfaceBorder(theme)}`, padding: "6px 12px", color: appTextColor(theme) },
                        "& td:first-of-type": { width: 140, color: appMutedTextColor(theme), fontWeight: 500, fontSize: 13 },
                      })}
                    >
                      <tbody>
                        {listing.item_specifics.map((spec, i) => (
                          <tr key={i}><td>{spec.name}</td><td>{spec.value}</td></tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                )}

                {/* Meta info */}
                <Group spacing="lg">
                  {listing.condition_description && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "品相详情" : "Condition Details"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.5 })}>
                        {listing.condition_description}
                      </Text>
                    </Box>
                  )}
                  {listing.seller && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "卖家" : "Seller"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>
                        {listing.seller}
                        {listing.seller_rating && ` · ★ ${listing.seller_rating}`}
                      </Text>
                      {listing.feedback_pct && (
                        <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                          {t("marketWatch.feedback")}: {listing.feedback_pct}%
                          {listing.feedback_rating_star && ` · ${listing.feedback_rating_star}`}
                        </Text>
                      )}
                    </Box>
                  )}
                </Group>

                {/* Return policy */}
                <Group spacing="lg">
                  {listing.return_terms?.returnsAccepted != null && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "退货政策" : "Returns"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: listing.return_terms.returnsAccepted ? theme.colors.green[6] : theme.colors.red[6] })}>
                        {listing.return_terms.returnsAccepted
                          ? (() => {
                              const days = listing.return_terms.returnPeriod?.value;
                              const payer = listing.return_terms.returnShippingCostPayer === "SELLER" ? (locale === "zh" ? "卖家付运费" : "seller pays") : "";
                              const refundMethod = listing.return_terms.refundMethod
                                ? (locale === "zh" ? ({"MERCHANDISE_CREDIT": "商品积分退款", "MONEY_BACK": "全额退款", "MONEY_BACK_OR_REPLACEMENT": "退款或换货", "MONEY_BACK_OR_EXCHANGE": "退款或置换"} as Record<string, string>)[listing.return_terms.refundMethod] || listing.return_terms.refundMethod : String(listing.return_terms.refundMethod).replace(/_/g, " "))
                                : "";
                              return (locale === "zh" ? "接受" : "Accepted") + (days ? ` · ${days}${locale === "zh" ? "天" : "d"}` : "") + (payer ? ` · ${payer}` : "") + (refundMethod ? ` · ${refundMethod}` : "");
                            })()
                          : (locale === "zh" ? "不接受" : "Not Accepted")}
                      </Text>
                    </Box>
                  )}
                  {listing.quantity != null && listing.quantity > 1 && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "库存" : "Qty"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.quantity}</Text>
                    </Box>
                  )}
                </Group>

                {/* View on eBay — elegant inline link */}
                <Button
                  component="a" href={listing.listing_url}
                  target="_blank" rel="noopener"
                  variant="subtle"
                  rightIcon={<IconExternalLink size={14} />}
                  size="sm"
                  sx={(theme) => ({
                    color: "#c4a255",
                    alignSelf: "flex-start",
                    "&:hover": { color: "#b8943e", backgroundColor: "rgba(196,162,85,0.08)" },
                  })}
                >
                  {locale === "zh" ? "在 eBay 查看原始商品" : "View original listing on eBay"}
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Price History Section */}
          <Box mt={48}>
            <Title order={4} mb="md" sx={(theme) => ({ color: appTextColor(theme), fontFamily: "inherit" })}>
              {t("marketWatch.priceHistory")}
              {priceTrend && (
                <Text component="span" size="sm" ml={8} color={priceTrend.up ? "green" : "red"} sx={{ fontWeight: 400 }}>
                  {priceTrend.up ? <IconTrendingUp size={16} style={{ verticalAlign: "middle" }} /> : <IconTrendingDown size={16} style={{ verticalAlign: "middle" }} />}
                  {" "}{priceTrend.up ? "+" : "-"}{priceTrend.pct}%
                </Text>
              )}
            </Title>
            {priceHistory.length > 0 ? (
              <Box
                sx={(theme) => ({
                  overflowX: "auto",
                  "& table": { width: "100%", borderCollapse: "collapse", minWidth: 400 },
                  "& th, & td": { padding: "8px 16px", textAlign: "left", borderBottom: `1px solid ${appSurfaceBorder(theme)}`, color: appTextColor(theme), fontSize: 14 },
                  "& th": { color: appMutedTextColor(theme), fontSize: 12, fontWeight: 600, textTransform: "uppercase" },
                })}
              >
                <table>
                  <thead>
                    <tr>
                      <th>{locale === "zh" ? "时间" : "Time"}</th>
                      <th>{locale === "zh" ? "价格" : "Price"}</th>
                      <th>{locale === "zh" ? "当前出价" : "Current Bid"}</th>
                      <th>{locale === "zh" ? "涨跌" : "Trend"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((p, i) => {
                      const prev = priceHistory[i + 1];
                      const curVal = p.current_bid ?? p.price;
                      const prevVal = prev ? (prev.current_bid ?? prev.price) : null;
                      const trend = prevVal != null && curVal != null
                        ? (curVal > prevVal ? "up" : curVal < prevVal ? "down" : null)
                        : null;
                      return (
                        <tr key={i}>
                          <td>{new Date(p.recorded_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                          <td>{p.price != null ? formatPrice(p.price, p.currency) : "—"}</td>
                          <td>{p.current_bid != null ? formatPrice(p.current_bid, p.currency) : "—"}</td>
                          <td>
                            {trend === "up" ? <Text component="span" color="green" size="xs">↑</Text>
                              : trend === "down" ? <Text component="span" color="red" size="xs">↓</Text>
                              : <Text component="span" color="dimmed" size="xs">—</Text>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Text size="sm" color="dimmed">{t("marketWatch.noPriceHistory")}</Text>
            )}
          </Box>

          {/* Related Items Section */}
          {relatedListings.length > 0 && (
            <Box mt={64}>
              <Group spacing={8} mb="lg" noWrap>
                <Box sx={(theme) => ({ flex: 1, height: 1, background: theme.colorScheme === "dark" ? "linear-gradient(90deg, rgba(196,162,85,0.3), rgba(196,162,85,0.05))" : "linear-gradient(90deg, rgba(196,162,85,0.4), rgba(196,162,85,0.05))" })} />
                <Text size="sm" sx={{ color: "#c4a255", whiteSpace: "nowrap" }}>
                  ✦ {locale === "zh" ? "同类推荐" : "Similar Items"} ✦
                </Text>
                <Box sx={(theme) => ({ flex: 1, height: 1, background: theme.colorScheme === "dark" ? "linear-gradient(270deg, rgba(196,162,85,0.3), rgba(196,162,85,0.05))" : "linear-gradient(270deg, rgba(196,162,85,0.4), rgba(196,162,85,0.05))" })} />
              </Group>
              <SimpleGrid
                cols={3} spacing="lg"
                breakpoints={[
                  { maxWidth: "md", cols: 2, spacing: "sm" },
                  { maxWidth: "sm", cols: 1, spacing: "sm" },
                ]}
              >
                {relatedListings.map((related) => {
                  const isRelatedAuction = related.buying_options?.includes("AUCTION");
                  const rEndInfo = formatEndsAt(related.ends_at);
                  const relatedImg = related.images?.[0]
                    ? ebayFullResUrl(related.images[0].url)
                    : null;
                  return (
                  <Anchor key={related.id} component={Link} href={`/market-watch/${related.id}`} underline={false}>
                    <Box
                      sx={(theme) => ({
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: 12,
                        overflow: "hidden",
                        transition: "border-color 0.25s, transform 0.25s",
                        "&:hover": {
                          borderColor: "rgba(196,162,85,0.25)",
                          transform: "translateY(-3px)",
                        },
                      })}
                    >
                      {/* Image */}
                      <Box
                        sx={{
                          height: 200,
                          background: relatedImg
                            ? `url(${relatedImg}) center/cover`
                            : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                          backgroundPosition: relatedImg ? "center 15%" : undefined,
                          position: "relative",
                          borderRadius: "12px 12px 0 0",
                        }}
                      >
                        {/* Badges */}
                        <Group spacing={6} sx={{ position: "absolute", top: 8, left: 8 }}>
                          {isRelatedAuction && (
                            <Badge size="sm" variant="filled" color="red" sx={{ fontWeight: 400 }}>AUCTION</Badge>
                          )}
                          {related.buying_options?.includes("FIXED_PRICE") && (
                            <Badge size="sm" variant="filled" color="green" sx={{ fontWeight: 400 }}>BUY NOW</Badge>
                          )}
                        </Group>
                        {rEndInfo.text && (
                          <Badge
                            size="xs" variant="filled"
                            sx={{
                              position: "absolute", bottom: 8, right: 8,
                              backgroundColor: rEndInfo.urgent ? "rgba(231,76,60,0.85)" : "rgba(0,0,0,0.6)",
                              color: "#fff", fontWeight: 400,
                            }}
                          >
                            {rEndInfo.text}
                          </Badge>
                        )}
                      </Box>
                      {/* Info */}
                      <Box p="sm">
                        <Text size="sm" weight={500} lineClamp={2}
                          sx={(theme) => ({ color: appTextColor(theme), lineHeight: 1.35, minHeight: 36 })}
                        >
                          {related.title}
                        </Text>
                        {related.matched_keywords?.length > 0 && (
                          <Group spacing={4} mt={6}>
                            {related.matched_keywords.slice(0, 3).map((kw) => (
                              <Badge key={kw} size="xs" variant="light"
                                sx={(theme) => ({
                                  backgroundColor: theme.colorScheme === "dark"
                                    ? "rgba(196,162,85,0.15)" : "rgba(196,162,85,0.12)",
                                  color: "#c4a255", fontWeight: 400, textTransform: "none",
                                })}
                              >
                                {kw}
                              </Badge>
                            ))}
                          </Group>
                        )}
                        <Group position="apart" mt={related.matched_keywords?.length ? 8 : 12}>
                          <Text size="md" weight={600} color="#c4a255">
                            {formatPrice(
                              isRelatedAuction && related.current_bid ? related.current_bid : related.price,
                              related.currency
                            )}
                          </Text>
                          {related.seller && (
                            <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                              {related.seller.length > 20 ? related.seller.slice(0, 18) + "…" : related.seller}
                            </Text>
                          )}
                        </Group>
                      </Box>
                    </Box>
                  </Anchor>
                  );
                })}
              </SimpleGrid>
            </Box>
          )}
        </Container>
      </Wrapper>
    </>
  );
}
