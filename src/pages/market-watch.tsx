import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Group,
  NumberInput,
  Pagination,
  Progress,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Badge,
  SegmentedControl,
  Switch,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconHeart, IconHeartFilled, IconArrowBack, IconSearchOff } from "@tabler/icons-react";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { appMutedTextColor, appSurfaceBackground, appSurfaceBorder, appTextColor } from "@/components/artworkStyles";

interface Listing {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  current_bid: number | null;
  bid_count: number | null;
  reserve_price_met: boolean | null;
  images: { url: string }[];
  extra_images?: { url: string }[];
  listing_url: string;
  seller: string | null;
  seller_rating: number | null;
  condition: string | null;
  location: string | null;
  discovered_at: string;
  ends_at: string | null;
  item_creation_date?: string | null;
  matched_keywords: string[];
  buying_options: string[];
  short_description?: string;
  watch_count?: number | null;
  estimated_sold?: number | null;
  return_terms?: any;
  is_saved?: boolean;
}

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const formatPrice = (price: number | null, currency: string) => {
  if (price == null) return "";
  const a = Math.round(price);
  return currency === "CNY"
    ? `¥${a.toLocaleString()}`
    : `$${a.toLocaleString()}`;
};

const formatEndsAt = (endsAt: string | null): { text: string; urgent: boolean; progress: number } => {
  if (!endsAt) return { text: "", urgent: false, progress: 0 };
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Ended", urgent: true, progress: 100 };
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const diffD = Math.floor(diffH / 24);

  // Calculate progress: how much of the listing duration has elapsed
  // If we have creation date, use it; otherwise estimate based on end date
  let text = "";
  if (diffD > 0) text = `Ends in ${diffD}d ${diffH % 24}h`;
  else if (diffH > 0) text = `Ends in ${diffH}h ${diffM}m`;
  else text = `Ends in ${diffM}m`;
  const urgent = diffD <= 1;

  return { text, urgent, progress: 0 };
};

export default function MarketWatchPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const isTablet = useMediaQuery("(max-width: 960px)");
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [jumpValue, setJumpValue] = useState<number | ''>('');
  const gridRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [page]);

  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [buyingOptionFilter, setBuyingOptionFilter] = useState("");
  const [endingSoonFilter, setEndingSoonFilter] = useState("");
  const [returnsFilter, setReturnsFilter] = useState("");
  const [minFeedbackFilter, setMinFeedbackFilter] = useState("");
  const [newOnly, setNewOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const hasActiveFilters = !!(search || minPrice || maxPrice || locationFilter || conditionFilter || buyingOptionFilter || endingSoonFilter || returnsFilter || minFeedbackFilter);

  const clearFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setLocationFilter("");
    setRegionFilter("");
    setConditionFilter("");
    setBuyingOptionFilter("");
    setEndingSoonFilter("");
    setReturnsFilter("");
    setMinFeedbackFilter("");
    setPage(1);
  };

  const fetchListings = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("sort", sort);
    if (search) params.set("search", search);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (locationFilter) params.set("location", locationFilter);
    if (locationFilter === "United States" && regionFilter) params.set("location_region", regionFilter);
    if (conditionFilter) params.set("condition", conditionFilter);
    if (buyingOptionFilter) params.set("buying_option", buyingOptionFilter);
    if (endingSoonFilter) params.set("ending_soon", endingSoonFilter);
    if (returnsFilter) params.set("returns_accepted", returnsFilter);
    if (minFeedbackFilter) params.set("min_seller_rating", minFeedbackFilter);

    // Auth + saved filter
    const headers: Record<string, string> = {};
    if (user) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.access_token) {
          headers["Authorization"] = `Bearer ${session.session.access_token}`;
        }
      } catch (_) {}
    }
    if (savedOnly) {
      params.set("saved_only", "true");
    } else {
      params.set("with_saved", "true");
    }

    try {
      const res = await fetch(`/api/external/listings?${params}`, { headers, signal: controller.signal });
      if (!res.ok) return setLoading(false);
      const data: ListingsResponse = await res.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch listings:", err);
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, minPrice, maxPrice, locationFilter, regionFilter, conditionFilter, buyingOptionFilter, endingSoonFilter, returnsFilter, minFeedbackFilter, savedOnly, user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const toggleSave = async (listingId: string, currentlySaved: boolean) => {
    if (!user) return;
    const newSaved = new Set(savedIds);
    if (currentlySaved) {
      newSaved.delete(listingId);
    } else {
      newSaved.add(listingId);
    }
    setSavedIds(newSaved);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, is_saved: !currentlySaved } : l))
    );

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return;
      await fetch("/api/external/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: listingId,
          action: currentlySaved ? "unsave" : "save",
        }),
      });
    } catch (_) {}
  };

  // Skeleton cards for loading state
  const skeletonCards = Array.from({ length: 6 }, (_, i) => (
    <Box key={i} sx={{ borderRadius: 12, overflow: "hidden" }}>
      <Skeleton height={220} radius={0} />
      <Box p="sm">
        <Skeleton height={18} mb={8} />
        <Skeleton height={14} width="60%" mb={12} />
        <Group position="apart">
          <Skeleton height={20} width={80} />
          <Skeleton height={16} width={50} />
        </Group>
      </Box>
    </Box>
  ));

  return (
    <>
      <Head>
        <title>Market Watch — Eastwood Auction</title>
        <meta name="description" content="Monitor antique market listings and price trends. Track comparable items from major auction platforms with Eastwood Auction's market watch tool." />
        <meta property="og:title" content="Market Watch — Eastwood Auction" />
        <meta property="og:description" content="Monitor antique market listings and price trends. Track comparable items from major auction platforms." />
        {locale === "zh" && (
          <>
            <script
              src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
              async
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  function googleTranslateElementInit() {
                    new google.translate.TranslateElement(
                      { pageLanguage: 'en', includedLanguages: 'en,zh-CN', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
                      'google_translate_element'
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
          <Stack spacing="xl">
            {/* Header */}
            <Box>
              <Text size="sm" color="dimmed" mb={4}>
                {locale === "zh" ? "市场监控" : "MARKET WATCH"}
              </Text>
              <Title order={2}>
                {locale === "zh" ? "外部市场发现" : "External Market Discoveries"}
              </Title>
              <Text size="sm" color="dimmed" mt={8}>
                {locale === "zh"
                  ? `共 ${total} 条来自 eBay 的古董商品，按预设规则自动匹配`
                  : `${total} antique listings from eBay, matched by preset rules`}
              </Text>
              {locale === "zh" && (
                <Box mt={12}>
                  <Group spacing="sm" align="center">
                    <div id="google_translate_element" />
                    <Button
                      variant="outline"
                      size="xs"
                      leftIcon={<IconArrowBack size={14} />}
                      onClick={() => {
                        document.cookie = "googtrans=/en/en;path=/;max-age=0";
                        document.cookie = "googtrans=/en/en;path=/";
                        window.location.reload();
                      }}
                      sx={(theme) => ({
                        borderColor: theme.colorScheme === "dark"
                          ? "rgba(196,162,85,0.3)"
                          : "rgba(180,158,120,0.3)",
                        color: theme.colorScheme === "dark"
                          ? theme.colors.dark[9]
                          : theme.colors.dark[0],
                        "&:hover": { borderColor: "#c4a255", color: "#c4a255" },
                      })}
                    >
                      恢复原文
                    </Button>
                  </Group>
                  <Text size="xs" color="dimmed" mt={6} lh={1.5}>
                    点击下拉菜单选择翻译语言，或点击「恢复原文」按钮取消翻译
                  </Text>
                  <Text size="xs" mt={4} sx={(theme) => ({ color: appMutedTextColor(theme), opacity: 0.55, lineHeight: 1.5 })}>
                    {locale === "zh"
                      ? "⚠️ 翻译由 Google 第三方提供，可能存在误翻或滞后。商品描述、属性、退货政策等关键信息请以英文原文为准。"
                      : "⚠️ Translation powered by Google. Errors may occur. Refer to the original English listing for accurate item details, policies, and descriptions."}
                  </Text>
                </Box>
              )}
            </Box>

            {/* All / Saved / New toggle */}
            <Group spacing="sm">
              {user && (
                <SegmentedControl
                  value={savedOnly ? "saved" : "all"}
                  onChange={(v) => { setSavedOnly(v === "saved"); setPage(1); }}
                  size="sm"
                  data={[
                    { value: "all", label: t("marketWatch.allListings") },
                    { value: "saved", label: t("marketWatch.savedFilter") },
                  ]}
                />
              )}
              <Switch
                size="sm"
                label={locale === "zh" ? "只看新发现" : "New only"}
                checked={newOnly}
                onChange={(e) => { setNewOnly(e.currentTarget.checked); setPage(1); }}
                styles={(theme) => ({
                  label: {
                    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                    fontSize: 13,
                  },
                })}
              />
            </Group>

            {/* Filters — Row 1: key filters */}
            <Group spacing="sm" noWrap={!isMobile}>
              <TextInput
                placeholder={locale === "zh" ? "搜索..." : "Search..."}
                value={search}
                onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                size="sm"
                style={{ flex: 1, maxWidth: 240 }}
              />
              <TextInput
                placeholder={locale === "zh" ? "最低价" : "Min price"}
                value={minPrice}
                onChange={(e) => { setMinPrice(e.currentTarget.value); setPage(1); }}
                size="sm"
                style={{ width: 100 }}
              />
              <TextInput
                placeholder={locale === "zh" ? "最高价" : "Max price"}
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.currentTarget.value); setPage(1); }}
                size="sm"
                style={{ width: 100 }}
              />
              <Select
                placeholder={locale === "zh" ? "品相" : "Condition"}
                value={conditionFilter}
                onChange={(v) => { setConditionFilter(v || ""); setPage(1); }}
                size="sm"
                style={{ width: 110 }}
                clearable
                data={[
                  { value: "", label: locale === "zh" ? "全部品相" : "All" },
                  { value: "NEW", label: locale === "zh" ? "全新" : "New" },
                  { value: "USED", label: locale === "zh" ? "二手" : "Used" },
                  { value: "PARTS", label: locale === "zh" ? "零件" : "Parts" },
                  { value: "SELLER_REFURBISHED", label: locale === "zh" ? "翻新" : "Refurbished" },
                ]}
              />
              <Select
                placeholder={locale === "zh" ? "类型" : "Type"}
                value={buyingOptionFilter}
                onChange={(v) => { setBuyingOptionFilter(v || ""); setPage(1); }}
                size="sm"
                style={{ width: 110 }}
                clearable
                data={[
                  { value: "", label: locale === "zh" ? "全部类型" : "All" },
                  { value: "AUCTION", label: locale === "zh" ? "拍卖" : "Auction" },
                  { value: "FIXED_PRICE", label: locale === "zh" ? "直购" : "Buy Now" },
                  { value: "BEST_OFFER", label: locale === "zh" ? "议价" : "Best Offer" },
                ]}
              />
              <Select
                value={sort}
                onChange={(v) => { setSort(v || "newest"); setPage(1); }}
                size="sm"
                style={{ width: 130 }}
                data={[
                  { value: "newest", label: locale === "zh" ? "最新" : "Newest" },
                  { value: "price_asc", label: locale === "zh" ? "价格↑" : "Price ↑" },
                  { value: "price_desc", label: locale === "zh" ? "价格↓" : "Price ↓" },
                ]}
              />
            </Group>

            {/* Filters — Row 2: advanced (collapsible on mobile) */}
            {(!isTablet || showMoreFilters) && (
              <Group spacing="sm" noWrap={!isMobile}>
                <Select
                  placeholder={locale === "zh" ? "地区" : "Location"}
                  value={locationFilter}
                  onChange={(v) => { setLocationFilter(v || ""); setRegionFilter(""); setPage(1); }}
                  size="sm"
                  style={{ width: 140 }}
                  clearable
                  data={[
                    { value: "", label: locale === "zh" ? "全部地区" : "All" },
                    { value: "United States", label: "🇺🇸 US" },
                    { value: "China", label: "🇨🇳 China" },
                    { value: "Hong Kong", label: "🇭🇰 Hong Kong" },
                    { value: "Japan", label: "🇯🇵 Japan" },
                    { value: "United Kingdom", label: "🇬🇧 UK" },
                    { value: "Canada", label: "🇨🇦 Canada" },
                    { value: "Australia", label: "🇦🇺 Australia" },
                    { value: "France", label: "🇫🇷 France" },
                    { value: "Germany", label: "🇩🇪 Germany" },
                    { value: "Italy", label: "🇮🇹 Italy" },
                  ]}
                />
                {locationFilter === "United States" && (
                  <Select
                    placeholder={locale === "zh" ? "州" : "State"}
                    value={regionFilter}
                    onChange={(v) => { setRegionFilter(v || ""); setPage(1); }}
                    size="sm"
                    style={{ width: 120 }}
                    clearable
                    data={[
                      { value: "", label: locale === "zh" ? "全部州" : "All" },
                      { value: "CA", label: "California" },
                      { value: "NY", label: "New York" },
                      { value: "TX", label: "Texas" },
                      { value: "FL", label: "Florida" },
                      { value: "IL", label: "Illinois" },
                      { value: "PA", label: "Pennsylvania" },
                      { value: "OH", label: "Ohio" },
                      { value: "GA", label: "Georgia" },
                      { value: "NC", label: "North Carolina" },
                      { value: "MI", label: "Michigan" },
                      { value: "NJ", label: "New Jersey" },
                      { value: "VA", label: "Virginia" },
                      { value: "WA", label: "Washington" },
                      { value: "MA", label: "Massachusetts" },
                      { value: "AZ", label: "Arizona" },
                    ]}
                  />
                )}
                <Select
                  placeholder={locale === "zh" ? "结束时间" : "Ending"}
                  value={endingSoonFilter}
                  onChange={(v) => { setEndingSoonFilter(v || ""); setPage(1); }}
                  size="sm"
                  style={{ width: 120 }}
                  clearable
                  data={[
                    { value: "", label: locale === "zh" ? "全部时间" : "Any" },
                    { value: "1h", label: locale === "zh" ? "1小时内" : "Within 1h" },
                    { value: "24h", label: locale === "zh" ? "24小时内" : "Within 24h" },
                    { value: "3d", label: locale === "zh" ? "3天内" : "Within 3d" },
                  ]}
                />
                <Select
                  placeholder={locale === "zh" ? "退货" : "Returns"}
                  value={returnsFilter}
                  onChange={(v) => { setReturnsFilter(v || ""); setPage(1); }}
                  size="sm"
                  style={{ width: 110 }}
                  clearable
                  data={[
                    { value: "", label: locale === "zh" ? "全部" : "All" },
                    { value: "true", label: locale === "zh" ? "✅ 可退" : "✅ Accepted" },
                    { value: "false", label: locale === "zh" ? "❌ 不可退" : "❌ No" },
                  ]}
                />
                <Select
                  placeholder={locale === "zh" ? "卖家信誉" : "Rating"}
                  value={minFeedbackFilter}
                  onChange={(v) => { setMinFeedbackFilter(v || ""); setPage(1); }}
                  size="sm"
                  style={{ width: 130 }}
                  clearable
                  data={[
                    { value: "", label: locale === "zh" ? "全部信誉" : "Any rating" },
                    { value: "10", label: locale === "zh" ? "★ 10+" : "★ 10+" },
                    { value: "50", label: locale === "zh" ? "★ 50+" : "★ 50+" },
                    { value: "100", label: locale === "zh" ? "★ 100+" : "★ 100+" },
                    { value: "500", label: locale === "zh" ? "★ 500+" : "★ 500+" },
                    { value: "1000", label: locale === "zh" ? "★ 1000+" : "★ 1000+" },
                    { value: "5000", label: locale === "zh" ? "★ 5000+" : "★ 5000+" },
                  ]}
                />
                {hasActiveFilters && (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={clearFilters}
                    sx={(theme) => ({
                      color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                      "&:hover": { color: "#c4a255" },
                    })}
                  >
                    {locale === "zh" ? "清除筛选" : "Clear"}
                  </Button>
                )}
              </Group>
            )}

            {/* Toggle more filters button (tablet/mobile) */}
            {isTablet && (
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  alignSelf: "flex-start",
                })}
              >
                {showMoreFilters
                  ? (locale === "zh" ? "收起筛选 ▲" : "Less filters ▲")
                  : (locale === "zh" ? "更多筛选 ▼" : "More filters ▼")}
              </Button>
            )}

            {/* Grid */}
            {loading ? (
              <SimpleGrid
                cols={3}
                spacing="lg"
                breakpoints={[
                  { maxWidth: "md", cols: 2, spacing: "sm" },
                  { maxWidth: "sm", cols: 1, spacing: "sm" },
                ]}
              >
                {skeletonCards}
              </SimpleGrid>
            ) : listings.length === 0 ? (
              <Center py={80}>
                <Stack align="center" spacing="md">
                  <IconSearchOff size={48} style={{ opacity: 0.3 }} />
                  <Text size="lg" color="dimmed" align="center">
                    {locale === "zh" ? "暂无匹配结果" : "No matching listings"}
                  </Text>
                  <Text size="sm" color="dimmed" align="center" maw={400}>
                    {savedOnly
                      ? (!user
                        ? (locale === "zh" ? "请登录后查看收藏" : "Log in to view your saved items")
                        : (locale === "zh" ? "你还没有收藏任何商品。浏览时点击 ❤️ 即可收藏。" : "You haven't saved any items yet. Click ❤️ while browsing to save."))
                      : hasActiveFilters
                        ? (locale === "zh" ? "尝试调整或清除筛选条件" : "Try adjusting or clearing your filters")
                        : (locale === "zh" ? "请先在管理后台配置监控规则并执行同步" : "Configure monitoring rules in the admin panel and run a sync first")}
                  </Text>
                  {savedOnly ? (
                    !user ? (
                      <Button component={Link} href="/login" variant="subtle">
                        {locale === "zh" ? "去登录 →" : "Log in →"}
                      </Button>
                    ) : null
                  ) : hasActiveFilters ? (
                    <Button variant="subtle" onClick={clearFilters}>
                      {locale === "zh" ? "清除所有筛选" : "Clear all filters"}
                    </Button>
                  ) : (
                    user && (
                      <Button component={Link} href="/admin" variant="subtle">
                        {locale === "zh" ? "前往管理后台 →" : "Go to Admin →"}
                      </Button>
                    )
                  )}
                </Stack>
              </Center>
            ) : (
              <Box ref={gridRef}>
              <SimpleGrid
                cols={3}
                spacing="lg"
                breakpoints={[
                  { maxWidth: "md", cols: 2, spacing: "sm" },
                  { maxWidth: "sm", cols: 1, spacing: "sm" },
                ]}
              >
                {listings
                  .filter((item) => {
                    if (!newOnly) return true;
                    const discovered = new Date(item.discovered_at).getTime();
                    return (Date.now() - discovered) / 3600000 <= 24;
                  })
                  .map((item) => {
                    const endInfo = formatEndsAt(item.ends_at);
                    const isAuction = item.buying_options?.includes("AUCTION");
                    const isFixedPrice = item.buying_options?.includes("FIXED_PRICE");
                    const isBestOffer = item.buying_options?.includes("BEST_OFFER");
                    const returnsAccepted = item.return_terms?.returnsAccepted;
                    return (
                  <Anchor
                    key={item.id}
                    component={Link}
                    href={`/market-watch/${item.id}`}
                    underline={false}
                    sx={{ display: "block", textDecoration: "none" }}
                  >
                    <Box
                      sx={(theme) => ({
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: isMobile ? 10 : 12,
                        overflow: "hidden",
                        boxShadow: "none",
                        transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          borderColor: "rgba(196,162,85,0.25)",
                          boxShadow: theme.colorScheme === "dark"
                            ? "0 8px 24px rgba(0,0,0,0.30)"
                            : "0 4px 16px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.04)",
                        },
                      })}
                    >
                      {/* Image */}
                      <Box
                        sx={(theme) => ({
                          height: 220,
                          background: item.images?.[0]
                            ? `url(${item.images[0].url}) center/cover`
                            : theme.colorScheme === "dark"
                              ? "linear-gradient(180deg, #2a2620, #1f1c17)"
                              : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                          backgroundPosition: item.images?.[0] ? "center 15%" : undefined,
                          position: "relative",
                          borderRadius: isMobile ? "10px 10px 0 0" : "12px 12px 0 0",
                        })}
                      >
                        <Group spacing={6} sx={{ position: "absolute", top: 8, left: 8 }}>
                          <Badge size="sm" variant="light" color="blue" sx={{ fontWeight: 500 }}>
                            eBay
                          </Badge>
                          {isAuction && (
                            <Badge size="sm" variant="light" color="red" sx={{ fontWeight: 500 }}>
                              {locale === "zh" ? "拍卖" : "AUCTION"}
                            </Badge>
                          )}
                          {isFixedPrice && (
                            <Badge size="sm" variant="light" color="green" sx={{ fontWeight: 500 }}>
                              {locale === "zh" ? "直购" : "BUY NOW"}
                            </Badge>
                          )}
                          {isBestOffer && (
                            <Badge size="sm" variant="light" color="orange" sx={{ fontWeight: 500 }}>
                              {locale === "zh" ? "议价" : "OFFER"}
                            </Badge>
                          )}
                          {item.watch_count != null && item.watch_count > 0 && (
                            <Badge size="sm" variant="light" sx={{ fontWeight: 400, backgroundColor: "rgba(139,119,101,0.18)", color: "#a09080" }}>
                              👁 {item.watch_count}
                            </Badge>
                          )}
                          {/* NEW badge: discovered within 24 hours */}
                          {(() => {
                            const discovered = new Date(item.discovered_at).getTime();
                            const hoursAgo = (Date.now() - discovered) / 3600000;
                            if (hoursAgo <= 24) {
                              return (
                                <Badge size="sm" variant="light" sx={{ fontWeight: 500, backgroundColor: "rgba(196,162,85,0.18)", color: "#c4a255" }}>
                                  {locale === "zh" ? "新发现" : "NEW"}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </Group>
                        {/* Save button — wrapper stops propagation even when disabled */}
                        <Box
                          onClick={(e) => e.stopPropagation()}
                          sx={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
                        >
                        <Tooltip
                          label={user ? "" : t("marketWatch.loginToSave")}
                          disabled={!!user}
                        >
                          <ActionIcon
                            variant="filled"
                            size="md"
                            radius="xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(item.id, item.is_saved || false);
                            }}
                            disabled={!user}
                            sx={(theme) => ({
                              backgroundColor: item.is_saved
                                ? "rgba(231,76,60,0.85)"
                                : theme.colorScheme === "dark"
                                  ? "rgba(255,255,255,0.15)"
                                  : "rgba(0,0,0,0.4)",
                              color: "#fff",
                              "&:hover": {
                                backgroundColor: item.is_saved
                                  ? "rgba(231,76,60,0.95)"
                                  : theme.colorScheme === "dark"
                                    ? "rgba(255,255,255,0.22)"
                                    : "rgba(0,0,0,0.6)",
                              },
                            })}
                          >
                            {item.is_saved ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        </Box>
                        {/* Image count badge */}
                        {(() => {
                          const totalImgs = (item.images?.length || 0) + (item.extra_images?.length || 0);
                          if (totalImgs > 1) {
                            return (
                              <Badge
                                size="xs" variant="filled"
                                sx={{
                                  position: "absolute", bottom: 8, left: 8,
                                  backgroundColor: "rgba(139,119,101,0.6)", color: "#fff",
                                  fontWeight: 400, fontSize: 11,
                                }}
                              >
                                📷 {totalImgs}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </Box>

                      {/* Info */}
                      <Box p="sm">
                        {/* Title */}
                        <Text
                          size="sm" weight={500} lineClamp={2}
                          sx={(theme) => ({
                            fontFamily: "inherit", lineHeight: 1.35,
                            minHeight: 36, color: appTextColor(theme),
                          })}
                        >
                          {item.title}
                        </Text>

                        {/* Matched keywords */}
                        {item.matched_keywords?.length > 0 && (
                          <Group spacing={4} mt={6}>
                            {item.matched_keywords.map((kw) => (
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

                        {/* Price + Condition */}
                        <Group position="apart" mt={item.matched_keywords?.length ? 8 : 12}>
                          <Group spacing={6}>
                            <Text size="md" weight={600} color="#c4a255">
                              {isAuction && item.current_bid
                                ? formatPrice(item.current_bid, item.currency)
                                : formatPrice(item.price, item.currency)}
                            </Text>
                            {isAuction && item.current_bid && item.price && item.current_bid !== item.price && (
                              <Text size="xs" color="dimmed" strikethrough>
                                {formatPrice(item.price, item.currency)}
                              </Text>
                            )}
                          </Group>
                          <Group spacing={4}>
                            {isAuction && item.bid_count != null && item.bid_count > 0 && (
                              <Badge size="xs" variant="light" color="yellow">
                                {item.bid_count} {locale === "zh" ? "次出价" : "bids"}
                              </Badge>
                            )}
                            {item.estimated_sold != null && item.estimated_sold > 0 && (
                              <Badge size="xs" variant="light" color="violet.4">
                                {item.estimated_sold} {locale === "zh" ? "已售" : "sold"}
                              </Badge>
                            )}
                            {item.condition && (
                              <Badge size="xs" variant="light"
                                sx={(theme) => ({
                                  backgroundColor: theme.colorScheme === "dark"
                                    ? "rgba(196,162,85,0.15)"
                                    : "rgba(196,162,85,0.18)",
                                  color: theme.colorScheme === "dark" ? "#e6e2db" : "#5a4a2a",
                                  border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.18)" : "rgba(196,162,85,0.28)"}`,
                                  fontWeight: 500,
                                })}
                              >
                                {item.condition}
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {/* Reserve not met */}
                        {isAuction && item.reserve_price_met === false && (
                          <Text size="xs" mt={4} color="red">
                            {locale === "zh" ? "⚠️ 未达底价" : "⚠️ Reserve not met"}
                          </Text>
                        )}

                        {/* Short description */}
                        {item.short_description && (
                          <Text size="xs" mt={4} lineClamp={2}
                            sx={(theme) => ({
                              color: appMutedTextColor(theme), fontStyle: "italic", lineHeight: 1.4,
                            })}
                          >
                            {item.short_description}
                          </Text>
                        )}

                        {/* Ends at countdown + progress bar */}
                        {endInfo.text && (
                          <Box mt={6}>
                            <Text size="xs" mb={2}
                              sx={(theme) => ({
                                color: endInfo.urgent ? theme.colors.red[6] : appMutedTextColor(theme),
                                fontWeight: endInfo.urgent ? 500 : 400,
                              })}
                            >
                              ⏰ {endInfo.text}
                            </Text>
                            {item.ends_at && (
                              <Progress
                                value={(() => {
                                  const startDate = item.item_creation_date || item.discovered_at;
                                  if (!startDate) return 0;
                                  const start = new Date(startDate).getTime();
                                  const end = new Date(item.ends_at).getTime();
                                  const now = Date.now();
                                  if (end <= start) return 100;
                                  const pct = ((now - start) / (end - start)) * 100;
                                  return Math.min(100, Math.max(0, pct));
                                })()}
                                size="xs"
                                color={endInfo.urgent ? "red" : "yellow"}
                                sx={{ maxWidth: 120 }}
                              />
                            )}
                          </Box>
                        )}

                        {/* Location + Returns */}
                        <Group spacing={6} mt={4}>
                          {item.location && (
                            <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                              📍 {item.location}
                            </Text>
                          )}
                          {returnsAccepted && (
                            <Text size="xs" color="green">
                              ✅ {locale === "zh" ? "可退" : "Returns"}
                            </Text>
                          )}
                        </Group>
                        {/* Seller — always on its own line, never wraps with location */}
                        {item.seller && (
                          <Text size="xs" mt={2} sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                            🏪 {item.seller}
                            {item.seller_rating && ` · ★ ${item.seller_rating}`}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  </Anchor>
                    );
                })}
              </SimpleGrid>
              </Box>
            )}

            {/* Pagination */}
            {total > 15 && (
              <Group position="center" mt="md" spacing="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.ceil(total / 15)}
                  size="sm"
                  radius="md"
                  styles={(theme) => ({
                    control: {
                      borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.15)" : "rgba(180,158,120,0.2)",
                      color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                      "&[data-active]": { background: "#c4a255", borderColor: "#c4a255", color: "#fff" },
                    },
                  })}
                />
                <NumberInput
                  value={jumpValue}
                  onChange={setJumpValue}
                  placeholder={String(page)}
                  min={1} max={Math.ceil(total / 15)}
                  size="sm"
                  styles={{ input: { width: 60, textAlign: "center" } }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= Math.ceil(total / 15)) {
                      setPage(jumpValue); setJumpValue('');
                    }
                  }}
                  rightSection={
                    <Text size="xs" color="dimmed" sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        if (typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= Math.ceil(total / 15)) {
                          setPage(jumpValue); setJumpValue('');
                        }
                      }}>→</Text>
                  }
                />
                <Text size="xs" color="dimmed">
                  / {Math.ceil(total / 15)} {locale === "zh" ? "页" : "pages"}
                </Text>
              </Group>
            )}
          </Stack>
        </Container>
      </Wrapper>
    </>
  );
}
