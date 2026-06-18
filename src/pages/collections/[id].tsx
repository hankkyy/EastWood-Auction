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
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [uploaderEmail, setUploaderEmail] = useState<string | null>(null);
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
          console.error("[CollectionDetailPage] Failed to load uploader email:", error);
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
          <Container py={isMobile ? 28 : 60} px={isMobile ? 16 : undefined} size="lg">
            {/* 返回按钮 */}
            <Button
              component={Link}
              href="/collections"
              variant="subtle"
              size="sm"
              leftIcon={<IconChevronLeft size={16} />}
              mb="xl"
              sx={(theme) => ({
                color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                "&:hover": { backgroundColor: "transparent", color: "#c4a255" },
              })}
            >
              {t("collections.detailBack")}
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
                  {/* 主图 */}
                  <Box
                    sx={(theme) => ({
                      background: theme.colorScheme === "dark" ? "#141210" : "#faf7f2",
                      borderRadius: 4,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: theme.colorScheme === "dark"
                        ? "0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)"
                        : "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
                    })}
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
                        cursor: gallery.length > 1 ? "zoom-in" : "default",
                        transition: "background-image 300ms ease",
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
                          background: theme.colorScheme === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.5)",
                          color: "#fff",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontFamily: "monospace",
                          letterSpacing: "0.05em",
                        })}
                      >
                        {gallery.indexOf(selectedImage) + 1} / {gallery.length}
                      </Text>
                    )}
                  </Box>

                  {/* 缩略图导航 */}
                  {gallery.length > 1 && (
                    <Group spacing="xs" position="center">
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={goToPrevious}
                      >
                        <IconChevronLeft size={14} />
                      </ActionIcon>
                      <ScrollArea type="hover" offsetScrollbars>
                        <Group spacing={6} noWrap>
                          {gallery.map((imageUrl, index) => (
                            <Box
                              key={index}
                              onClick={() => setSelectedImage(imageUrl)}
                              sx={(theme) => ({
                                width: 56,
                                height: 56,
                                borderRadius: 4,
                                overflow: "hidden",
                                cursor: "pointer",
                                border: selectedImage === imageUrl
                                  ? "2px solid #c4a255"
                                  : "2px solid transparent",
                                opacity: selectedImage === imageUrl ? 1 : 0.55,
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
                          ))}
                        </Group>
                      </ScrollArea>
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={goToNext}
                      >
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

              {/* ===== 右栏：藏品详情 ===== */}
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
                      {item.collectionId && (
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
                          {item.collectionId}
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

                    {/* 价格 */}
                    {item.isForSale && item.price ? (
                      <Group spacing="xs" align="baseline">
                        <Badge color="yellow" variant="filled" size="lg">
                          {t("collections.forSaleLabel")}
                        </Badge>
                        <Text
                          size={isMobile ? 24 : 30}
                          weight={700}
                          sx={{ color: "#c4a255", fontFamily: "Georgia, serif" }}
                        >
                          {item.currency === "CNY" ? "¥" : "$"}{item.price.toLocaleString()}
                        </Text>
                      </Group>
                    ) : (
                      <Badge color="gray" variant="filled" size="lg">
                        {t("collections.notForSaleLabel")}
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
                      {t("home.bookButton")}
                    </Button>
                  )}

                  {/* 藏品描述 */}
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
                        {locale === "zh" ? "藏品介绍" : "Description"}
                      </Text>
                      <Text
                        size="md"
                        sx={(theme) => ({
                          color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                          lineHeight: 1.8,
                          whiteSpace: "pre-wrap",
                        })}
                      >
                        {description}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
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
