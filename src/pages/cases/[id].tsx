import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatedBox, Wrapper } from "@/layout";
import { fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";
import { artworkSourceBadgeSx } from "@/components/artworkStyles";
import { Model3DViewer } from "@/components/Model3DViewer";
import { useAuth } from "@/hooks/useAuth";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

const frameStyles = (theme: any) => ({
  background: theme.colorScheme === "dark" ? "#1e1c19" : "#fff",
  borderRadius: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxShadow: theme.colorScheme === "dark"
    ? "0 2px 4px rgba(0,0,0,0.20), 0 12px 24px rgba(0,0,0,0.22)"
    : "0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.04)",
} as const);

const getCaseCategoryLabel = (locale: "zh" | "en", rawCategory?: string, rawCategoryZh?: string) => {
  const raw = `${rawCategoryZh ?? ""} ${rawCategory ?? ""}`.trim().toLowerCase();
  const key = rawCategory?.toLowerCase() ?? "";

  if (raw.includes("字画") || raw.includes("书画") || raw.includes("painting") || raw.includes("calligraphy") || key === "calligraphy") {
    return locale === "zh" ? "字画" : "Paintings & Calligraphy";
  }
  if (raw.includes("瓷") || raw.includes("porcelain") || key === "porcelain") {
    return locale === "zh" ? "瓷器" : "Porcelain";
  }
  if (raw.includes("玉") || raw.includes("jade") || key === "jade") {
    return locale === "zh" ? "翡翠玉器" : "Jade";
  }
  if (raw.includes("铜") || raw.includes("bronze") || key === "bronze") {
    return locale === "zh" ? "铜器" : "Bronze";
  }
  return locale === "zh" ? "杂项" : "Miscellaneous";
};

export default function CaseDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { isAdmin } = useAuth();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [uploaderEmail, setUploaderEmail] = useState<string | null>(null);
  const caseId = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    void fetchKnowledgeBase().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  const item = useMemo(
    () => items.find((entry) => entry.id === caseId && entry.caseRecord),
    [caseId, items]
  );
  
  // 构建画廊图片数组（直接使用 galleryImages，如果没有则使用 image）
  const gallery = useMemo(() => {
    if (!item) return [];
    
    // 优先使用 galleryImages
    if (item.galleryImages && item.galleryImages.length > 0) {
      return item.galleryImages;
    }
    
    // 如果没有 galleryImages，使用 image 作为单张图片
    return [item.image];
  }, [item]);
  const selectedIndex = Math.max(0, gallery.findIndex((imageUrl) => imageUrl === selectedImage));

  useEffect(() => {
    if (!item) {
      setSelectedImage("");
      return;
    }

    const initialImage =
      gallery.find((imageUrl) => imageUrl === item.image) ?? gallery[0] ?? "";
    setSelectedImage(initialImage);
  }, [item, gallery]);

  useEffect(() => {
    if (!lightboxOpened || gallery.length <= 1) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedImage((current) => {
          const currentIndex = Math.max(0, gallery.findIndex((imageUrl) => imageUrl === current));
          return gallery[(currentIndex - 1 + gallery.length) % gallery.length] ?? current;
        });
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedImage((current) => {
          const currentIndex = Math.max(0, gallery.findIndex((imageUrl) => imageUrl === current));
          return gallery[(currentIndex + 1) % gallery.length] ?? current;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gallery, lightboxOpened]);

  useEffect(() => {
    if (!isAdmin || !item?.uploadedBy || item.isOfficial === true) {
      setUploaderEmail(null);
      return;
    }

    let cancelled = false;

    const fetchUploaderEmail = async () => {
      try {
        const response = await fetch("/api/admin/profiles");
        const payload = (await response.json()) as {
          profiles?: Array<{ id: string; email: string | null }>;
        };

        if (!response.ok) {
          throw new Error("Unable to load profiles");
        }

        if (!cancelled) {
          const profile = payload.profiles?.find((entry) => entry.id === item.uploadedBy);
          setUploaderEmail(profile?.email ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[CaseDetailPage] Failed to load uploader email:", error);
          setUploaderEmail(null);
        }
      }
    };

    void fetchUploaderEmail();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, item?.uploadedBy, item?.isOfficial]);

  // 数据加载中，显示统一的 Loading 状态
  if (isLoading) {
    return (
      <Wrapper>
        <AnimatedBox>
          <Container py={80}>
            <Text align="center">{locale === "zh" ? "加载中..." : "Loading..."}</Text>
          </Container>
        </AnimatedBox>
      </Wrapper>
    );
  }

  if (!item || !item.caseRecord) {
    return (
      <Wrapper>
        <AnimatedBox>
          <Container py={80}>
            <Alert color="red">{t("support.emptyCases")}</Alert>
          </Container>
        </AnimatedBox>
      </Wrapper>
    );
  }

  const title = locale === "zh" && item.titleZh ? item.titleZh : item.title;
  const description = locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;
  const caseCategoryLabel = getCaseCategoryLabel(locale, item.category, item.categoryZh);
  const activeImage = selectedImage || gallery[0] || item.image;
  const inquiryHref = item.caseRecord?.caseId
    ? `/inquiries?code=${encodeURIComponent(item.caseRecord.caseId)}&returnTo=${encodeURIComponent(router.asPath || `/cases/${caseId}`)}`
    : "/inquiries";
  const showInquiryButton = Boolean(item.caseRecord?.caseId);

  const goToImage = (index: number) => {
    const nextImage = gallery[index];
    if (nextImage) {
      setSelectedImage(nextImage);
    }
  };

  const goToPrevious = () => {
    if (!gallery.length) {
      return;
    }
    goToImage((selectedIndex - 1 + gallery.length) % gallery.length);
  };

  const goToNext = () => {
    if (!gallery.length) {
      return;
    }
    goToImage((selectedIndex + 1) % gallery.length);
  };

  return (
    <>
      <Head>
        <title>{title} - Eastwood Auction</title>
      </Head>
      <Head>
        <title>{title} - Eastwood Auction</title>
      </Head>

      <Wrapper>
        <AnimatedBox>
          <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined} size="lg">
            {/* ===== 面包屑导航 ===== */}
            <Group spacing={6} mb={isMobile ? 24 : 40} sx={{ flexWrap: "wrap" }}>
              <Text
                component={Link}
                href="/"
                size="sm"
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  textDecoration: "none",
                  opacity: 0.7,
                  "&:hover": { opacity: 1, color: "#c4a255" },
                })}
              >
                {locale === "zh" ? "首页" : "Home"}
              </Text>
              <Text size="sm" sx={{ opacity: 0.5 }}>∕</Text>
              <Text
                component={Link}
                href="/cases"
                size="sm"
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  textDecoration: "none",
                  opacity: 0.7,
                  "&:hover": { opacity: 1, color: "#c4a255" },
                })}
              >
                {locale === "zh" ? "回流案例" : "Cases"}
              </Text>
              <Text size="sm" sx={{ opacity: 0.5 }}>∕</Text>
              <Text size="sm" sx={{ opacity: 0.8, fontWeight: 500 }}>
                {title.length > 40 ? title.slice(0, 40) + "…" : title}
              </Text>
            </Group>

            {/* ===== 左右分栏主体 ===== */}
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 32 : 56,
                alignItems: "flex-start",
              }}
            >
              {/* ===== 左栏：图片画廊 ===== */}
              <Box
                sx={{
                  flex: isMobile ? "none" : "0 0 52%",
                  width: isMobile ? "100%" : undefined,
                  position: "sticky",
                  top: 24,
                }}
              >
                <Stack spacing="md">
                  {/* 主图 */}
                  <Box
                    sx={(theme) => ({
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(175deg, #1a1815 0%, #141210 100%)"
                        : "linear-gradient(175deg, #faf7f2 0%, #f5f0e9 100%)",
                      borderRadius: 4,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: theme.colorScheme === "dark"
                        ? "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)"
                        : "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)",
                      border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.08)" : "rgba(180,140,100,0.1)"}`,
                    })}
                  >
                    <Box
                      role="img"
                      aria-label={title}
                      sx={{
                        width: "100%",
                        height: isMobile ? "60vh" : "540px",
                        maxHeight: isMobile ? "70vh" : "72vh",
                        backgroundImage: `url("${activeImage}")`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        cursor: gallery.length > 1 ? "zoom-in" : "default",
                        transition: "background-image 350ms ease",
                      }}
                      onClick={() => gallery.length > 1 && setLightboxOpened(true)}
                    />
                    {gallery.length > 1 && (
                      <Text
                        size="xs"
                        sx={(theme) => ({
                          position: "absolute",
                          bottom: 12,
                          right: 14,
                          background: theme.colorScheme === "dark"
                            ? "rgba(0,0,0,0.65)"
                            : "rgba(0,0,0,0.5)",
                          color: "#fff",
                          padding: "3px 12px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontFamily: "monospace",
                          letterSpacing: "0.05em",
                          backdropFilter: "blur(4px)",
                        })}
                      >
                        {gallery.indexOf(selectedImage) + 1} / {gallery.length}
                      </Text>
                    )}
                  </Box>

                  {/* 缩略图导航 */}
                  {gallery.length > 1 && (
                    <Group spacing="xs" position="center">
                      <ActionIcon variant="light" size="sm" onClick={goToPrevious}>
                        <IconChevronLeft size={14} />
                      </ActionIcon>
                      <ScrollArea type="hover" offsetScrollbars>
                        <Group spacing={6} noWrap>
                          {gallery.map((imageUrl, index) => (
                            <Box
                              key={index}
                              onClick={() => setSelectedImage(imageUrl)}
                              sx={(theme) => ({
                                width: 60,
                                height: 60,
                                borderRadius: 4,
                                overflow: "hidden",
                                cursor: "pointer",
                                border: selectedImage === imageUrl
                                  ? "2px solid #c4a255"
                                  : "2px solid transparent",
                                opacity: selectedImage === imageUrl ? 1 : 0.5,
                                transition: "all 200ms ease",
                                "&:hover": { opacity: 1, borderColor: "#c4a255" },
                              })}
                            >
                              <Box
                                role="img"
                                aria-label={`Photo ${index + 1}`}
                                sx={{
                                  width: "100%", height: "100%",
                                  backgroundImage: `url("${imageUrl}")`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                            </Box>
                          ))}
                        </Group>
                      </ScrollArea>
                      <ActionIcon variant="light" size="sm" onClick={goToNext}>
                        <IconChevronRight size={14} />
                      </ActionIcon>
                    </Group>
                  )}

                  {/* 3D 模型 */}
                  {item.threeDModel && (
                    <Box>
                      <Group spacing="xs" mb="xs">
                        <Text weight={600} size="sm">
                          {locale === "zh" ? "3D 模型" : "3D Model"}
                        </Text>
                        <Badge size="sm" variant="filled" color="yellow">3D</Badge>
                      </Group>
                      <Model3DViewer
                        src={item.threeDModel.url}
                        poster={item.threeDModel.posterUrl || item.threeDModel.thumbnailUrl}
                        alt={title}
                        autoRotate ar
                        height={isMobile ? 280 : 340}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* ===== 右栏：藏品详情 ===== */}
              <Box sx={{ flex: 1, width: isMobile ? "100%" : undefined, minWidth: 0 }}>
                <Stack spacing="xl">
                  {/* 标题 + 徽章 */}
                  <Stack spacing="sm">
                    <Group spacing="xs">
                      <Badge size="lg" variant="light"
                        sx={(theme) => artworkSourceBadgeSx(item.isOfficial, theme)}>
                        {item.isOfficial === true
                          ? t("cases.platformUpload")
                          : t("cases.personalUserUpload")}
                      </Badge>
                      <Badge size="lg" variant="light" color="yellow">
                        {item.categoryZh || item.category}
                      </Badge>
                    </Group>

                    <Title order={isMobile ? 3 : 2}
                      sx={(theme) => ({
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 600,
                        fontSize: isMobile ? 28 : 40,
                        lineHeight: 1.16,
                        letterSpacing: "-0.02em",
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#1a1815",
                      })}>
                      {title}
                    </Title>

                    {/* 案例分类 */}
                    {caseCategoryLabel && (
                      <Badge size="lg" variant="filled" color="yellow">
                        {caseCategoryLabel}
                      </Badge>
                    )}
                  </Stack>

                  {/* 快捷信息卡 */}
                  <Box
                    sx={(theme) => ({
                      padding: isMobile ? 14 : 18,
                      borderRadius: 4,
                      background: theme.colorScheme === "dark"
                        ? "rgba(30,28,25,0.5)"
                        : "rgba(250,247,242,0.7)",
                      border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.08)" : "rgba(0,0,0,0.06)"}`,
                    })}
                  >
                    <SimpleGrid cols={2} spacing="sm"
                      breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                      <Box>
                        <Text size="sm" sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                          {locale === "zh" ? "年代" : "Period"}
                        </Text>
                        <Text size="sm" weight={500}>
                          {locale === "zh" && item.periodZh ? item.periodZh : item.period}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="sm" sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                          {locale === "zh" ? "分类" : "Category"}
                        </Text>
                        <Text size="sm" weight={500}>
                          {item.categoryZh || item.category}
                        </Text>
                      </Box>
                      {item.caseRecord?.caseId && (
                        <Box>
                          <Text size="sm" sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                            {locale === "zh" ? "案例编号" : "Case ID"}
                          </Text>
                          <Text size="sm" weight={500} sx={{ fontFamily: "monospace", fontSize: 13 }}>
                            {item.caseRecord.caseId}
                          </Text>
                        </Box>
                      )}
                      {item.period && (
                        <Box>
                          <Text size="sm" sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                            {locale === "zh" ? "来源" : "Source"}
                          </Text>
                          <Text size="sm" weight={500}>
                            {item.isOfficial ? (locale === "zh" ? "平台认证" : "Verified") : (locale === "zh" ? "个人收藏" : "Private")}
                          </Text>
                        </Box>
                      )}
                    </SimpleGrid>
                  </Box>

                  {/* 装饰分割线 */}
                  <Group spacing="md" noWrap>
                    <Box sx={(theme) => ({
                      height: 1, flex: 1,
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(90deg, transparent, rgba(196,162,85,0.25))"
                        : "linear-gradient(90deg, transparent, rgba(180,140,100,0.25))",
                    })} />
                    <Text size="sm" sx={{ color: "#c4a255", letterSpacing: "0.15em", whiteSpace: "nowrap" }}>
                      ✦
                    </Text>
                    <Box sx={(theme) => ({
                      height: 1, flex: 1,
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(90deg, rgba(196,162,85,0.25), transparent)"
                        : "linear-gradient(90deg, rgba(180,140,100,0.25), transparent)",
                    })} />
                  </Group>

                  {/* 咨询按钮 */}
                  {showInquiryButton && (
                    <Button
                      component={Link} href={inquiryHref}
                      variant="filled" size="lg"
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: "#c4a255", color: "#1a1815",
                        fontWeight: 600, fontSize: 16, height: 48,
                        letterSpacing: "0.02em",
                        boxShadow: "0 4px 16px rgba(196,162,85,0.2)",
                        "&:hover": {
                          backgroundColor: "#b8943e",
                          boxShadow: "0 6px 24px rgba(196,162,85,0.3)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      {t("home.bookButton")}
                    </Button>
                  )}

                  {/* 藏品描述 */}
                  {description && (
                    <Box
                      sx={(theme) => ({
                        padding: isMobile ? 16 : 28,
                        borderRadius: 4,
                        background: theme.colorScheme === "dark"
                          ? "linear-gradient(160deg, rgba(196,162,85,0.05), rgba(196,162,85,0.01))"
                          : "linear-gradient(160deg, rgba(180,140,100,0.05), rgba(180,140,100,0.01))",
                        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.1)" : "rgba(180,140,100,0.12)"}`,
                        position: "relative",
                        "&::before": {
                          content: '""', position: "absolute",
                          top: 0, left: 0,
                          width: 3, height: "100%",
                          background: "linear-gradient(180deg, #c4a255, rgba(196,162,85,0.1))",
                          borderRadius: "4px 0 0 4px",
                        },
                      })}
                    >
                      <Text weight={600} size="sm" mb="md"
                        sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
                        {locale === "zh" ? "藏品介绍" : "Description"}
                      </Text>
                      <Text size="md"
                        sx={(theme) => ({
                          color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                          lineHeight: 1.9, whiteSpace: "pre-wrap",
                        })}>
                        {description}
                      </Text>
                    </Box>
                  )}

                  {/* 案例档案详情 */}
                  {item.caseRecord && (
                    <Box
                      sx={(theme) => ({
                        padding: isMobile ? 16 : 24,
                        borderRadius: 4,
                        background: theme.colorScheme === "dark"
                          ? "rgba(30,28,25,0.6)"
                          : "rgba(250,247,242,0.8)",
                        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.08)" : "rgba(0,0,0,0.06)"}`,
                      })}
                    >
                      <Text weight={600} size="sm" mb="md"
                        sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
                        {locale === "zh" ? "成交档案" : "Auction Record"}
                      </Text>
                      <SimpleGrid cols={2} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "成交价格" : "Sale Price"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.salePrice}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "成交时间" : "Sale Date"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.saleTime}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "出售平台" : "Platform"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.salePlatform}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "客户地区" : "Client Region"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.clientRegion}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "物流成本" : "Logistics"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.logisticsCost}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "购买渠道" : "Purchase Channel"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.purchaseChannel}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" color="dimmed">{locale === "zh" ? "购买成本" : "Purchase Cost"}</Text>
                          <Text size="sm" weight={600}>{item.caseRecord.purchaseCost}</Text>
                        </Box>
                      </SimpleGrid>
                      {item.caseRecord.riskAdvice && (
                        <Box mt="md" p="sm"
                          sx={(theme) => ({
                            borderRadius: 2,
                            background: theme.colorScheme === "dark"
                              ? "rgba(196,162,85,0.06)"
                              : "rgba(196,162,85,0.06)",
                            borderLeft: "3px solid #c4a255",
                          })}
                        >
                          <Text size="sm" color="#c4a255" weight={600} mb={2}>
                            {locale === "zh" ? "⚠ 避坑建议" : "⚠ Risk Advice"}
                          </Text>
                          <Text size="sm" sx={{ lineHeight: 1.6 }}>
                            {item.caseRecord.riskAdvice}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )}

                  {isAdmin && item.isOfficial !== true && uploaderEmail && (
                    <Text size="sm" color="dimmed">
                      {locale === "zh" ? "上传用户" : "Uploader"}: {uploaderEmail}
                    </Text>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* ===== 同类推荐 ===== */}
            {(() => {
              const sameCategory = items.filter(
                (a) => a.category === item.category && a.id !== item.id && a.caseRecord
              ).slice(0, 4);
              if (sameCategory.length === 0) return null;
              return (
                <Box mt={isMobile ? 48 : 80}>
                  <Group spacing="md" mb="xl">
                    <Box sx={(theme) => ({
                      height: 1, flex: 1,
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(90deg, transparent, rgba(196,162,85,0.2))"
                        : "linear-gradient(90deg, transparent, rgba(180,140,100,0.2))",
                    })} />
                    <Text
                      weight={600}
                      sx={(theme) => ({
                        color: "#c4a255",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      })}
                    >
                      {locale === "zh" ? "同类推荐" : "You May Also Like"}
                    </Text>
                    <Box sx={(theme) => ({
                      height: 1, flex: 1,
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(90deg, rgba(196,162,85,0.2), transparent)"
                        : "linear-gradient(90deg, rgba(180,140,100,0.2), transparent)",
                    })} />
                  </Group>
                  <SimpleGrid
                    cols={4}
                    spacing="lg"
                    breakpoints={[
                      { maxWidth: "md", cols: 2, spacing: "md" },
                      { maxWidth: "sm", cols: 2, spacing: "sm" },
                    ]}
                  >
                    {sameCategory.map((related) => {
                      const relatedTitle = locale === "zh" && related.titleZh
                        ? related.titleZh : related.title;
                      const relatedHref = related.caseRecord
                        ? `/cases/${related.id}`
                        : related.listingType === "product"
                        ? `/shop/${related.id}`
                        : `/collections/${related.id}`;
                      return (
                        <Box
                          key={related.id}
                          component={Link}
                          href={relatedHref}
                          sx={(theme) => ({
                            display: "block",
                            textDecoration: "none",
                            borderRadius: 3,
                            overflow: "hidden",
                            background: theme.colorScheme === "dark" ? "#1e1c19" : "#fff",
                            border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.06)" : "rgba(0,0,0,0.05)"}`,
                            transition: "all 250ms ease",
                            "&:hover": {
                              transform: "translateY(-3px)",
                              boxShadow: theme.colorScheme === "dark"
                                ? "0 4px 16px rgba(0,0,0,0.3)"
                                : "0 4px 16px rgba(0,0,0,0.08)",
                              borderColor: "#c4a255",
                            },
                          })}
                        >
                          <Box
                            sx={{
                              height: 160,
                              backgroundImage: `url("${related.image}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center 15%",
                            }}
                          />
                          <Box p="sm">
                            <Text size="sm" weight={500} lineClamp={2}
                              sx={{ lineHeight: 1.35, minHeight: 36 }}>
                              {relatedTitle}
                            </Text>
                            {related.isForSale && related.price && (
                              <Text size="xs" mt={4} weight={600}
                                sx={{ color: "#c4a255" }}>
                                {related.currency === "CNY" ? "¥" : "$"}{related.price.toLocaleString()}
                              </Text>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              );
            })()}
          </Container>
        </AnimatedBox>
      </Wrapper>      <Modal
        opened={lightboxOpened}
        onClose={() => setLightboxOpened(false)}
        fullScreen // 改为全屏显示，更适合移动端
        withCloseButton
        overlayProps={{ opacity: 0.72, blur: 4 }}
        styles={{ 
          body: { paddingTop: 8 },
          content: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
      >
        <Stack spacing="md" sx={{ height: "100%", justifyContent: "center" }}>
          <Box sx={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box
              sx={{
                ...frameStyles(theme),
                minHeight: 620,
                padding: 20,
                border: "1px solid rgba(216, 183, 109, 0.18)",
                maxWidth: "95vw",
                maxHeight: "85vh",
              }}
            >
              <Box
                component="img"
                src={activeImage}
                alt={title}
                sx={{ 
                  maxWidth: "100%", 
                  maxHeight: "72vh", 
                  width: "auto", 
                  height: "auto", 
                  objectFit: "contain",
                  cursor: "zoom-in",
                  touchAction: "manipulation",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                onDoubleClick={(e) => {
                  const img = e.currentTarget;
                  if (img.style.transform === "scale(2)") {
                    img.style.transform = "scale(1)";
                  } else {
                    img.style.transform = "scale(2)";
                    img.style.transition = "transform 0.3s ease";
                  }
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any).touchStartX = touch.clientX;
                }}
                onTouchEnd={(e) => {
                  const touch = e.changedTouches[0];
                  const startX = (e.currentTarget as any).touchStartX;
                  const diff = startX - touch.clientX;
                  
                  if (Math.abs(diff) > 50 && gallery.length > 1) {
                    if (diff > 0) {
                      goToNext();
                    } else {
                      goToPrevious();
                    }
                  }
                }}
              />
            </Box>

            {gallery.length > 1 ? (
              <>
                <ActionIcon
                  variant="filled"
                  radius="xl"
                  size={56} // 增大触摸区域
                  onClick={goToPrevious}
                  sx={{
                    position: "absolute",
                    left: 18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(15, 18, 22, 0.84)",
                    border: "1px solid rgba(216, 183, 109, 0.24)",
                  }}
                >
                  <IconChevronLeft size={28} />
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  radius="xl"
                  size={56} // 增大触摸区域
                  onClick={goToNext}
                  sx={{
                    position: "absolute",
                    right: 18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(15, 18, 22, 0.84)",
                    border: "1px solid rgba(216, 183, 109, 0.24)",
                  }}
                >
                  <IconChevronRight size={28} />
                </ActionIcon>
              </>
            ) : null}
          </Box>

          {gallery.length > 1 && (
            <Text color="dimmed" size="sm" align="center" sx={(theme) => ({ opacity: theme.colorScheme === "dark" ? 1 : 0.7, marginBottom: 8 })}>
              {locale === "zh" ? "双击缩放 · 左右滑动切换" : "Double-tap to zoom · Swipe to navigate"}
            </Text>
          )}

          {gallery.length > 1 ? (
            <ScrollArea type="never" offsetScrollbars scrollbarSize={6}>
              <Group spacing="md" noWrap position="center">
                {gallery.map((imageUrl, index) => {
                  const isActive = imageUrl === activeImage;

                  return (
                    <Box
                      key={`lightbox-${imageUrl}-${index}`}
                      component="button"
                      type="button"
                      onClick={() => setSelectedImage(imageUrl)}
                      sx={{
                        ...frameStyles(theme),
                        height: 110,
                        width: 130,
                        flex: "0 0 auto",
                        padding: 8,
                        border: isActive ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                        cursor: "pointer",
                      }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={`${title}-lightbox-${index + 1}`}
                        sx={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                      />
                    </Box>
                  );
                })}
              </Group>
            </ScrollArea>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}
