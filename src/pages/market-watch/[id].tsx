import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
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
  listing_url: string;
  seller: string | null;
  seller_rating: number | null;
  condition: string | null;
  location: string | null;
  discovered_at: string;
  ends_at: string | null;
  matched_keywords: string[];
  buying_options: string[];
  short_description: string | null;
}

const formatPrice = (price: number | null, currency: string) => {
  if (price == null) return "";
  const a = Math.round(price);
  return currency === "CNY" ? `¥${a.toLocaleString()}` : `$${a.toLocaleString()}`;
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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const id = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/external/listings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setListing(data.listing))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
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

  return (
    <>
      <Head>
        <title>{listing.title} — Market Watch — Eastwood Auction</title>
      </Head>
      <Wrapper>
        <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined}>
          {/* Back link */}
          <Button
            component={Link}
            href="/market-watch"
            variant="subtle"
            leftIcon={<IconArrowLeft size={16} />}
            mb="lg"
            px={0}
          >
            {locale === "zh" ? "返回市场监控" : "Back to Market Watch"}
          </Button>

          {/* Two-column layout */}
          <Box
            sx={{
              display: "flex",
              gap: 40,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            {/* Left — Image */}
            <Box
              sx={(theme) => ({
                flex: isMobile ? "none" : "0 0 500px",
                maxWidth: isMobile ? "100%" : 500,
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
                  background: listing.images?.[0]
                    ? `url(${listing.images[0].url}) center/contain no-repeat`
                    : "linear-gradient(180deg, #f7f2e9, #efe6d6)",
                  backgroundColor: listing.images?.[0] ? "#1a1815" : undefined,
                }}
              >
                <Group spacing={6} sx={{ position: "absolute", top: 12, left: 12 }}>
                  <Badge size="sm" variant="filled" color="blue">eBay</Badge>
                  {isAuction && <Badge size="sm" variant="filled" color="red">AUCTION</Badge>}
                  {isFixedPrice && <Badge size="sm" variant="filled" color="green">BUY NOW</Badge>}
                </Group>
              </Box>
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
                  </Group>
                )}

                {/* Description */}
                {listing.short_description && (
                  <Box>
                    <Text size="xs" color="dimmed" mb={4}>
                      {locale === "zh" ? "描述" : "Description"}
                    </Text>
                    <Text size="sm" sx={(theme) => ({ color: appTextColor(theme), lineHeight: 1.6 })}>
                      {listing.short_description}
                    </Text>
                  </Box>
                )}

                {/* Meta info */}
                <Group spacing="lg">
                  {listing.condition && (
                    <Box>
                      <Text size="xs" color="dimmed">{locale === "zh" ? "品相" : "Condition"}</Text>
                      <Text size="sm" sx={(theme) => ({ color: appTextColor(theme) })}>{listing.condition}</Text>
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
        </Container>
      </Wrapper>
    </>
  );
}
