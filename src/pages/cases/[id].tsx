import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatedBox, Wrapper } from "@/layout";
import { fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";
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
import { IconChevronLeft, IconChevronRight, IconZoomIn } from "@tabler/icons-react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

const frameStyles = {
  background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.92))",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
} as const;

export default function CaseDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
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
    setSelectedImage(gallery[0] ?? "");
  }, [item?.id, gallery]);

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
  const activeImage = selectedImage || gallery[0] || item.image;

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
          <Container py={64}>
            <Stack spacing="xl">
              <Button component={Link} href="/cases" variant="subtle" px={0} sx={{ alignSelf: "flex-start" }}>
                {t("support.caseBack")}
              </Button>

              <Stack spacing="sm">
                {/* ✅ 案例类型徽章 - 区分平台上传和个人上传 */}
                <Group spacing="xs">
                  <Badge 
                    color={item.isOfficial === true ? "blue" : "green"} 
                    variant="outline"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {item.isOfficial === true 
                      ? t("cases.platformUpload")
                      : t("cases.personalUserUpload")}
                  </Badge>
                </Group>
                <Title order={1}>{title}</Title>
              </Stack>

              <Box sx={{ position: "relative" }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setLightboxOpened(true)}
                  sx={{
                    ...frameStyles,
                    height: 460,
                    width: "100%",
                    padding: 16,
                    cursor: "zoom-in",
                    border: "1px solid rgba(216, 183, 109, 0.18)",
                    position: "relative",
                  }}
                >
                  <Box
                    component="img"
                    src={activeImage}
                    alt={title}
                    sx={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                  />
                  <Group spacing={8} sx={{ position: "absolute", right: 16, top: 16, color: "#f4ead7", pointerEvents: "none" }}>
                    <IconZoomIn size={18} />
                    <Text size="sm">{locale === "zh" ? "点击放大" : "Click to zoom"}</Text>
                  </Group>
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
                            ...frameStyles,
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
                            component="img"
                            src={imageUrl}
                            alt={`${title}-${index + 1}`}
                            sx={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                          />
                        </Box>
                      );
                    })}
                  </Group>
                </ScrollArea>
              ) : null}

              {/* ✅ 案例详情描述 - 放在图片展示下方 */}
              {description && (
                <Box p="lg" sx={{ backgroundColor: "rgba(24, 30, 38, 0.96)", border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8 }}>
                  <Title order={4} mb="md">{t("support.caseDetails")}</Title>
                  <Text size="lg" color="dark.1">{description}</Text>
                </Box>
              )}

              <Box p="lg" sx={{ backgroundColor: "rgba(24, 30, 38, 0.96)", border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8 }}>
                <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                  <Text><strong>{t("image.caseId")}:</strong> {item.caseRecord.caseId}</Text>
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
                ...frameStyles,
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
                        ...frameStyles,
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
