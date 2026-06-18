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
          <Container py={isMobile ? 28 : 64} px={isMobile ? 16 : undefined}>
            <Stack spacing={isMobile ? "lg" : "xl"}>
              <Button 
                component={Link} 
                href="/cases" 
                variant="filled"
                color="blue"
                size={isMobile ? "sm" : "md"}
                leftIcon={<IconChevronLeft size={18} />}
                sx={{ 
                  alignSelf: "flex-start",
                  fontWeight: 600,
                  padding: isMobile ? "10px 16px" : '12px 24px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.5)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {t("support.caseBack")}
              </Button>

              <Stack spacing={isMobile ? "sm" : "md"}>
                {/* ✅ 案例类型徽章 - 区分平台上传和个人上传 */}
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
                </Group>
                <Title order={isMobile ? 3 : 1} sx={{ lineHeight: 1.18 }}>
                  {title}
                </Title>
                {showInquiryButton && (
                  <Button
                    component={Link}
                    href={inquiryHref}
                    variant="outline"
                    color="yellow"
                    size="md"
                    fullWidth={isMobile}
                  >
                    {t("support.caseInquiryButton")}
                  </Button>
                )}
                {item.caseRecord?.caseId && (
                  <Badge
                    variant="light"
                    size="lg"
                    sx={{
                      backgroundColor: "rgba(246, 239, 227, 0.15)",
                      color: "#f6efe3",
                      border: "1px solid rgba(246, 239, 227, 0.25)",
                    }}
                  >
                    {t("image.caseId")}: {item.caseRecord.caseId}
                  </Badge>
                )}
                {isAdmin && item.isOfficial !== true && uploaderEmail && (
                  <Text size="sm" color="dimmed">
                    {locale === "zh" ? "上传用户邮箱" : "Uploader email"}: {uploaderEmail}
                  </Text>
                )}
              </Stack>

              <Box sx={{ position: "relative" }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setLightboxOpened(true)}
                  sx={{
                    ...frameStyles(theme),
                    height: 460,
                    width: "100%",
                    padding: 16,
                    cursor: "zoom-in",
                    border: "1px solid rgba(216, 183, 109, 0.18)",
                    position: "relative",
                  }}
                >
                  <Box
                    role="img"
                    aria-label={title}
                    sx={{
                      width: "100%",
                      height: "100%",
                      minHeight: 320,
                      backgroundImage: `url("${activeImage}")`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                </Box>

                {gallery.length > 1 ? (
                  <>
                    <ActionIcon
                      variant="filled"
                      radius="xl"
                      size={42}
                      onClick={goToPrevious}
                      sx={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        backgroundColor: "rgba(15, 18, 22, 0.78)",
                        border: "1px solid rgba(216, 183, 109, 0.24)",
                      }}
                    >
                      <IconChevronLeft size={22} />
                    </ActionIcon>
                    <ActionIcon
                      variant="filled"
                      radius="xl"
                      size={42}
                      onClick={goToNext}
                      sx={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        backgroundColor: "rgba(15, 18, 22, 0.78)",
                        border: "1px solid rgba(216, 183, 109, 0.24)",
                      }}
                    >
                      <IconChevronRight size={22} />
                    </ActionIcon>
                  </>
                ) : null}
              </Box>

              {gallery.length > 1 ? (
                <ScrollArea type="never" offsetScrollbars scrollbarSize={6}>
                  <Group spacing="md" noWrap>
                    {gallery.map((imageUrl, index) => {
                      const isActive = imageUrl === activeImage;

                      return (
                        <Box
                          key={`${imageUrl}-${index}`}
                          component="button"
                          type="button"
                          onClick={() => setSelectedImage(imageUrl)}
                          sx={{
                            ...frameStyles(theme),
                            height: 150,
                            width: 170,
                            flex: "0 0 auto",
                            padding: 10,
                            border: isActive ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                            boxShadow: isActive ? "0 0 0 1px rgba(216, 183, 109, 0.18) inset" : "none",
                            cursor: "pointer",
                            transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              borderColor: "#d8b76d",
                            },
                          }}
                        >
                          <Box
                            role="img"
                            aria-label={`${title}-${index + 1}`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              backgroundImage: `url("${imageUrl}")`,
                              backgroundSize: "contain",
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "center",
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Group>
                </ScrollArea>
              ) : null}

              {/* 3D Model Viewer */}
              {item.threeDModel && (
                <Stack spacing="sm">
                  <Group spacing="xs" align="center">
                    <Text weight={600} size="sm">
                      {locale === "zh" ? "3D 模型" : "3D Model"}
                    </Text>
                    <Badge size="sm" variant="filled" color="blue">3D</Badge>
                  </Group>
                  <Model3DViewer
                    src={item.threeDModel.url}
                    poster={item.threeDModel.posterUrl || item.threeDModel.thumbnailUrl}
                    alt={title}
                    autoRotate
                    ar
                    height={320}
                  />
                </Stack>
              )}

              {/* ✅ 案例详情描述 - 放在图片展示下方 */}
              {description && (
                <Box p="lg" sx={{ backgroundColor: "#fff", borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.04)" }}>
                  <Title order={4} mb="md">{t("support.caseDetails")}</Title>
                  <Text size="lg" color="dark.9">{description}</Text>
                </Box>
              )}

              <Box p="lg" sx={{ backgroundColor: "#fff", borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.04)" }}>
                <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                  <Text><strong>{t("image.caseId")}:</strong> {item.caseRecord.caseId}</Text>
                  <Text><strong>{locale === "zh" ? "分类" : "Category"}:</strong> {caseCategoryLabel}</Text>
                  <Text><strong>{t("image.caseSaleTime")}:</strong> {item.caseRecord.saleTime}</Text>
                  <Text><strong>{t("image.caseSalePrice")}:</strong> {item.caseRecord.salePrice}</Text>
                  <Text><strong>{t("image.casePlatform")}:</strong> {item.caseRecord.salePlatform}</Text>
                  <Text><strong>{t("image.caseClientRegion")}:</strong> {item.caseRecord.clientRegion}</Text>
                  <Text><strong>{t("image.caseLogisticsCost")}:</strong> {item.caseRecord.logisticsCost}</Text>
                  <Text><strong>{t("image.casePurchaseChannel")}:</strong> {item.caseRecord.purchaseChannel}</Text>
                  <Text><strong>{t("image.casePurchaseCost")}:</strong> {item.caseRecord.purchaseCost}</Text>
                </SimpleGrid>
                <Text mt="md"><strong>{t("image.caseRiskAdvice")}:</strong> {item.caseRecord.riskAdvice}</Text>
              </Box>
            </Stack>
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
            <Text color="dark.1" size="sm" align="center" sx={{ opacity: 0.7, marginBottom: 8 }}>
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
