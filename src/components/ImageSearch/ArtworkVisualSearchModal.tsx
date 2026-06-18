import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconCamera,
  IconPhoto,
  IconPhotoSearch,
  IconRotateClockwise2,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";

type MatchResult = {
  artwork: Artwork;
  similarity: number;
};

type ArtworkVisualSearchModalProps = {
  opened: boolean;
  onClose: () => void;
};

const getLocalized = (
  locale: "zh" | "en",
  primary: string,
  secondary?: string
) => (locale === "zh" && secondary ? secondary : primary);

const getDetailHref = (artwork: Artwork) => {
  if (artwork.caseRecord) return `/cases/${artwork.id}`;
  return artwork.listingType === "product"
    ? `/shop/${artwork.id}`
    : `/collections/${artwork.id}`;
};

const getTypeLabel = (locale: "zh" | "en", artwork: Artwork) => {
  if (artwork.caseRecord) {
    return locale === "zh" ? "回流案例" : "Return case";
  }

  return artwork.listingType === "product"
    ? locale === "zh"
      ? "商品"
      : "Product"
    : locale === "zh"
      ? "藏品"
      : "Collection";
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the image file."));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode the image."));
    image.src = src;
  });

const compressImageDataUrl = async (
  dataUrl: string,
  maxEdge = 1280,
  quality = 0.72
) => {
  const image = await loadImageElement(dataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const longestEdge = Math.max(width, height);

  if (!longestEdge) {
    return dataUrl;
  }

  const ratio = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return dataUrl;
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const candidates = [quality, 0.6, 0.5, 0.42];

  for (const nextQuality of candidates) {
    const encoded = canvas.toDataURL("image/jpeg", nextQuality);
    if (encoded.length <= 1_600_000 || nextQuality === candidates[candidates.length - 1]) {
      return encoded;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.42);
};

export default function ArtworkVisualSearchModal({
  opened,
  onClose,
}: ArtworkVisualSearchModalProps) {
  const { locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "matching">(
    "idle"
  );
  const [results, setResults] = useState<MatchResult[]>([]);
  const [threshold, setThreshold] = useState(0.2);

  const isBusy = status !== "idle";

  const helperText = useMemo(
    () =>
      locale === "zh"
        ? "拍照或选择一张藏品图片。图片会上传到云端识图目录，并返回最相近的 5 件藏品。"
        : "Capture or choose an image. It will be uploaded to cloud storage and matched against the top 5 closest artworks.",
    [locale]
  );

  const resetState = () => {
    setPreviewUrl("");
    setSelectedFileName("");
    setResults([]);
    setStatus("idle");
    setThreshold(0.2);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const preparedDataUrl = await compressImageDataUrl(dataUrl);
      setPreviewUrl(preparedDataUrl);
      setSelectedFileName(file.name || "query-image");
      setResults([]);
    } catch (error) {
      notifications.show({
        color: "red",
        title: locale === "zh" ? "图片读取失败" : "Image read failed",
        message:
          error instanceof Error
            ? error.message
            : locale === "zh"
              ? "无法读取你选择的图片。"
              : "The selected image could not be read.",
      });
    }
  };

  const runVisualSearch = async () => {
    if (!previewUrl) {
      notifications.show({
        color: "yellow",
        title: locale === "zh" ? "请先选择图片" : "Select an image first",
        message:
          locale === "zh"
            ? "先拍照或从相册选择一张图片。"
            : "Capture or choose an image before matching.",
      });
      return;
    }

    try {
      setStatus("matching");
      const matchResponse = await fetch("/api/image-search/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: previewUrl,
          threshold,
          matchCount: 5,
        }),
      });

      const matchBody = await matchResponse.json();
      if (!matchResponse.ok) {
        throw new Error(matchBody.error || "Visual match failed.");
      }

      setResults(matchBody.matches ?? []);
      notifications.show({
        color: "teal",
        title: locale === "zh" ? "识图完成" : "Visual search complete",
        message:
          locale === "zh"
            ? `已返回 ${matchBody.matches?.length ?? 0} 条匹配结果。`
            : `${matchBody.matches?.length ?? 0} matches returned.`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: locale === "zh" ? "识图失败" : "Visual search failed",
        message:
          error instanceof Error
            ? error.message
            : locale === "zh"
              ? "暂时无法完成识图，请稍后再试。"
              : "The visual search is temporarily unavailable.",
      });
    } finally {
      setStatus("idle");
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={locale === "zh" ? "拍照识图" : "Visual Search"}
      size="xl"
      centered
      styles={{
        content: {
          background:
            "linear-gradient(180deg, rgba(19, 23, 30, 0.98), rgba(13, 17, 24, 0.98))",
          border: "1px solid rgba(216, 183, 109, 0.24)",
        },
        header: {
          background: "transparent",
        },
        title: {
          color: "#f3e7c2",
          fontWeight: 700,
          ...(theme.colorScheme === "light" && { color: theme.colors.dark[0] }),
        },
      }}
    >
      <Stack spacing="lg">
        <Card
          radius="md"
          p={isMobile ? "md" : "lg"}
          sx={{
            background:
              "linear-gradient(135deg, rgba(39, 46, 57, 0.96), rgba(19, 24, 31, 0.98))",
            border: "1px solid rgba(216, 183, 109, 0.2)",
          }}
        >
          <Stack spacing="md">
            <Group align="flex-start" position="apart" noWrap={!isMobile}>
              <Group align="flex-start" spacing="sm" noWrap>
                <ActionIcon
                  size={42}
                  radius="md"
                  variant="filled"
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(216, 183, 109, 0.95), rgba(200, 156, 61, 0.95))",
                    color: "#151a20",
                    flexShrink: 0,
                  }}
                >
                  <IconPhotoSearch size={20} />
                </ActionIcon>
                <div>
                  <Title order={4} color="#f8edd2">
                    {locale === "zh" ? "拍照识图" : "Visual Search"}
                  </Title>
                  <Text size="sm" color="dimmed" mt={4}>
                    {helperText}
                  </Text>
                </div>
              </Group>
              <Badge
                variant="filled"
                sx={{
                  backgroundColor: "rgba(216, 183, 109, 0.18)",
                  border: "1px solid rgba(216, 183, 109, 0.45)",
                  color: "#f8edd2",
                }}
              >
                {locale === "zh" ? "云端匹配 Top 5" : "Cloud Top 5"}
              </Badge>
            </Group>

            <Group grow>
              <Button
                leftIcon={<IconCamera size={18} />}
                onClick={() => cameraInputRef.current?.click()}
                variant="filled"
                sx={{
                  background:
                    "linear-gradient(135deg, #d8b76d 0%, #c89c3d 100%)",
                  color: "#151a20",
                  boxShadow: "0 10px 24px rgba(200, 156, 61, 0.28)",
                }}
              >
                {locale === "zh" ? "拍照" : "Capture"}
              </Button>
              <Button
                leftIcon={<IconPhoto size={18} />}
                onClick={() => galleryInputRef.current?.click()}
                variant="default"
                sx={{
                  backgroundColor: "rgba(20, 26, 34, 0.92)",
                  color: "#f3e7c2",
                  borderColor: "rgba(216, 183, 109, 0.22)",
                }}
              >
                {locale === "zh" ? "从相册选择" : "Choose from gallery"}
              </Button>
            </Group>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => handleFileChange(event.currentTarget.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => handleFileChange(event.currentTarget.files?.[0])}
            />

            {previewUrl ? (
              <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                <Card
                  radius="md"
                  p="sm"
                  sx={{
                    backgroundColor: "rgba(11, 15, 21, 0.9)",
                    border: "1px solid rgba(216, 183, 109, 0.16)",
                  }}
                >
                  <Stack spacing="sm">
                    <Text size="sm" color="#f3e7c2" weight={600}>
                      {locale === "zh" ? "待识别图片" : "Image preview"}
                    </Text>
                    <Box
                      sx={{
                        minHeight: 260,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: "#11161d",
                      }}
                    >
                      <Image src={previewUrl} alt="preview" fit="contain" height={320} />
                    </Box>
                    <Text size="xs" color="dimmed" sx={{ overflowWrap: "anywhere" }}>
                      {selectedFileName}
                    </Text>
                  </Stack>
                </Card>

                <Card
                  radius="md"
                  p="sm"
                  sx={{
                    backgroundColor: "rgba(11, 15, 21, 0.9)",
                    border: "1px solid rgba(216, 183, 109, 0.16)",
                  }}
                >
                  <Stack spacing="md" h="100%">
                    <div>
                      <Text size="sm" color="#f3e7c2" weight={600}>
                        {locale === "zh" ? "匹配设置" : "Match settings"}
                      </Text>
                      <Text size="sm" color="dimmed" mt={6}>
                        {locale === "zh"
                          ? "当前阈值为 0.2，相似度低于阈值的结果会被过滤。"
                          : "Current threshold is 0.2. Results below the threshold are filtered out."}
                      </Text>
                    </div>
                    <Badge
                      variant="outline"
                      sx={{
                        width: "fit-content",
                        borderColor: "rgba(216, 183, 109, 0.45)",
                        color: "#f8edd2",
                      }}
                    >
                      {locale === "zh"
                        ? `阈值 ${threshold.toFixed(1)} / Top 5`
                        : `Threshold ${threshold.toFixed(1)} / Top 5`}
                    </Badge>
                    <Group grow mt="auto">
                      <Button
                        leftIcon={isBusy ? <Loader size={16} color="dark" /> : <IconSparkles size={18} />}
                        onClick={runVisualSearch}
                        disabled={isBusy}
                        sx={{
                          background:
                            "linear-gradient(135deg, #d8b76d 0%, #c89c3d 100%)",
                          color: "#151a20",
                        }}
                      >
                        {status === "uploading"
                          ? locale === "zh"
                            ? "上传中..."
                            : "Uploading..."
                          : status === "matching"
                            ? locale === "zh"
                              ? "识图中..."
                              : "Matching..."
                            : locale === "zh"
                              ? "开始识图"
                              : "Run visual search"}
                      </Button>
                      <Button
                        variant="default"
                        leftIcon={<IconRotateClockwise2 size={18} />}
                        onClick={resetState}
                        disabled={isBusy}
                        sx={{
                          backgroundColor: "rgba(20, 26, 34, 0.92)",
                          color: "#f3e7c2",
                          borderColor: "rgba(216, 183, 109, 0.22)",
                        }}
                      >
                        {locale === "zh" ? "重新选择" : "Reset"}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </SimpleGrid>
            ) : null}
          </Stack>
        </Card>

        {previewUrl ? <Divider color="rgba(216, 183, 109, 0.18)" /> : null}

        {previewUrl ? (
          <Stack spacing="md">
            <Group position="apart" align="center">
              <Title order={4} color="#f8edd2">
                {locale === "zh" ? "匹配结果" : "Matched artworks"}
              </Title>
              <Text size="sm" color="dimmed">
                {locale === "zh"
                  ? `${results.length} 条结果`
                  : `${results.length} results`}
              </Text>
            </Group>

            {results.length > 0 ? (
              <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                {results.map(({ artwork, similarity }) => (
                  <Card
                    key={`${artwork.id}-${similarity}`}
                    radius="md"
                    p="sm"
                    sx={{
                      background:
                        "linear-gradient(180deg, rgba(22, 27, 34, 0.98), rgba(14, 18, 24, 0.98))",
                      border: "1px solid rgba(216, 183, 109, 0.16)",
                    }}
                  >
                    <Stack spacing="sm">
                      <Box
                        sx={{
                          height: 180,
                          borderRadius: 10,
                          overflow: "hidden",
                          backgroundColor: "#11161d",
                        }}
                      >
                        <Image
                          src={artwork.image}
                          alt={getLocalized(locale, artwork.title, artwork.titleZh)}
                          fit="contain"
                          height={180}
                        />
                      </Box>
                      <Group position="apart" noWrap={false}>
                        <Badge color={artwork.caseRecord ? "grape" : artwork.listingType === "product" ? "teal" : "blue"}>
                          {getTypeLabel(locale, artwork)}
                        </Badge>
                        <Badge
                          variant="filled"
                          sx={{
                            backgroundColor: "rgba(216, 183, 109, 0.18)",
                            border: "1px solid rgba(216, 183, 109, 0.45)",
                            color: "#f8edd2",
                          }}
                        >
                          {locale === "zh"
                            ? `相似度 ${(similarity * 100).toFixed(1)}%`
                            : `${(similarity * 100).toFixed(1)}% match`}
                        </Badge>
                      </Group>
                      <Title order={5} color="#f8edd2" sx={{ lineHeight: 1.45 }}>
                        {getLocalized(locale, artwork.title, artwork.titleZh)}
                      </Title>
                      <Text size="sm" color="dimmed" lineClamp={2}>
                        {getLocalized(
                          locale,
                          artwork.description,
                          artwork.descriptionZh
                        )}
                      </Text>
                      <Button
                        component={Link}
                        href={getDetailHref(artwork)}
                        fullWidth
                        rightIcon={<IconArrowRight size={16} />}
                        sx={{
                          background:
                            "linear-gradient(135deg, #d8b76d 0%, #c89c3d 100%)",
                          color: "#151a20",
                        }}
                      >
                        {locale === "zh" ? "查看详情" : "View details"}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Card
                radius="md"
                p="lg"
                sx={{
                  backgroundColor: "rgba(11, 15, 21, 0.9)",
                  border: "1px dashed rgba(216, 183, 109, 0.24)",
                }}
              >
                <Group align="flex-start" noWrap>
                  <IconUpload size={18} color="#d8b76d" />
                  <Text size="sm" color="dimmed">
                    {locale === "zh"
                      ? "上传图片并开始识图后，这里会展示最相近的藏品。当前没有返回高于阈值的结果。"
                      : "Results will appear here after upload. No matches above the threshold were returned yet."}
                  </Text>
                </Group>
              </Card>
            )}
          </Stack>
        ) : null}
      </Stack>
    </Modal>
  );
}
