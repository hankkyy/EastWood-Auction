import {
  clearImportedArtworks,
  getImportedArtworks,
  getKnowledgeBase,
  saveImportedArtwork,
} from "@/features/image-search/artworkKnowledgeBase";
import {
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
} from "@/features/image-search/adminAuth";
import {
  extractImageFeature,
  getFeatureInsights,
  readImageAsDataUrl,
  searchSimilarArtworks,
} from "@/features/image-search/imageSearch";
import type { Artwork } from "@/data/artworks";
import type {
  FeatureInsight,
  ImageFeature,
  ImageSearchResult,
} from "@/features/image-search/imageSearch";
import { useI18n } from "@/i18n";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  createStyles,
  Divider,
  FileButton,
  Group,
  Image,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconChartBar,
  IconDatabaseImport,
  IconLock,
  IconLogout,
  IconPhotoSearch,
  IconRefresh,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";

const isObjectUrl = (url: string) => url.startsWith("blob:");

const useStyles = createStyles((theme) => ({
  shell: {
    minHeight: "calc(100vh - 104px)",
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  intro: {
    maxWidth: 920,
    marginBottom: theme.spacing.xl,
  },

  uploadPanel: {
    border: `1px solid rgba(216, 183, 109, 0.22)`,
    background:
      "linear-gradient(135deg, rgba(32, 38, 46, 0.96), rgba(20, 25, 31, 0.96))",
  },

  previewFrame: {
    minHeight: 320,
    border: `1px dashed rgba(216, 183, 109, 0.36)`,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(15, 18, 22, 0.7)",
    overflow: "hidden",
  },

  emptyPreview: {
    minHeight: 320,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: theme.colors.dark[1],
  },

  resultCard: {
    height: "100%",
    border: `1px solid rgba(216, 183, 109, 0.18)`,
    backgroundColor: theme.colors.dark[6],
  },

  insightCard: {
    border: `1px solid rgba(216, 183, 109, 0.18)`,
    backgroundColor: "rgba(15, 18, 22, 0.56)",
  },

  metricRow: {
    display: "grid",
    gridTemplateColumns: "7rem 1fr 3rem",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
}));

export default function ImageSearchExperience() {
  const { classes, theme } = useStyles();
  const { t } = useI18n();
  const [mode, setMode] = useState<"match" | "manage">("match");
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<Artwork[]>(
    () => getKnowledgeBase()
  );
  const [importedArtworks, setImportedArtworks] = useState<Artwork[]>(
    () => getImportedArtworks()
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [feature, setFeature] = useState<ImageFeature | null>(null);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [adminPreviewUrl, setAdminPreviewUrl] = useState<string | null>(null);
  const [adminFeature, setAdminFeature] = useState<ImageFeature | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminCategory, setAdminCategory] = useState("");
  const [adminPeriod, setAdminPeriod] = useState("");
  const [adminDescription, setAdminDescription] = useState("");

  const featureInsights: FeatureInsight[] = feature
    ? getFeatureInsights(feature.vector)
    : [];
  const strongestInsight = featureInsights.reduce<FeatureInsight | null>(
    (strongest, insight) =>
      !strongest || insight.value > strongest.value ? insight : strongest,
    null
  );
  const resultList = results.length
    ? results
    : knowledgeBase.map((artwork) => ({
        artwork,
        score: 0,
      }));

  const refreshKnowledgeBase = () => {
    setKnowledgeBase(getKnowledgeBase());
    setImportedArtworks(getImportedArtworks());
  };

  const handleAdminLogin = () => {
    if (loginAdmin(adminPassword)) {
      setIsAdmin(true);
      setAdminPassword("");
      setLoginError(null);
      return;
    }

    setLoginError(t("image.loginError"));
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    setAdminPassword("");
    setLoginError(null);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const feature = await extractImageFeature(file);

      if (previewUrl && isObjectUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(feature.previewUrl);
      setFileName(file.name);
      setFeature(feature);
      setResults(searchSimilarArtworks(feature.vector, knowledgeBase));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to analyze this image."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleDemoSearch = (artworkId: string) => {
    const artwork = knowledgeBase.find((item) => item.id === artworkId);

    if (!artwork) {
      return;
    }

    if (previewUrl && isObjectUrl(previewUrl)) {
      URL.revokeObjectURL(previewUrl);
    }

    const demoFeature: ImageFeature = {
      previewUrl: artwork.image,
      vector: artwork.featureVector,
    };

    setError(null);
    setFileName(`${artwork.title} sample`);
    setPreviewUrl(demoFeature.previewUrl);
    setFeature(demoFeature);
    setResults(searchSimilarArtworks(demoFeature.vector, knowledgeBase));
  };

  const handleAdminUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setAdminError(null);

    try {
      const [feature, storedImageUrl] = await Promise.all([
        extractImageFeature(file),
        readImageAsDataUrl(file),
      ]);

      if (adminPreviewUrl && isObjectUrl(adminPreviewUrl)) {
        URL.revokeObjectURL(adminPreviewUrl);
      }

      setAdminPreviewUrl(storedImageUrl);
      setAdminFeature({
        ...feature,
        previewUrl: storedImageUrl,
      });
      setAdminTitle(file.name.replace(/\.[^/.]+$/, ""));
    } catch (uploadError) {
      setAdminError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to import this image."
      );
    }
  };

  const handleSaveToKnowledgeBase = () => {
    if (!adminPreviewUrl || !adminFeature) {
      setAdminError("Please upload an image before importing.");
      return;
    }

    const nextArtwork: Artwork = {
      id: `imported-${Date.now()}`,
      title: adminTitle || "Untitled artwork",
      category: adminCategory || "Uncategorized",
      period: adminPeriod || "Unknown period",
      image: adminPreviewUrl,
      description:
        adminDescription ||
        "Imported by an administrator for local image matching.",
      featureVector: adminFeature.vector,
    };

    saveImportedArtwork(nextArtwork);
    refreshKnowledgeBase();
    setMode("match");
    setResults([]);
    setAdminTitle("");
    setAdminCategory("");
    setAdminPeriod("");
    setAdminDescription("");
    setAdminError(null);
  };

  const handleClearImportedArtworks = () => {
    clearImportedArtworks();
    refreshKnowledgeBase();
    setResults([]);
  };

  const handleReset = () => {
    if (previewUrl && isObjectUrl(previewUrl)) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setFileName(null);
    setFeature(null);
    setResults([]);
    setError(null);
  };

  return (
    <Box className={classes.shell}>
      <Container fluid>
        <Stack spacing="xl" className={classes.intro}>
          <Badge color="violet.7" variant="outline" size="lg">
            {t("image.badge")}
          </Badge>
          <Title size={56}>{t("image.title")}</Title>
          <Text size="lg" color="dark.1">
            {t("image.description")}
          </Text>
          <SegmentedControl
            value={mode}
            onChange={(value) => setMode(value as "match" | "manage")}
            data={[
              { label: t("image.userMode"), value: "match" },
              { label: t("image.adminMode"), value: "manage" },
            ]}
          />
        </Stack>

        {mode === "manage" && !isAdmin ? (
          <SimpleGrid
            cols={2}
            spacing="xl"
            breakpoints={[
              { maxWidth: "md", cols: 1, spacing: "lg" },
              { maxWidth: "sm", cols: 1, spacing: "md" },
            ]}
          >
            <Paper p="xl" className={classes.uploadPanel}>
              <Stack spacing="lg">
                <Group spacing="xs">
                  <IconLock size={22} color={theme.colors.violet[7]} />
                  <Title order={2}>{t("image.loginTitle")}</Title>
                </Group>
                <Text color="dark.1">{t("image.loginDescription")}</Text>
                {loginError ? (
                  <Alert color="red" title={t("image.loginFailed")}>
                    {loginError}
                  </Alert>
                ) : null}
                <TextInput
                  label={t("image.password")}
                  type="password"
                  value={adminPassword}
                  onChange={(event) =>
                    setAdminPassword(event.currentTarget.value)
                  }
                  placeholder={t("image.passwordPlaceholder")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleAdminLogin();
                    }
                  }}
                />
                <Button
                  leftIcon={<IconLock size={18} />}
                  onClick={handleAdminLogin}
                  disabled={!adminPassword}
                >
                  {t("image.loginButton")}
                </Button>
                <Text size="sm" color="dark.1">
                  {t("image.demoPassword")}
                </Text>
              </Stack>
            </Paper>
            <Paper p="xl" className={classes.insightCard}>
              <Stack spacing="sm">
                <Title order={2}>{t("image.adminProtectedTitle")}</Title>
                <Text color="dark.1">{t("image.adminProtectedDescription")}</Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        ) : mode === "manage" ? (
          <SimpleGrid
            cols={2}
            spacing="xl"
            breakpoints={[
              { maxWidth: "md", cols: 1, spacing: "lg" },
              { maxWidth: "sm", cols: 1, spacing: "md" },
            ]}
          >
            <Paper p="xl" className={classes.uploadPanel}>
              <Stack spacing="lg">
                <Group position="apart">
                  <div>
                    <Title order={2}>{t("image.adminTitle")}</Title>
                    <Text color="dark.1">
                      {t("image.adminDescription")}
                    </Text>
                  </div>
                  <FileButton onChange={handleAdminUpload} accept="image/*">
                    {(props) => (
                      <Button {...props} leftIcon={<IconDatabaseImport size={18} />}>
                        {t("image.uploadAsset")}
                      </Button>
                    )}
                  </FileButton>
                </Group>
                <Group position="right">
                  <Button
                    variant="subtle"
                    leftIcon={<IconLogout size={18} />}
                    onClick={handleAdminLogout}
                  >
                    {t("image.logout")}
                  </Button>
                </Group>

                {adminError ? (
                  <Alert color="red" title={t("image.importFailed")}>
                    {adminError}
                  </Alert>
                ) : null}

                <Box className={classes.previewFrame}>
                  {adminPreviewUrl ? (
                    <Image
                      src={adminPreviewUrl}
                      alt="Admin imported artwork preview"
                      height={320}
                      fit="contain"
                    />
                  ) : (
                    <Stack spacing="sm" className={classes.emptyPreview}>
                      <IconDatabaseImport
                        size={44}
                        color={theme.colors.violet[7]}
                      />
                      <Text weight={600}>{t("image.adminEmptyTitle")}</Text>
                      <Text size="sm" color="dark.1">
                        {t("image.adminEmptyDescription")}
                      </Text>
                    </Stack>
                  )}
                </Box>

                <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                  <TextInput
                    label={t("image.fieldTitle")}
                    value={adminTitle}
                    onChange={(event) => setAdminTitle(event.currentTarget.value)}
                    placeholder={t("image.placeholderTitle")}
                  />
                  <TextInput
                    label={t("image.fieldCategory")}
                    value={adminCategory}
                    onChange={(event) =>
                      setAdminCategory(event.currentTarget.value)
                    }
                    placeholder={t("image.placeholderCategory")}
                  />
                  <TextInput
                    label={t("image.fieldPeriod")}
                    value={adminPeriod}
                    onChange={(event) => setAdminPeriod(event.currentTarget.value)}
                    placeholder={t("image.placeholderPeriod")}
                  />
                  <NumberInput
                    label={t("image.fieldVectors")}
                    value={knowledgeBase.length}
                    disabled
                  />
                </SimpleGrid>

                <Textarea
                  label={t("image.fieldDescription")}
                  value={adminDescription}
                  onChange={(event) =>
                    setAdminDescription(event.currentTarget.value)
                  }
                  placeholder={t("image.placeholderDescription")}
                  minRows={3}
                />

                <Group position="apart">
                  <Button
                    variant="outline"
                    color="red"
                    onClick={handleClearImportedArtworks}
                    disabled={importedArtworks.length === 0}
                  >
                    {t("image.clearImported")}
                  </Button>
                  <Button onClick={handleSaveToKnowledgeBase}>
                    {t("image.importButton")}
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <Stack spacing="md">
              <Group position="apart">
                <Title order={2}>{t("image.knowledgeBase")}</Title>
                <Badge color="violet.9">
                  {knowledgeBase.length} {t("image.searchablePhotos")}
                </Badge>
              </Group>
              <Paper p="md" className={classes.insightCard}>
                <Stack spacing="xs">
                  <Text weight={700}>{t("image.currentIndex")}</Text>
                  <Text color="dark.1">
                    {importedArtworks.length} {t("image.adminImported")}
                  </Text>
                </Stack>
              </Paper>
              {knowledgeBase.map((artwork) => (
                <Paper key={artwork.id} p="md" className={classes.resultCard}>
                  <Group align="center" noWrap>
                    <Image
                      src={artwork.image}
                      alt={artwork.title}
                      width={112}
                      height={88}
                      radius="sm"
                      fit="cover"
                    />
                    <Stack spacing={4}>
                      <Group spacing="xs">
                        <Badge color="violet.7" variant="outline">
                          {artwork.category}
                        </Badge>
                        {artwork.id.startsWith("imported-") ? (
                          <Badge color="violet.9">{t("image.imported")}</Badge>
                        ) : null}
                      </Group>
                      <Text weight={700}>{artwork.title}</Text>
                      <Text size="sm" color="dark.1">
                        {artwork.period}
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </SimpleGrid>
        ) : (
          <SimpleGrid
            cols={2}
            spacing="xl"
            breakpoints={[
              { maxWidth: "md", cols: 1, spacing: "lg" },
              { maxWidth: "sm", cols: 1, spacing: "md" },
            ]}
          >
            <Paper p="xl" className={classes.uploadPanel}>
            <Stack spacing="lg">
              <Group position="apart" align="center">
                <div>
                  <Title order={2}>{t("image.referenceTitle")}</Title>
                  <Text color="dark.1">
                    {fileName ?? t("image.uploadHelp")}
                  </Text>
                </div>
                <FileButton onChange={handleUpload} accept="image/*">
                  {(props) => (
                    <Button
                      {...props}
                      leftIcon={<IconUpload size={18} />}
                      loading={isSearching}
                    >
                      {t("image.upload")}
                    </Button>
                  )}
                </FileButton>
              </Group>

              {error ? (
                <Alert color="red" title={t("image.errorTitle")}>
                  {error}
                </Alert>
              ) : null}

              <Box className={classes.previewFrame}>
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Uploaded search reference"
                    height={320}
                    fit="contain"
                  />
                ) : (
                  <Stack spacing="sm" className={classes.emptyPreview}>
                    <IconPhotoSearch size={44} color={theme.colors.violet[7]} />
                    <Text weight={600}>{t("image.emptyTitle")}</Text>
                    <Text size="sm" color="dark.1">
                      {t("image.emptyDescription")}
                    </Text>
                  </Stack>
                )}
              </Box>

              <Group position="apart">
                <Text size="sm" color="dark.1">
                  {strongestInsight
                    ? `${t("image.dominantSignal")}: ${strongestInsight.label.toLowerCase()}`
                    : t("image.localMatching")}
                </Text>
                <Button
                  variant="outline"
                  leftIcon={<IconRefresh size={18} />}
                  onClick={handleReset}
                  disabled={!previewUrl && results.length === 0}
                >
                  {t("image.reset")}
                </Button>
              </Group>

              <Stack spacing="xs">
                <Text size="sm" weight={700}>
                  {t("image.trySample")}
                </Text>
                <Group spacing="xs">
                  {knowledgeBase.slice(0, 4).map((artwork) => (
                    <Button
                      key={artwork.id}
                      variant="light"
                      size="xs"
                      onClick={() => handleDemoSearch(artwork.id)}
                    >
                      {artwork.category}
                    </Button>
                  ))}
                </Group>
              </Stack>

              <Divider />

              <Stack spacing="sm">
                <Group spacing="xs">
                  <IconChartBar size={18} color={theme.colors.violet[7]} />
                  <Text weight={700}>{t("image.analysis")}</Text>
                </Group>
                {featureInsights.length ? (
                  <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                    {featureInsights.map((insight) => (
                      <Paper
                        key={insight.label}
                        p="sm"
                        className={classes.insightCard}
                      >
                        <Stack spacing={4}>
                          <Group position="apart">
                            <Text size="sm" weight={600}>
                              {insight.label}
                            </Text>
                            <Text size="sm" color="violet.7" weight={700}>
                              {insight.value}
                            </Text>
                          </Group>
                          <Progress value={insight.value} color="violet.7" />
                          <Text size="xs" color="dark.1">
                            {insight.description}
                          </Text>
                        </Stack>
                      </Paper>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Paper p="md" className={classes.insightCard}>
                <Text size="sm" color="dark.1">
                      {t("image.analysisEmpty")}
                    </Text>
                  </Paper>
                )}
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing="md">
            <Group position="apart">
              <Title order={2}>{t("image.matches")}</Title>
              <Badge variant="filled" color="violet.9">
                {results.length
                  ? t("image.ranked")
                  : `${knowledgeBase.length} ${t("image.indexed")}`}
              </Badge>
            </Group>

            {results.length ? (
              <Paper p="md" className={classes.insightCard}>
                <Group spacing="xs">
                  <IconSparkles size={18} color={theme.colors.violet[7]} />
                  <Text weight={700}>{t("image.bestMatch")}</Text>
                  <Text color="dark.1">
                    {results[0].artwork.title} at {results[0].score}%
                    similarity
                  </Text>
                </Group>
              </Paper>
            ) : null}

            {resultList.map(({ artwork, score }, index) => (
              <Paper key={artwork.id} p="md" className={classes.resultCard}>
                <SimpleGrid
                  cols={2}
                  spacing="md"
                  breakpoints={[{ maxWidth: "sm", cols: 1, spacing: "sm" }]}
                >
                  <Image
                    src={artwork.image}
                    alt={artwork.title}
                    height={190}
                    radius="sm"
                    fit="cover"
                  />
                  <Stack spacing="xs">
                    <Group spacing="xs" position="apart">
                      <Group spacing="xs">
                        <Badge color="violet.7" variant="outline">
                          {artwork.category}
                        </Badge>
                        {score ? (
                          <Badge color="violet.9">
                            {t("image.rank")} #{index + 1}
                          </Badge>
                        ) : null}
                      </Group>
                      <Text size="sm" color="dark.1">
                        {artwork.period}
                      </Text>
                    </Group>
                    <Title order={3}>{artwork.title}</Title>
                    <Text size="sm" color="dark.1">
                      {artwork.description}
                    </Text>
                    <Box>
                      <Group position="apart" mb={4}>
                        <Text size="xs" weight={600}>
                          {t("image.similarity")}
                        </Text>
                        <Text size="xs" color="violet.7" weight={700}>
                          {score ? `${score}%` : t("image.waiting")}
                        </Text>
                      </Group>
                      <Progress value={score} color="violet.7" />
                    </Box>
                  </Stack>
                </SimpleGrid>
              </Paper>
            ))}
          </Stack>
        </SimpleGrid>
        )}
      </Container>
    </Box>
  );
}
