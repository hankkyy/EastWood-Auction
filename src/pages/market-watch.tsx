import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Anchor,
  Box,
  Container,
  Group,
  NumberInput,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Badge,
  SegmentedControl,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
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
  matched_keywords: string[];
  buying_options: string[];
  short_description?: string;
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

export default function MarketWatchPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [jumpValue, setJumpValue] = useState<number | ''>('');
  const gridRef = useRef<HTMLDivElement>(null);

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

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("sort", sort);
    if (search) params.set("search", search);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (locationFilter) params.set("location", locationFilter);
    if (regionFilter) params.set("location_region", regionFilter);

    // Auth + saved filter
    const headers: Record<string, string> = {};
    if (user) {
      try {
        const { supabase } = await import("@/lib/supabase/client");
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

    const res = await fetch(`/api/external/listings?${params}`, { headers });
    if (!res.ok) return setLoading(false);
    const data: ListingsResponse = await res.json();
    setListings(data.listings);
    setTotal(data.total);
    setLoading(false);
  }, [page, sort, search, minPrice, maxPrice, locationFilter, regionFilter, savedOnly, user]);

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
      const { supabase } = await import("@/lib/supabase/client");
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

  return (
    <>
      <Head>
        <title>Market Watch — Eastwood Auction</title>
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
                      { pageLanguage: 'en', includedLanguages: 'zh-CN', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
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
                  <div id="google_translate_element" />
                  <Text size="xs" color="dimmed" mt={4}>
                    点击上方下拉菜单选择「English」即可恢复原文
                  </Text>
                </Box>
              )}
            </Box>

            {/* All / Saved toggle */}
            {user && (
              <SegmentedControl
                value={savedOnly ? "saved" : "all"}
                onChange={(v) => { setSavedOnly(v === "saved"); setPage(1); }}
                size="sm"
                data={[
                  { value: "all", label: t("marketWatch.allListings") },
                  { value: "saved", label: `❤️ ${t("marketWatch.savedFilter")}` },
                ]}
              />
            )}

            {/* Filters */}
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
                placeholder={locale === "zh" ? "地区" : "Location"}
                value={locationFilter}
                onChange={(v) => { setLocationFilter(v || ""); setRegionFilter(""); setPage(1); }}
                size="sm"
                style={{ width: 130 }}
                clearable
                data={[
                  { value: "", label: locale === "zh" ? "全部地区" : "All Locations" },
                  { value: "United States", label: "🇺🇸 United States" },
                  { value: "China", label: "🇨🇳 China" },
                  { value: "Hong Kong", label: "🇭🇰 Hong Kong" },
                  { value: "Japan", label: "🇯🇵 Japan" },
                  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
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
                    { value: "", label: locale === "zh" ? "全部州" : "All States" },
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

            {/* Grid */}
            {loading ? (
              <Text align="center" color="dimmed" py={60}>
                {locale === "zh" ? "加载中..." : "Loading..."}
              </Text>
            ) : listings.length === 0 ? (
              <Text align="center" color="dimmed" py={60}>
                {locale === "zh" ? "暂无匹配结果。请先配置规则并同步。" : "No results yet. Configure rules and sync first."}
              </Text>
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
                {listings.map((item) => {
                    const endInfo = formatEndsAt(item.ends_at);
                    const isAuction = item.buying_options?.includes("AUCTION");
                    const isFixedPrice = item.buying_options?.includes("FIXED_PRICE");
                    return (
                  <Anchor
                    key={item.id}
                    component={Link}
                    href={`/market-watch/${item.id}`}
                    underline={false}
                    sx={(theme) => ({
                      display: "block",
                      textDecoration: "none",
                    })}
                  >
                    <Box
                      sx={(theme) => ({
                        background: appSurfaceBackground(theme),
                        color: appTextColor(theme),
                        border: `1px solid ${appSurfaceBorder(theme)}`,
                        borderRadius: 2,
                        overflow: "hidden",
                        boxShadow: theme.colorScheme === "dark"
                          ? "0 4px 14px rgba(0,0,0,0.18)"
                          : "0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04)",
                        transition: "box-shadow 0.2s, transform 0.2s",
                        "&:hover": {
                          boxShadow: theme.colorScheme === "dark"
                            ? "0 10px 28px rgba(0,0,0,0.24)"
                            : "0 4px 8px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.06)",
                          transform: "translateY(-2px)",
                        },
                      })}
                    >
                      {/* Image */}
                      <Box
                        sx={{
                          height: 220,
                          background: item.images?.[0]
                            ? `url(${item.images[0].url}) center/cover`
                            : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                          position: "relative",
                        }}
                      >
                        <Group spacing={6} sx={{ position: "absolute", top: 8, left: 8 }}>
                          <Badge size="sm" variant="filled" color="blue" sx={{ fontWeight: 400 }}>
                            eBay
                          </Badge>
                          {isAuction && (
                            <Badge size="sm" variant="filled" color="red" sx={{ fontWeight: 400 }}>
                              AUCTION
                            </Badge>
                          )}
                          {isFixedPrice && (
                            <Badge size="sm" variant="filled" color="green" sx={{ fontWeight: 400 }}>
                              BUY NOW
                            </Badge>
                          )}
                        </Group>
                        {/* Save button */}
                        <Tooltip
                          label={user ? "" : t("marketWatch.loginToSave")}
                          disabled={!!user}
                        >
                          <ActionIcon
                            variant="filled"
                            size="md"
                            radius="xl"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSave(item.id, item.is_saved || false);
                            }}
                            disabled={!user}
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              backgroundColor: item.is_saved
                                ? "rgba(231,76,60,0.85)"
                                : "rgba(0,0,0,0.4)",
                              color: "#fff",
                              "&:hover": {
                                backgroundColor: item.is_saved
                                  ? "rgba(231,76,60,0.95)"
                                  : "rgba(0,0,0,0.6)",
                              },
                            }}
                          >
                            {item.is_saved ? (
                              <IconHeartFilled size={16} />
                            ) : (
                              <IconHeart size={16} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                        {/* Image count badge */}
                        {(() => {
                          const totalImgs = (item.images?.length || 0) + (item.extra_images?.length || 0);
                          if (totalImgs > 1) {
                            return (
                              <Badge
                                size="xs"
                                variant="filled"
                                sx={{
                                  position: "absolute",
                                  bottom: 8,
                                  left: 8,
                                  backgroundColor: "rgba(0,0,0,0.55)",
                                  color: "#fff",
                                  fontWeight: 400,
                                  fontSize: 11,
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
                          size="sm"
                          weight={500}
                          lineClamp={2}
                          sx={(theme) => ({
                            fontFamily: "inherit",
                            lineHeight: 1.35,
                            minHeight: 36,
                            color: appTextColor(theme),
                          })}
                        >
                          {item.title}
                        </Text>

                        {/* Matched keywords — WHY this item matched */}
                        {item.matched_keywords?.length > 0 && (
                          <Group spacing={4} mt={6}>
                            {item.matched_keywords.map((kw) => (
                              <Badge
                                key={kw}
                                size="xs"
                                variant="light"
                                sx={(theme) => ({
                                  backgroundColor: theme.colorScheme === "dark"
                                    ? "rgba(196,162,85,0.15)"
                                    : "rgba(196,162,85,0.12)",
                                  color: "#c4a255",
                                  fontWeight: 400,
                                  textTransform: "none",
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
                            {item.condition && (
                              <Badge size="xs" variant="light" color="dark.3">
                                {item.condition}
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {/* Auction reserve status */}
                        {isAuction && item.reserve_price_met === false && (
                          <Text size="xs" mt={4} color="red">
                            {locale === "zh" ? "⚠️ 未达底价" : "⚠️ Reserve not met"}
                          </Text>
                        )}

                        {/* Short description snippet */}
                        {item.short_description && (
                          <Text
                            size="xs"
                            mt={4}
                            lineClamp={2}
                            sx={(theme) => ({
                              color: appMutedTextColor(theme),
                              fontStyle: "italic",
                              lineHeight: 1.4,
                            })}
                          >
                            {item.short_description}
                          </Text>
                        )}

                        {/* Ends at countdown */}
                        {endInfo.text && (
                          <Text
                            size="xs"
                            mt={6}
                            sx={(theme) => ({
                              color: endInfo.urgent
                                ? theme.colors.red[6]
                                : appMutedTextColor(theme),
                              fontWeight: endInfo.urgent ? 500 : 400,
                            })}
                          >
                            ⏰ {endInfo.text}
                          </Text>
                        )}

                        {/* Location + Seller row */}
                        <Group position="apart" mt={4}>
                          {item.location && (
                            <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                              📍 {item.location}
                            </Text>
                          )}
                          {item.seller && (
                            <Text size="xs" sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                              {item.seller}
                              {item.seller_rating && ` · ★ ${item.seller_rating}`}
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
                  min={1}
                  max={Math.ceil(total / 15)}
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
