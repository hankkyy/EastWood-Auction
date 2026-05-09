import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatedBox, Wrapper } from "@/layout";
import { getKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
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

const getDisplayCategory = (artwork: Artwork, locale: "en" | "zh") => {
  if (["calligraphy", "misc", "porcelain", "jade", "bronze"].includes(artwork.category)) {
    switch (artwork.category) {
      case "calligraphy":
        return locale === "zh" ? "字画" : "Paintings & Calligraphy";
      case "porcelain":
        return locale === "zh" ? "瓷器" : "Porcelain";
      case "jade":
        return locale === "zh" ? "翡翠玉器" : "Jade";
      case "bronze":
        return locale === "zh" ? "铜器" : "Bronze";
      default:
        return locale === "zh" ? "杂项" : "Miscellaneous";
    }
  }

  return locale === "zh" && artwork.categoryZh ? artwork.categoryZh : artwork.category;
};

export default function CollectionDetailPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const collectionId = typeof router.query.id === "string" ? router.query.id : "";

  useEffect(() => {
    setItems(getKnowledgeBase());
  }, []);

  const item = useMemo(
    () => items.find((entry) => entry.id === collectionId && !entry.caseRecord),
    [collectionId, items]
  );

  const gallery = useMemo(
    () => (item ? [item.image, ...(item.galleryImages ?? []).filter((imageUrl) => imageUrl !== item.image)] : []),
    [item]
  );

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
  const period = locale === "zh" && item.periodZh ? item.periodZh : item.period;
  const category = getDisplayCategory(item, locale);
  const activeImage = selectedImage || gallery[0] || item.image;

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
          <Container py={64}>
            <Stack spacing="xl">
              <Button component={Link} href="/collections" variant="subtle" px={0} sx={{ alignSelf: "flex-start" }}>
                {t("collections.detailBack")}
              </Button>

              <Stack spacing="sm">
                <Badge color="blue" variant="filled" sx={{ alignSelf: "flex-start" }}>
                  {t("collections.exhibitionTitle")}
                </Badge>
                <Title order={1}>{title}</Title>
                <Text color="dark.1">{description}</Text>
                <Group spacing="xl">
                  <Text size="sm" color="dark.1">
                    {t("collections.detailCategory")}: {category}
                  </Text>
                  <Text size="sm" color="dark.1">
                    {t("collections.detailPeriod")}: {period}
                  </Text>
                </Group>
              </Stack>

              <Box sx={{ position: "relative" }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setLightboxOpened(true)}
                  sx={{
                    ...frameStyles,
                    height: 520,
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
                    <Text size="sm">{t("collections.detailZoom")}</Text>
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
                <Stack spacing="sm">
                  <Text size="sm" weight={700}>{t("collections.detailGallery")}</Text>
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
                              minWidth: 168,
                              width: 168,
                              height: 168,
                              padding: 10,
                              border: isActive
                                ? "2px solid #d8b76d"
                                : "1px solid rgba(216, 183, 109, 0.18)",
                              cursor: "pointer",
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
                </Stack>
              ) : null}
            </Stack>
          </Container>
        </AnimatedBox>
      </Wrapper>

      <Modal
        opened={lightboxOpened}
        onClose={() => setLightboxOpened(false)}
        withCloseButton
        centered
        size="95vw"
        styles={{
          content: {
            background: "#11161d",
          },
          body: {
            padding: 12,
          },
        }}
      >
        <Stack spacing="md">
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                ...frameStyles,
                minHeight: 560,
                padding: 18,
                border: "1px solid rgba(216, 183, 109, 0.18)",
              }}
            >
              <Box
                component="img"
                src={activeImage}
                alt={title}
                sx={{ maxWidth: "100%", maxHeight: "78vh", width: "auto", height: "auto", objectFit: "contain" }}
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
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(15, 18, 22, 0.84)",
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
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(15, 18, 22, 0.84)",
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
                        minWidth: 124,
                        width: 124,
                        height: 124,
                        padding: 8,
                        border: isActive
                          ? "2px solid #d8b76d"
                          : "1px solid rgba(216, 183, 109, 0.18)",
                        cursor: "pointer",
                      }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={`${title}-modal-${index + 1}`}
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
