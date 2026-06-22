import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconExternalLink,
  IconHeart,
  IconHeartFilled,
} from "@tabler/icons-react";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
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
  const [selectedImage, setSelectedImage] = useState<string>("");

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
        if (data.listing?.images?.[0]) {
          setSelectedImage(data.listing.images[0].url);
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchSavedStatus();
  }, [fetchSavedStatus]);

  // Fetch price history
  useEffect(() => {
    if (!id) return;
    fetch(`/api/external/listings/${id}/price-history`)
      .then((res) => res.json())
      .then((data) => setPriceHistory(data.history || []))
      .catch(() => {});
  }, [id]);

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
  const displayedPrice = isAuction && listing.current_bid
    ? listing.current_bid
    : listing.price;

  const allImages = (() => {
    const seen = new Set<string>();
    const result: { url: string; width?: number; height?: number }[] = [];
    for (const img of [...(listing.images || []), ...(listing.extra_images || [])]) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        result.push(img);
      }
    }
    return result;
  })();

  return (
    <>
      <Head>
        <title>{listing.title} — Market Watch — Eastwood Auction</title>
      </Head>
      <Wrapper>
        <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined}>
          {/* Back link + Save button */}
          <Group position="apart" mb="lg">
            <Button
              component={Link}
              href="/market-watch"
              variant="subtle"
              leftIcon={<IconArrowLeft size={16} />}
              px={0}
            >
              {locale === "zh" ? "返回市场监控" : "Back to Market Watch"}
            </Button>
            <Tooltip
              label={user ? "" : t("marketWatch.loginToSave")}
              disabled={!!user}
            >
              <Button
                variant="subtle"
                color={saved ? "red" : "gray"}
                leftIcon={saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                onClick={toggleSave}
                loading={saving}
                disabled={!user}
              >
                {saved
                  ? t("marketWatch.unsaveListing")
                  : t("marketWatch.saveListing")}
              </Button>
            </Tooltip>
          </Group>

          {/* Two-column layout */}
          <Box
            sx={{
              display: "flex",
              gap: 40,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            {/* Left — Images */}
            <Box
              sx={{
                flex: isMobile ? "none" : "0 0 500px",
                maxWidth: isMobile ? "100%" : 500,
              }}
            >
              {/* Main image */}
              <Box
                sx={(theme) => ({
                  borderRadius: 2,
                  overflow: "hidden",
                  background: appSurfaceBackground(theme),
                  border: `1px solid ${appSurfaceBorder(theme)}`,
                })}
              >
                <Box
                  sx={{
                    width: "100%",
                    paddingBottom: "100%",
                    position: "relative",
                    background: selectedImage
                      ? `url(${selectedImage}) center/contain no-repeat`
                      : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                    backgroundColor: selectedImage ? "#1a1815" : undefined,
                  }}
                >
                  <Group spacing={6} sx={{ position: "absolute", top: 12, left: 12 }}>
                    <Badge size="sm" variant="filled" color="blue">eBay</Badge>
                    {isAuction && <Badge size="sm" variant="filled" color="red">AUCTION</Badge>}
                    {isFixedPrice && <Badge size="sm" variant="filled" color="green">BUY NOW</Badge>}
                  </Group>
                </Box>
              </Box>

              {/* Extra images thumbnails */}
              {allImages.length > 1 && (
                <Box mt="sm">
                  <Text size="xs" color="dimmed" mb={6}>
                    {t("marketWatch.extraImages")} ({allImages.length})
                  </Text>
                  <Group spacing={8}>
                    {allImages.map((img) => (
                      <Box
                        key={img.url}
                        onClick={() => setSelectedImage(img.url)}
                        sx={(theme) => ({
                          width: 72,
                          height: 72,
                          borderRadius: 4,
                          background: `url(${img.url}) center/cover`,
                          cursor: "pointer",
                          border: selectedImage === img.url
                            ? `2px solid #c4a255`
                            : `1px solid ${appSurfaceBorder(theme)}`,
                          opacity: selectedImage === img.url ? 1 : 0.6,
                          "&:hover": { opacity: 1 },
                          flexShrink: 0,
                        })}
                      />
                    ))}
                  </Group>
                </Box>
              )}
            </Box>

            {/* Right — Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing="md">
                {/* Title */}
                <Title order={3} sx={(theme) => ({ color: appTextColor(theme), fontWeight: 500, fontFamily: "inherit" })}>
                  {listing.title}
                </Title>

                {/* Matched keywords */}
                {listing.matched_keywords?.length > 0 && (
                  <Group spacing={6}>
                    {listing.matched_keywords.map((kw) => (
                      <Badge
                        key={kw}
                        size="sm"
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

                {/* Price */}
                <Box>
                  <Text size="xs" color="dimmed" mb={2}>
                    {isAuction
                      ? locale === "zh" ? "当前出价" : "Current Bid"
                      : locale === "zh" ? "价格" : "Price"}
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
                </Box>

                {/* Auction details */}
                {isAuction && (
                  <Group spacing="lg">
                    {listing.bid_count != null && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "出价次数" : "Bids"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({ color: appTextColor(theme) })}>
                          {listing.bid_count}
                        </Text>
                      </Box>
                    )}
                    {listing.reserve_price_met != null && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "底价" : "Reserve"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({
                          color: listing.reserve_price_met ? theme.colors.green[6] : theme.colors.red[6],
                        })}>
                          {listing.reserve_price_met
                            ? locale === "zh" ? "已到" : "Met"
                            : locale === "zh" ? "未到" : "Not Met"}
                        </Text>
                      </Box>
                    )}
                    {endInfo.text && (
                      <Box>
                        <Text size="xs" color="dimmed">{locale === "zh" ? "结束时间" : "Ends"}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({
                          color: endInfo.urgent ? theme.colors.red[6] : appTextColor(theme),
                        })}>
                          {endInfo.text}
                        </Text>
                      </Box>
                    )}
                    {listing.estimated_sold != null && listing.estimated_sold > 0 && (
                      <Box>
                        <Text size="xs" color="dimmed">{t("marketWatch.estimatedSold")}</Text>
                        <Text size="lg" weight={600} sx={(theme) => ({ color: appTextColor(theme) })}>
                          {listing.estimated_sold}
                        </Text>
                      </Box>
                    )}
                  </Group>
                )}

                {/* Description */}
                {(listing.description || listing.short_description) && (
                  <Box>
                    <Text size="xs" color="dimmed" mb={4}>
                      {t("marketWatch.fullDescription")}
                    </Text>
                    {listing.description ? (
                      <Box
                        sx={(theme) => ({
                          color: appTextColor(theme),
                          lineHeight: 1.7,
                          fontSize: 14,
                          "& p": { margin: "0 0 0.5em" },
                          "& ul, & ol": { paddingLeft: 20, margin: "0 0 0.5em" },
                          "& img": { maxWidth: "100%", height: "auto" },
                          "& a": { color: "#c4a255" },
                        })}
                        dangerouslySetInnerHTML={{ __html: listing.description }}
                      />
                    ) : (
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme), lineHeight: 1.6 })}>
                        {listing.short_description}
                      </Text>
                    )}
                  </Box>
                )}

                {/* Item specifics — antique details */}
                {listing.item_specifics && listing.item_specifics.length > 0 && (
                  <Box>
                    <Text size="xs" color="dimmed" mb={6}>
                      {t("marketWatch.itemSpecifics")}
                    </Text>
                    <Table
                      fontSize="sm"
                      sx={(theme) => ({
                        "& td": {
                          borderBottom: `1px solid ${appSurfaceBorder(theme)}`,
                          padding: "6px 12px",
                          color: appTextColor(theme),
                        },
                        "& td:first-of-type": {
                          width: 140,
                          color: appMutedTextColor(theme),
                          fontWeight: 500,
                          fontSize: 13,
                        },
                      })}
                    >
                      <tbody>
                        {listing.item_specifics.map((spec, i) => (
                          <tr key={i}>
                            <td>{spec.name}</td>
                            <td>{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                )}

                {/* Meta info */}
                <Group spacing="lg">
                  {listing.condition && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "品相" : "Condition"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.condition}</Text>
                      {listing.condition_description && (
                        <Text size="xs" mt={2} sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.5 })}>
                          {listing.condition_description}
                        </Text>
                      )}
                    </Box>
                  )}
                  {listing.location && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "发货地" : "Location"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.location}</Text>
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
                          {t("marketWatch.feedback")}: {listing.feedback_pct}
                          {listing.feedback_rating_star && ` · ${listing.feedback_rating_star}`}
                        </Text>
                      )}
                    </Box>
                  )}
                </Group>

                {/* View on eBay button */}
                <Button
                  component="a"
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener"
                  rightIcon={<IconExternalLink size={16} />}
                  size="md"
                  fullWidth={isMobile}
                  sx={{
                    backgroundColor: "#c4a255",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#b8943e" },
                  }}
                >
                  {locale === "zh" ? "在 eBay 查看/购买" : "View on eBay"}
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Price History Section */}
          <Box mt={48}>
            <Title order={4} mb="md" sx={(theme) => ({ color: appTextColor(theme), fontFamily: "inherit" })}>
              {t("marketWatch.priceHistory")}
            </Title>
            {priceHistory.length > 0 ? (
              <Box
                sx={(theme) => ({
                  overflowX: "auto",
                  "& table": { width: "100%", borderCollapse: "collapse" },
                  "& th, & td": {
                    padding: "8px 16px",
                    textAlign: "left",
                    borderBottom: `1px solid ${appSurfaceBorder(theme)}`,
                    color: appTextColor(theme),
                    fontSize: 14,
                  },
                  "& th": {
                    color: appMutedTextColor(theme),
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  },
                })}
              >
                <table>
                  <thead>
                    <tr>
                      <th>{locale === "zh" ? "时间" : "Time"}</th>
                      <th>{locale === "zh" ? "价格" : "Price"}</th>
                      <th>{locale === "zh" ? "当前出价" : "Current Bid"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.recorded_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{p.price != null ? formatPrice(p.price, p.currency) : "—"}</td>
                        <td>{p.current_bid != null ? formatPrice(p.current_bid, p.currency) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Text size="sm" color="dimmed">
                {t("marketWatch.noPriceHistory")}
              </Text>
            )}
          </Box>
        </Container>
      </Wrapper>
    </>
  );
}
