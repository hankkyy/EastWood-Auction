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
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

export default function CollectionDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const collectionId = typeof router.query.id === "string" ? router.query.id : "";

  // ✅ 检测来源页面，决定返回路径
  const backPath = useMemo(() => {
    const referer = document.referrer;
    if (referer.includes("/shop")) {
      return "/shop"; // 从古董商店进入，返回商店
    }
    return "/collections"; // 默认返回藏品展示
  }, []);

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

  return (
    <>
      <Head>
        <title>{title} - Eastwood Auction</title>
      </Head>

      <Wrapper>
        <AnimatedBox>
          <Container py={80}>
            <Stack spacing="xl">
              {/* 返回按钮 */}
              <Button
                component={Link}
                href={backPath}
                variant="subtle"
                leftIcon={<IconChevronLeft size={16} />}
                sx={{ alignSelf: "flex-start" }}
              >
                {backPath === "/shop" 
                  ? (locale === "zh" ? "返回古董商店" : "Back to Shop")
                  : t("collections.detailBack")
                }
              </Button>

              {/* 标题和基本信息 */}
              <Stack spacing="md">
                <Title order={2}>{title}</Title>

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
                  <Group spacing="sm">
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
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  minHeight: 400,
                }}
              >
                <Box
                  component="img"
                  src={selectedImage}
                  alt={title}
                  sx={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    cursor: gallery.length > 1 ? "pointer" : "default",
                  }}
                  onClick={() => gallery.length > 1 && setLightboxOpened(true)}
                />
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
                        onClick={() => {
                          const newIndex = (selectedIndex - 1 + gallery.length) % gallery.length;
                          setSelectedImage(gallery[newIndex]);
                        }}
                      >
                        <IconChevronLeft size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        onClick={() => {
                          const newIndex = (selectedIndex + 1) % gallery.length;
                          setSelectedImage(gallery[newIndex]);
                        }}
                      >
                        <IconChevronRight size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <ScrollArea type="always" offsetScrollbars>
                    <SimpleGrid cols={6} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 3 }]}>
                      {gallery.map((imageUrl, index) => (
                        <Box
                          key={index}
                          onClick={() => setSelectedImage(imageUrl)}
                          sx={{
                            border: selectedImage === imageUrl ? "2px solid #d8b76d" : "1px solid transparent",
                            borderRadius: 6,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.2s",
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
                              width: "100%", 
                              height: 80, 
                              objectFit: "contain",
                              backgroundColor: "rgba(34, 39, 47, 0.5)"
                            }}
                          />
                        </Box>
                      ))}
                    </SimpleGrid>
                  </ScrollArea>
                </Stack>
              )}

              {/* 藏品介绍 */}
              {description && (
                <Stack spacing="sm">
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
        padding="xl"
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
            <Group position="center" spacing="xl" mt="md">
              <ActionIcon
                size="xl"
                variant="filled"
                onClick={() => {
                  const newIndex = (selectedIndex - 1 + gallery.length) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                }}
                styles={{
                  root: {
                    width: 56, // 增大触摸区域
                    height: 56,
                  },
                }}
              >
                <IconChevronLeft size={28} />
              </ActionIcon>

              <Text color="dark.1" size="lg">
                {selectedIndex + 1} / {gallery.length}
              </Text>

              <ActionIcon
                size="xl"
                variant="filled"
                onClick={() => {
                  const newIndex = (selectedIndex + 1) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                }}
                styles={{
                  root: {
                    width: 56, // 增大触摸区域
                    height: 56,
                  },
                }}
              >
                <IconChevronRight size={28} />
              </ActionIcon>
            </Group>
          )}
          
          <Text color="dark.1" size="sm" mt="xs" sx={{ opacity: 0.7 }}>
            {locale === "zh" ? "双击缩放 · 左右滑动切换" : "Double-tap to zoom · Swipe to navigate"}
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
