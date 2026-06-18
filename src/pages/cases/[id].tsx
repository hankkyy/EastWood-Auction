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
      <Wrapper>
        <AnimatedBox>
          <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined} size="lg">
            {/* 返回按钮 */}
            <Button
              component={Link}
              href="/cases"
              variant="subtle"
              size="sm"
              leftIcon={<IconChevronLeft size={16} />}
              mb="xl"
              sx={(theme) => ({
                color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                "&:hover": { backgroundColor: "transparent", color: "#c4a255" },
              })}
            >
              {t("support.caseBack")}
            </Button>

            {/* 左右分栏主体 */}
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 32 : 48,
                alignItems: "flex-start",
              }}
            >
              {/* ===== 左栏：图片画廊 ===== */}
              <Box
                sx={{
                  flex: isMobile ? "none" : "0 0 55%",
                  width: isMobile ? "100%" : undefined,
                  position: "sticky",
                  top: 24,
                }}
              >
                <Stack spacing="md">
                  {/* 主图 — 点击进入灯箱 */}
                  <Box
                    sx={(theme) => ({
                      background: theme.colorScheme === "dark" ? "#141210" : "#faf7f2",
                      borderRadius: 4,
                      overflow: "hidden",
                      position: "relative",
                      cursor: "zoom-in",
                      boxShadow: theme.colorScheme === "dark"
                        ? "0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)"
                        : "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
                    })}
                    onClick={() => setLightboxOpened(true)}
                  >
                    <Box
                      role="img"
                      aria-label={title}
                      sx={{
                        width: "100%",
                        height: isMobile ? "60vh" : "520px",
                        maxHeight: isMobile ? "70vh" : "70vh",
                        backgroundImage: `url("${activeImage}")`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        transition: "background-image 300ms ease",
                      }}
                    />
                    {/* 左右翻页箭头 */}
                    {gallery.length > 1 && (
                      <>
                        <ActionIcon
                          variant="filled"
                          radius="xl"
                          size={40}
                          onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                          sx={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(15, 18, 22, 0.72)",
                            "&:hover": { backgroundColor: "rgba(15, 18, 22, 0.88)" },
                          }}
                        >
                          <IconChevronLeft size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="filled"
                          radius="xl"
                          size={40}
                          onClick={(e) => { e.stopPropagation(); goToNext(); }}
                          sx={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            backgroundColor: "rgba(15, 18, 22, 0.72)",
                            "&:hover": { backgroundColor: "rgba(15, 18, 22, 0.88)" },
                          }}
                        >
                          <IconChevronRight size={20} />
                        </ActionIcon>
                      </>
                    )}
                    {gallery.length > 1 && (
                      <Text
                        size="xs"
                        sx={{
                          position: "absolute",
                          bottom: 12,
                          right: 14,
                          background: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontFamily: "monospace",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {gallery.indexOf(selectedImage || gallery[0]) + 1} / {gallery.length}
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
                          {gallery.map((imageUrl, index) => {
                            const isActive = imageUrl === activeImage;
                            return (
                              <Box
                                key={index}
                                onClick={() => setSelectedImage(imageUrl)}
                                sx={(theme) => ({
                                  width: 64,
                                  height: 56,
                                  borderRadius: 4,
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  border: isActive ? "2px solid #c4a255" : "1px solid rgba(216,183,109,0.15)",
                                  opacity: isActive ? 1 : 0.55,
                                  transition: "all 200ms ease",
                                  "&:hover": {
                                    opacity: 1,
                                    borderColor: "#c4a255",
                                  },
                                })}
                              >
                                <Box
                                  role="img"
                                  aria-label={`Photo ${index + 1}`}
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    backgroundImage: `url("${imageUrl}")`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                />
                              </Box>
                            );
                          })}
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
                        autoRotate
                        ar
                        height={isMobile ? 280 : 340}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* ===== 右栏：案例详情 ===== */}
              <Box
                sx={{
                  flex: 1,
                  width: isMobile ? "100%" : undefined,
                  minWidth: 0,
                }}
              >
                <Stack spacing="xl">
                  {/* 标题区域 */}
                  <Stack spacing="sm">
                    <Group spacing="xs">
                      <Badge
                        size="lg"
                        variant="light"
                        sx={(theme) => artworkSourceBadgeSx(item.isOfficial, theme)}
                      >
                        {item.isOfficial === true
                          ? t("cases.platformUpload")
                          : t("cases.personalUserUpload")}
                      </Badge>
                      {caseCategoryLabel && (
                        <Badge size="lg" variant="light" color="yellow">
                          {caseCategoryLabel}
                        </Badge>
                      )}
                    </Group>

                    <Title
                      order={isMobile ? 3 : 2}
                      sx={(theme) => ({
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 600,
                        fontSize: isMobile ? 28 : 38,
                        lineHeight: 1.18,
                        letterSpacing: "-0.02em",
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#1a1815",
                      })}
                    >
                      {title}
                    </Title>

                    {item.caseRecord?.caseId && (
                      <Badge
                        variant="light"
                        size="lg"
                        sx={(theme) => ({
                          backgroundColor: theme.colorScheme === "dark"
                            ? "rgba(246, 239, 227, 0.12)"
                            : "rgba(0, 0, 0, 0.06)",
                          color: theme.colorScheme === "dark" ? "#d4c8b0" : theme.colors.dark[0],
                          border: `1px solid ${theme.colorScheme === "dark" ? "rgba(246, 239, 227, 0.18)" : "rgba(0, 0, 0, 0.1)"}`
                        })}
                      >
                        {t("image.caseId")}: {item.caseRecord.caseId}
                      </Badge>
                    )}

                    {isAdmin && item.isOfficial !== true && uploaderEmail && (
                      <Text size="sm" color="dimmed">
                        {locale === "zh" ? "上传用户" : "Uploader"}: {uploaderEmail}
                      </Text>
                    )}
                  </Stack>

                  {/* 装饰分割线 */}
                  <Box
                    sx={(theme) => ({
                      height: 1,
                      background: theme.colorScheme === "dark"
                        ? "linear-gradient(90deg, rgba(196,162,85,0.3), rgba(196,162,85,0.05))"
                        : "linear-gradient(90deg, rgba(180,140,100,0.3), rgba(180,140,100,0.05))",
                      width: "60%",
                    })}
                  />

                  {/* 咨询按钮 */}
                  {showInquiryButton && (
                    <Button
                      component={Link}
                      href={inquiryHref}
                      variant="filled"
                      size="md"
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: "#c4a255",
                        color: "#1a1815",
                        fontWeight: 600,
                        fontSize: 15,
                        "&:hover": {
                          backgroundColor: "#b8943e",
                        },
                      }}
                    >
                      {t("support.caseInquiryButton")}
                    </Button>
                  )}

                  {/* 案例描述 */}
                  {description && (
                    <Box
                      sx={(theme) => ({
                        padding: isMobile ? 16 : 24,
                        borderRadius: 4,
                        background: theme.colorScheme === "dark"
                          ? "linear-gradient(135deg, rgba(196,162,85,0.04), rgba(196,162,85,0.01))"
                          : "linear-gradient(135deg, rgba(180,140,100,0.04), rgba(180,140,100,0.01))",
                        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.1)" : "rgba(180,140,100,0.12)"}`,
                        position: "relative",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: 3,
                          height: "100%",
                          background: "linear-gradient(180deg, #c4a255, transparent)",
                          borderRadius: "4px 0 0 4px",
                        },
                      })}
                    >
                      <Text
                        weight={600}
                        size="sm"
                        mb="sm"
                        sx={{
                          color: "#c4a255",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontSize: 11,
                        }}
                      >
                        {t("support.caseDetails")}
                      </Text>
                      <Text
                        size="md"
                        sx={(theme) => ({
                          color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                          lineHeight: 1.8,
                        })}
                      >
                        {description}
                      </Text>
                    </Box>
                  )}

                  {/* 案例档案详情表 */}
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
                    <Text
                      weight={600}
                      size="sm"
                      mb="md"
                      sx={{
                        color: "#c4a255",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: 11,
                      }}
                    >
                      {locale === "zh" ? "档案信息" : "Case Record"}
                    </Text>
                    <SimpleGrid cols={2} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                      <Text size="sm"><strong>{t("image.caseId")}:</strong> {item.caseRecord.caseId}</Text>
                      <Text size="sm"><strong>{locale === "zh" ? "分类" : "Category"}:</strong> {caseCategoryLabel}</Text>
                      <Text size="sm"><strong>{t("image.caseSaleTime")}:</strong> {item.caseRecord.saleTime}</Text>
                      <Text size="sm"><strong>{t("image.caseSalePrice")}:</strong> {item.caseRecord.salePrice}</Text>
                      <Text size="sm"><strong>{t("image.casePlatform")}:</strong> {item.caseRecord.salePlatform}</Text>
                      <Text size="sm"><strong>{t("image.caseClientRegion")}:</strong> {item.caseRecord.clientRegion}</Text>
                      <Text size="sm"><strong>{t("image.caseLogisticsCost")}:</strong> {item.caseRecord.logisticsCost}</Text>
                      <Text size="sm"><strong>{t("image.casePurchaseChannel")}:</strong> {item.caseRecord.purchaseChannel}</Text>
                      <Text size="sm"><strong>{t("image.casePurchaseCost")}:</strong> {item.caseRecord.purchaseCost}</Text>
                    </SimpleGrid>
                    <Text size="sm" mt="sm"><strong>{t("image.caseRiskAdvice")}:</strong> {item.caseRecord.riskAdvice}</Text>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Container>
        </AnimatedBox>
      </Wrapper>
      <Modal
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
