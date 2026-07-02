import Link from "next/link";
import { proxyImageUrl } from "@/lib/proxyImage";
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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

export default function ShopDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [uploaderEmail, setUploaderEmail] = useState<string | null>(null);
  const itemId = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    void fetchKnowledgeBase().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  const item = useMemo(
    () => items.find((entry) => entry.id === itemId && !entry.caseRecord),
    [itemId, items]
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
  const activeImage = selectedImage || gallery[0] || item?.image || "";

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
          console.error("[ShopDetailPage] Failed to load uploader email:", error);
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

  if (!item) {
    return (
      <Wrapper>
        <AnimatedBox>
          <Container py={80}>
            <Alert color="red">{locale === "zh" ? "未找到该商品。" : "Item not found."}</Alert>
          </Container>
        </AnimatedBox>
      </Wrapper>
    );
  }

  const title = locale === "zh" && item.titleZh ? item.titleZh : item.title;
  const description = locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;
  const inquiryHref = item.collectionId
    ? `/inquiries?code=${encodeURIComponent(item.collectionId)}&returnTo=${encodeURIComponent(router.asPath || `/shop/${itemId}`)}`
    : "/inquiries";
  const showInquiryButton = Boolean(item.collectionId);

  const goToImage = (index: number) => {
    const nextImage = gallery[index];
    if (nextImage) {
      setSelectedImage(nextImage);
    }
  };

  const goToPrevious = () => {
    if (!gallery.length) return;
    goToImage((selectedIndex - 1 + gallery.length) % gallery.length);
  };

  const goToNext = () => {
    if (!gallery.length) return;
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
                  opacity: theme.colorScheme === "dark" ? 0.75 : 0.7,
                  "&:hover": { opacity: 1, color: "#c4a255" },
                })}
              >
                {locale === "zh" ? "首页" : "Home"}
              </Text>
              <Text size="sm" sx={(theme) => ({ opacity: theme.colorScheme === "dark" ? 0.6 : 0.5 })}>∕</Text>
              <Text
                component={Link}
                href="/shop"
                size="sm"
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  textDecoration: "none",
                  opacity: theme.colorScheme === "dark" ? 0.75 : 0.7,
                  "&:hover": { opacity: 1, color: "#c4a255" },
                })}
              >
                {locale === "zh" ? "古董商店" : "Shop"}
              </Text>
              <Text size="sm" sx={(theme) => ({ opacity: theme.colorScheme === "dark" ? 0.6 : 0.5 })}>∕</Text>
              <Text size="sm" sx={(theme) => ({ opacity: theme.colorScheme === "dark" ? 0.85 : 0.8, fontWeight: 500 })}>
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

                    {/* 价格 */}
                    {item.isForSale && item.price ? (
                      <Group spacing="xs" align="baseline">
                        <Badge color="yellow" variant="filled" size="lg">
                          {t("collections.forSaleLabel")}
                        </Badge>
                        <Text size={isMobile ? 26 : 32} weight={700}
                          sx={{ color: "#c4a255", fontFamily: "Georgia, serif" }}>
                          {item.currency === "CNY" ? "¥" : "$"}{item.price.toLocaleString()}
                        </Text>
                      </Group>
                    ) : (
                      <Badge color="gray" variant="filled" size="lg">
                        {t("collections.notForSaleLabel")}
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
                      {item.collectionId && (
                        <Box>
                          <Text size="sm" sx={{ color: "#c4a255", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                            {locale === "zh" ? "藏品编号" : "Collection ID"}
                          </Text>
                          <Text size="sm" weight={500} sx={{ fontFamily: "monospace", fontSize: 13 }}>
                            {item.collectionId}
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
                (a) => a.category === item.category && a.id !== item.id && a.isForSale
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
                      const relatedHref = related.listingType === "product"
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
        fullScreen
        padding={isMobile ? "md" : "xl"}
        withCloseButton
        styles={{
          content: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
      >
        <Stack align="center" justify="center" sx={{ height: "100%" }}>
          <Box
            component="img"
            src={proxyImageUrl(selectedImage)}
            alt={title}
            sx={{ 
              maxWidth: "95vw", 
              maxHeight: "85vh", 
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
                  const newIndex = (selectedIndex + 1) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                } else {
                  const newIndex = (selectedIndex - 1 + gallery.length) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                }
              }
            }}
          />

          {gallery.length > 1 && (
            <Group position="center" spacing={isMobile ? "md" : "xl"} mt="md" noWrap>
              <ActionIcon
                size="xl"
                variant="filled"
                onClick={goToPrevious}
                styles={{
                  root: {
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                  },
                }}
              >
                <IconChevronLeft size={isMobile ? 24 : 28} />
              </ActionIcon>

              <Text color="dimmed" size="lg">
                {selectedIndex + 1} / {gallery.length}
              </Text>

              <ActionIcon
                size="xl"
                variant="filled"
                onClick={goToNext}
                styles={{
                  root: {
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                  },
                }}
              >
                <IconChevronRight size={isMobile ? 24 : 28} />
              </ActionIcon>
            </Group>
          )}
          
          <Text color="dimmed" size="sm" mt="xs" sx={(theme) => ({ opacity: theme.colorScheme === "dark" ? 1 : 0.7 })}>
            {locale === "zh" ? "双击缩放 · 左右滑动切换" : "Double-tap to zoom · Swipe to navigate"}
          </Text>
        </Stack>
      </Modal>

    </>
  );
}
