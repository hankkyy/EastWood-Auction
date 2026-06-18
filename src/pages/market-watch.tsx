import Head from "next/head";
import { useEffect, useState, useCallback, useRef } from "react";
import {
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
  Anchor,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import { appMutedTextColor, appSurfaceBackground, appSurfaceBorder, appTextColor } from "@/components/artworkStyles";

interface Listing {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  images: { url: string }[];
  listing_url: string;
  seller: string | null;
  seller_rating: number | null;
  condition: string | null;
  location: string | null;
  discovered_at: string;
  ends_at: string | null;
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

export default function MarketWatchPage() {
  const { t, locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState<number | ''>('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page > 1 && gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [page]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "18");
    params.set("sort", sort);
    if (search) params.set("search", search);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);

    const res = await fetch(`/api/external/listings?${params}`);
    if (!res.ok) return setLoading(false);
    const data: ListingsResponse = await res.json();
    setListings(data.listings);
    setTotal(data.total);
    setLoading(false);
  }, [page, sort, search, minPrice, maxPrice]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return (
    <>
      <Head>
        <title>Market Watch — Eastwood Auction</title>
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
            </Box>

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
                {listings.map((item) => (
                  <Anchor
                    key={item.id}
                    href={item.listing_url}
                    target="_blank"
                    rel="noopener"
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
                          height: 200,
                          background: item.images?.[0]
                            ? `url(${item.images[0].url}) center/cover`
                            : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                          position: "relative",
                        }}
                      >
                        <Badge
                          size="sm"
                          variant="filled"
                          color="blue"
                          sx={{ position: "absolute", top: 8, left: 8, fontWeight: 400 }}
                        >
                          eBay
                        </Badge>
                      </Box>

                      {/* Info */}
                      <Box p="sm">
                        <Text
                          size="sm"
                          weight={400}
                          lineClamp={2}
                          sx={(theme) => ({
                            fontFamily: "inherit",
                            lineHeight: 1.3,
                            minHeight: 36,
                            color: appTextColor(theme),
                          })}
                        >
                          {item.title}
                        </Text>
                        <Group position="apart" mt={6}>
                          <Text size="sm" weight={500} color="#c4a255">
                            {formatPrice(item.price, item.currency)}
                          </Text>
                          {item.condition && (
                            <Badge size="xs" variant="light" color="gray">
                              {item.condition}
                            </Badge>
                          )}
                        </Group>
                        {item.seller && (
                          <Text size="xs" mt={4} sx={(theme) => ({ color: appMutedTextColor(theme) })}>
                            {item.seller}
                            {item.seller_rating && ` · ★ ${item.seller_rating}`}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  </Anchor>
                ))}
              </SimpleGrid>
              </Box>
            )}

            {/* Pagination */}
            {total > 18 && (
              <Group position="center" mt="md" spacing="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.ceil(total / 18)}
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
                  max={Math.ceil(total / 18)}
                  size="sm"
                  styles={{ input: { width: 60, textAlign: "center" } }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= Math.ceil(total / 18)) {
                      setPage(jumpValue); setJumpValue('');
                    }
                  }}
                  rightSection={
                    <Text size="xs" color="dimmed" sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        if (typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= Math.ceil(total / 18)) {
                          setPage(jumpValue); setJumpValue('');
                        }
                      }}>→</Text>
                  }
                />
                <Text size="xs" color="dimmed">
                  / {Math.ceil(total / 18)} {locale === "zh" ? "页" : "pages"}
                </Text>
              </Group>
            )}
          </Stack>
        </Container>
      </Wrapper>
    </>
  );
}
