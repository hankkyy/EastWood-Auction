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
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const collectionId = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    void fetchKnowledgeBase().then(setItems);
  }, []);

  const item = useMemo(
    () => items.find((entry) => entry.id === collectionId && !entry.caseRecord),
    [collectionId, items]
  );

  // 构建画廊图片数组（包含封面和所有 galleryImages）
  const gallery = useMemo(() => {
    if (!item) return [];
    const allImages = [item.image];
    if (item.galleryImages && item.galleryImages.length > 0) {
      // 添加 galleryImages 中不等于封面的图片
      item.galleryImages.forEach((img) => {
        if (img !== item.image) {
          allImages.push(img);
        }
      });
    }
    return allImages;
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
                href="/collections"
                variant="subtle"
                leftIcon={<IconChevronLeft size={16} />}
                sx={{ alignSelf: "flex-start" }}
              >
                {t("collections.detailBack")}
              </Button>

              {/* 标题和基本信息 */}
              <Stack spacing="md">
                <Title order={2}>{title}</Title>

                {item.collectionId && (
                  <Badge color="yellow" variant="filled" size="lg">
                    {locale === "zh" ? "藏品编号" : "ID"}: {item.collectionId}
                  </Badge>
                )}

                {item.isForSale && item.price && (
                  <Group spacing="sm">
                    <Badge color="green" variant="filled" size="lg">
                      {locale === "zh" ? "可售" : "For Sale"}
                    </Badge>
                    <Text size="xl" weight={700} color="yellow">
                      {item.currency === "CNY" ? "¥" : "$"}
                      {item.price.toLocaleString()}
                    </Text>
                  </Group>
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
                            sx={{ width: "100%", height: 80, objectFit: "cover" }}
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
                  <Title order={4}>藏品介绍</Title>
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
      >
        <Stack align="center" justify="center" sx={{ height: "100%" }}>
          <Box
            component="img"
            src={selectedImage}
            alt={title}
            sx={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain" }}
          />

          {gallery.length > 1 && (
            <Group position="center" spacing="xl">
              <ActionIcon
                size="xl"
                variant="filled"
                onClick={() => {
                  const newIndex = (selectedIndex - 1 + gallery.length) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                }}
              >
                <IconChevronLeft size={24} />
              </ActionIcon>

              <Text color="dark.1">
                {selectedIndex + 1} / {gallery.length}
              </Text>

              <ActionIcon
                size="xl"
                variant="filled"
                onClick={() => {
                  const newIndex = (selectedIndex + 1) % gallery.length;
                  setSelectedImage(gallery[newIndex]);
                }}
              >
                <IconChevronRight size={24} />
              </ActionIcon>
            </Group>
          )}
        </Stack>
      </Modal>
    </>
  );
}
