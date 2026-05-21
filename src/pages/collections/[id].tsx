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
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

export default function CollectionDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const collectionId = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    void fetchKnowledgeBase().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  const item = useMemo(
    () => items.find((entry) => entry.id === collectionId && !entry.caseRecord),
    [collectionId, items]
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
            <Alert color="red">{locale === "zh" ? "未找到该藏品。" : "Collection item not found."}</Alert>
          </Container>
        </AnimatedBox>
      </Wrapper>
    );
  }

  const title = locale === "zh" && item.titleZh ? item.titleZh : item.title;
  const description = locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;
  const inquiryHref = item.collectionId
    ? `/inquiries?code=${encodeURIComponent(item.collectionId)}&returnTo=${encodeURIComponent(router.asPath || `/collections/${collectionId}`)}`
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

      <Wrapper>
        <AnimatedBox>
          <Container py={isMobile ? 28 : 80} px={isMobile ? 16 : undefined}>
            <Stack spacing={isMobile ? "lg" : "xl"}>
              {/* 返回按钮 */}
              <Button
                component={Link}
                href="/collections"
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
                {t("collections.detailBack")}
              </Button>

              {/* 标题和基本信息 */}
              <Stack spacing={isMobile ? "sm" : "md"}>
                <Group spacing="xs">
                  <Badge
                    size="lg"
                    variant="light"
                    sx={{
                      alignSelf: "flex-start",
                      backgroundColor:
                        item.isOfficial === true
                          ? "rgba(59, 130, 246, 0.14)"
                          : "rgba(34, 197, 94, 0.14)",
                      color: item.isOfficial === true ? "#93c5fd" : "#86efac",
                      border: `1px solid ${
                        item.isOfficial === true
                          ? "rgba(59, 130, 246, 0.28)"
                          : "rgba(34, 197, 94, 0.28)"
                      }`,
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                    }}
                  >
                    {item.isOfficial === true
                      ? t("cases.platformUpload")
                      : t("cases.personalUserUpload")}
                  </Badge>
                </Group>
                <Title order={isMobile ? 3 : 2} sx={{ lineHeight: 1.18 }}>
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
                    {locale === "zh" ? "咨询此藏品" : "Ask about this item"}
                  </Button>
                )}

                {item.collectionId && (
                  <Badge 
                    variant="light" 
                    size="lg"
                    sx={{
                      backgroundColor: "rgba(246, 239, 227, 0.15)",
                      color: "#f6efe3",
                      border: "1px solid rgba(246, 239, 227, 0.25)"
                    }}
                  >
                    {t("collections.collectionIdLabel")}: {item.collectionId}
                  </Badge>
                )}

                {item.isForSale && item.price ? (
                  <Group spacing="sm" align="center" noWrap={false}>
                    <Badge color="green" variant="filled" size="lg">
                      {t("collections.forSaleLabel")}
                    </Badge>
                    <Text 
                      size="lg" 
                      weight={700} 
                      sx={{ 
                        color: "rgba(246, 239, 227, 0.85)", // ✅ 价格使用稍灰的颜色（85%透明度），与标题区分
                        lineHeight: 1.2
                      }}
                    >
                      {item.currency === "CNY" ? "¥" : "$"}
                      {item.price.toLocaleString()}
                    </Text>
                  </Group>
                ) : (
                  <Badge color="green" variant="filled" size="lg">
                    {t("collections.notForSaleLabel")}
                  </Badge>
                )}
              </Stack>

              {/* 主图展示 */}
              <Box
                sx={{
                  background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.92))",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  minHeight: isMobile ? 280 : 400,
                  padding: isMobile ? 10 : 0,
                  border: "1px solid rgba(216, 183, 109, 0.16)",
                  position: "relative",
                }}
              >
                <Box
                  component="img"
                  src={activeImage}
                  alt={title}
                  sx={{
                    width: "100%",
                    maxHeight: isMobile ? "46vh" : "70vh",
                    objectFit: "contain",
                    cursor: gallery.length > 1 ? "pointer" : "default",
                  }}
                  onClick={() => gallery.length > 1 && setLightboxOpened(true)}
                />
                <Badge
                  variant="filled"
                  color="dark"
                  sx={{
                    position: "absolute",
                    right: 12,
                    bottom: 12,
                    backgroundColor: "rgba(0, 0, 0, 0.62)",
                  }}
                >
                  {gallery.length > 1
                    ? (locale === "zh" ? "点图查看大图" : "Tap image to enlarge")
                    : (locale === "zh" ? "藏品主图" : "Main image")}
                </Badge>
              </Box>

              {/* 缩略图导航 */}
              {gallery.length > 1 && (
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text weight={600}>
                      {t("collections.detailGallery")} ({gallery.length})
                    </Text>
                    <Group spacing="xs">
                      <ActionIcon
                        variant="light"
                        size={isMobile ? "lg" : "md"}
                        onClick={goToPrevious}
                      >
                        <IconChevronLeft size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        size={isMobile ? "lg" : "md"}
                        onClick={goToNext}
                      >
                        <IconChevronRight size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <ScrollArea type="always" offsetScrollbars>
                    <Group spacing="sm" noWrap={isMobile}>
                      {gallery.map((imageUrl, index) => (
                        <Box
                          key={index}
                          onClick={() => setSelectedImage(imageUrl)}
                          sx={{
                            border: selectedImage === imageUrl ? "2px solid #d8b76d" : "1px solid transparent",
                            borderRadius: 8,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            minWidth: isMobile ? 92 : undefined,
                            "&:hover": {
                              borderColor: "#d8b76d",
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={`Photo ${index + 1}`}
                            sx={{ 
                              width: isMobile ? 92 : "100%", 
                              height: isMobile ? 92 : 80, 
                              objectFit: "contain",
                              backgroundColor: "rgba(34, 39, 47, 0.5)"
                            }}
                          />
                        </Box>
                      ))}
                    </Group>
                  </ScrollArea>
                </Stack>
              )}

              {/* 藏品介绍 */}
              {description && (
                <Stack
                  spacing="sm"
                  sx={{
                    padding: isMobile ? 16 : 20,
                    borderRadius: 14,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(216, 183, 109, 0.12)",
                  }}
                >
                  <Title order={4}>{t("collections.detailDescription")}</Title>
                  <Text size="md" color="dark.1" style={{ whiteSpace: "pre-wrap" }}>
                    {description}
                  </Text>
                </Stack>
              )}
            </Stack>
          </Container>
        </AnimatedBox>
      </Wrapper>

      {/* 灯箱模式 - 全屏查看 */}
      <Modal
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
            src={selectedImage}
            alt={title}
            sx={{ 
              maxWidth: "95vw", 
              maxHeight: "85vh", 
              objectFit: "contain",
              cursor: "zoom-in",
              touchAction: "manipulation", // 优化触摸体验
              WebkitUserSelect: "none", // 防止长按选中
              userSelect: "none",
            }}
            onDoubleClick={(e) => {
              // 双击切换缩放状态
              const img = e.currentTarget;
              if (img.style.transform === "scale(2)") {
                img.style.transform = "scale(1)";
              } else {
                img.style.transform = "scale(2)";
                img.style.transition = "transform 0.3s ease";
              }
            }}
            onTouchStart={(e) => {
              // 记录触摸起始位置（用于滑动切换）
              const touch = e.touches[0];
              (e.currentTarget as any).touchStartX = touch.clientX;
            }}
            onTouchEnd={(e) => {
              // 检测左右滑动
              const touch = e.changedTouches[0];
              const startX = (e.currentTarget as any).touchStartX;
              const diff = startX - touch.clientX;
              
              // 滑动距离超过 50px 才触发切换
              if (Math.abs(diff) > 50 && gallery.length > 1) {
                if (diff > 0) {
                  // 向左滑动 - 下一张
                  const newIndex = (selectedIndex + 1) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                } else {
                  // 向右滑动 - 上一张
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

              <Text color="dark.1" size="lg">
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
          
          <Text color="dark.1" size="sm" mt="xs" sx={{ opacity: 0.7 }}>
            {locale === "zh" ? "双击缩放 · 左右滑动切换" : "Double-tap to zoom · Swipe to navigate"}
          </Text>
        </Stack>
      </Modal>

      {isMobile && showInquiryButton && (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
            background: "rgba(15, 18, 22, 0.96)",
            borderTop: "1px solid rgba(216, 183, 109, 0.16)",
            backdropFilter: "blur(14px)",
          }}
        >
          <Button component={Link} href={inquiryHref} color="yellow" size="md" fullWidth>
            {locale === "zh" ? "咨询此藏品" : "Ask about this item"}
          </Button>
        </Box>
      )}
    </>
  );
}
