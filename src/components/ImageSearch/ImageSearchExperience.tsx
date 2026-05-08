import {
  clearImportedArtworks,
  deleteImportedArtwork,
  getImportedArtworks,
  getKnowledgeBase,
  saveImportedArtwork,
  updateImportedArtwork,
} from "@/features/image-search/artworkKnowledgeBase";
import {
  createAdminAccount,
  getAdminAccounts,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "@/features/image-search/adminAuth";
import type {
  AdminAccount,
  AdminSession,
} from "@/features/image-search/adminAuth";
import {
  extractImageFeature,
  getFeatureInsights,
  readImageAsDataUrl,
  searchSimilarArtworks,
} from "@/features/image-search/imageSearch";
import type { Artwork, ArtworkListingType } from "@/data/artworks";
import type {
  FeatureInsight,
  ImageFeature,
  ImageSearchResult,
} from "@/features/image-search/imageSearch";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n";
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
  IconCheck,
  IconChartBar,
  IconDatabaseImport,
  IconEdit,
  IconLock,
  IconLogout,
  IconPhotoSearch,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

const isObjectUrl = (url: string) => url.startsWith("blob:");

const getArtworkTitle = (artwork: Artwork, locale: Locale) =>
  locale === "zh" && artwork.titleZh ? artwork.titleZh : artwork.title;

const getArtworkCategory = (artwork: Artwork, locale: Locale) =>
  locale === "zh" && artwork.categoryZh ? artwork.categoryZh : artwork.category;

const getArtworkPeriod = (artwork: Artwork, locale: Locale) =>
  locale === "zh" && artwork.periodZh ? artwork.periodZh : artwork.period;

const getArtworkDescription = (artwork: Artwork, locale: Locale) =>
  locale === "zh" && artwork.descriptionZh
    ? artwork.descriptionZh
    : artwork.description;

const getListingType = (artwork: Artwork): ArtworkListingType =>
  artwork.listingType ?? "product";

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
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<"match" | "manage">("match");
  const [adminSession, setAdminSession] = useState<AdminSession | null>(
    () => getAdminSession()
  );
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(
    () => getAdminAccounts()
  );
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminDisplayName, setNewAdminDisplayName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
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
  const [adminListingType, setAdminListingType] =
    useState<ArtworkListingType>("product");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editListingType, setEditListingType] =
    useState<ArtworkListingType>("product");
  const [manageMessage, setManageMessage] = useState<string | null>(null);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const allProductArtworks = knowledgeBase.filter(
    (artwork) => getListingType(artwork) === "product"
  );
  const productKnowledgeBase = normalizedSearchQuery
    ? allProductArtworks.filter((artwork) => {
        const searchableText = [
          artwork.title,
          artwork.titleZh,
          artwork.category,
          artwork.categoryZh,
          artwork.period,
          artwork.periodZh,
          artwork.description,
          artwork.descriptionZh,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchQuery);
      })
    : allProductArtworks;
  const collectionKnowledgeBase = knowledgeBase.filter(
    (artwork) => getListingType(artwork) === "collection"
  );
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
    : productKnowledgeBase.map((artwork) => ({
        artwork,
        score: 0,
      }));

  const getFeatureInsightText = (label: string) => {
    switch (label) {
      case "Red":
        return {
          label: t("image.featureRed"),
          description: t("image.featureRedDescription"),
        };
      case "Green":
        return {
          label: t("image.featureGreen"),
          description: t("image.featureGreenDescription"),
        };
      case "Blue":
        return {
          label: t("image.featureBlue"),
          description: t("image.featureBlueDescription"),
        };
      case "Brightness":
        return {
          label: t("image.featureBrightness"),
          description: t("image.featureBrightnessDescription"),
        };
      case "Saturation":
        return {
          label: t("image.featureSaturation"),
          description: t("image.featureSaturationDescription"),
        };
      case "Warmth":
        return {
          label: t("image.featureWarmth"),
          description: t("image.featureWarmthDescription"),
        };
      case "Coolness":
        return {
          label: t("image.featureCoolness"),
          description: t("image.featureCoolnessDescription"),
        };
      case "Contrast":
        return {
          label: t("image.featureContrast"),
          description: t("image.featureContrastDescription"),
        };
      default:
        return { label, description: "" };
    }
  };

  const refreshKnowledgeBase = () => {
    setKnowledgeBase(getKnowledgeBase());
    setImportedArtworks(getImportedArtworks());
  };

  const resetEditForm = () => {
    setEditingArtworkId(null);
    setEditTitle("");
    setEditCategory("");
    setEditPeriod("");
    setEditDescription("");
    setEditListingType("product");
  };

  const handleStartEdit = (artwork: Artwork) => {
    setEditingArtworkId(artwork.id);
    setEditTitle(artwork.title);
    setEditCategory(artwork.category);
    setEditPeriod(artwork.period);
    setEditDescription(artwork.description);
    setEditListingType(getListingType(artwork));
    setManageMessage(null);
  };

  const handleSaveEdit = (artwork: Artwork) => {
    updateImportedArtwork({
      ...artwork,
      title: editTitle || artwork.title,
      category: editCategory || artwork.category,
      period: editPeriod || artwork.period,
      description: editDescription || artwork.description,
      listingType: editListingType,
    });
    refreshKnowledgeBase();
    resetEditForm();
    setResults([]);
    setManageMessage(t("image.itemUpdated"));
  };

  const handleDeleteImportedArtwork = (artworkId: string) => {
    deleteImportedArtwork(artworkId);
    refreshKnowledgeBase();
    resetEditForm();
    setResults([]);
    setManageMessage(t("image.itemDeleted"));
  };

  const handleAdminLogin = () => {
    const session = loginAdmin(adminUsername, adminPassword);

    if (session) {
      setAdminSession(session);
      setAdminPassword("");
      setLoginError(null);
      setAccountMessage(null);
      return;
    }

    setLoginError(t("image.loginError"));
  };

  const handleCreateAdminAccount = () => {
    const result = createAdminAccount({
      username: newAdminUsername,
      displayName: newAdminDisplayName,
      password: newAdminPassword,
    });

    if (!result.ok) {
      setAccountMessage(
        result.reason === "duplicate-username"
          ? t("image.accountDuplicate")
          : t("image.accountMissing")
      );
      return;
    }

    setAdminAccounts(getAdminAccounts());
    setNewAdminUsername("");
    setNewAdminDisplayName("");
    setNewAdminPassword("");
    setAccountMessage(t("image.accountCreated"));
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminSession(null);
    setAdminUsername("admin");
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
      setResults(searchSimilarArtworks(feature, productKnowledgeBase));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("image.analyzeFallback")
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleDemoSearch = (artworkId: string) => {
    const artwork = productKnowledgeBase.find((item) => item.id === artworkId);

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
    setFileName(`${getArtworkTitle(artwork, locale)} ${t("image.sampleSuffix")}`);
    setPreviewUrl(demoFeature.previewUrl);
    setFeature(demoFeature);
    setResults(searchSimilarArtworks(demoFeature, productKnowledgeBase));
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
          : t("image.importFallback")
      );
    }
  };

  const handleSaveToKnowledgeBase = () => {
    if (!adminPreviewUrl || !adminFeature) {
      setAdminError(t("image.uploadBeforeImport"));
      return;
    }

    const nextArtwork: Artwork = {
      id: `imported-${Date.now()}`,
      title: adminTitle || t("image.untitledArtwork"),
      category: adminCategory || t("image.uncategorized"),
      period: adminPeriod || t("image.unknownPeriod"),
      image: adminPreviewUrl,
      description:
        adminDescription ||
        t("image.importedDescription"),
      listingType: adminListingType,
      featureVector: adminFeature.vector,
      imageSignature: adminFeature.signature,
    };

    saveImportedArtwork(nextArtwork);
    refreshKnowledgeBase();
    setResults([]);
    setAdminTitle("");
    setAdminCategory("");
    setAdminPeriod("");
    setAdminDescription("");
    setAdminListingType("product");
    setAdminPreviewUrl(null);
    setAdminFeature(null);
    setAdminError(null);
    setManageMessage(t("image.itemImported"));
  };

  const handleClearImportedArtworks = () => {
    clearImportedArtworks();
    refreshKnowledgeBase();
    resetEditForm();
    setResults([]);
    setManageMessage(t("image.itemsCleared"));
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
          <Text size="sm" color="dark.1">
            {t("image.matchScope")}
          </Text>
          <TextInput
            size="lg"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder={t("image.keywordPlaceholder")}
            aria-label={t("image.keywordSearch")}
          />
          <SegmentedControl
            value={mode}
            onChange={(value) => setMode(value as "match" | "manage")}
            data={[
              { label: t("image.userMode"), value: "match" },
              { label: t("image.adminMode"), value: "manage" },
            ]}
          />
        </Stack>

        {mode === "manage" && !adminSession ? (
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
                  label={t("image.username")}
                  value={adminUsername}
                  onChange={(event) =>
                    setAdminUsername(event.currentTarget.value)
                  }
                  placeholder={t("image.usernamePlaceholder")}
                />
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
                  disabled={!adminUsername || !adminPassword}
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
                <Group position="apart">
                  <Text color="dark.1">
                    {t("image.signedInAs")}: {adminSession?.displayName}
                  </Text>
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

                <SegmentedControl
                  value={adminListingType}
                  onChange={(value) =>
                    setAdminListingType(value as ArtworkListingType)
                  }
                  data={[
                    { label: t("image.listingProduct"), value: "product" },
                    { label: t("image.listingCollection"), value: "collection" },
                  ]}
                />
                <Text size="sm" color="dark.1">
                  {adminListingType === "product"
                    ? t("image.listingProductHelp")
                    : t("image.listingCollectionHelp")}
                </Text>

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

                <Divider />

                <Stack spacing="sm">
                  <Title order={3}>{t("image.adminAccounts")}</Title>
                  {accountMessage ? (
                    <Alert color="violet" title={t("image.accountNotice")}>
                      {accountMessage}
                    </Alert>
                  ) : null}
                  <SimpleGrid cols={3} breakpoints={[{ maxWidth: "sm", cols: 1 }]}> 
                    <TextInput
                      label={t("image.username")}
                      value={newAdminUsername}
                      onChange={(event) =>
                        setNewAdminUsername(event.currentTarget.value)
                      }
                      placeholder={t("image.usernamePlaceholder")}
                    />
                    <TextInput
                      label={t("image.displayName")}
                      value={newAdminDisplayName}
                      onChange={(event) =>
                        setNewAdminDisplayName(event.currentTarget.value)
                      }
                      placeholder={t("image.displayNamePlaceholder")}
                    />
                    <TextInput
                      label={t("image.password")}
                      type="password"
                      value={newAdminPassword}
                      onChange={(event) =>
                        setNewAdminPassword(event.currentTarget.value)
                      }
                      placeholder={t("image.passwordPlaceholder")}
                    />
                  </SimpleGrid>
                  <Button
                    variant="light"
                    onClick={handleCreateAdminAccount}
                    disabled={!newAdminUsername || !newAdminPassword}
                  >
                    {t("image.createAdmin")}
                  </Button>
                </Stack>
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
                    {allProductArtworks.length} {t("image.productCount")}
                  </Text>
                  <Text color="dark.1">
                    {collectionKnowledgeBase.length} {t("image.collectionCount")}
                  </Text>
                  <Text color="dark.1">
                    {importedArtworks.length} {t("image.adminImported")}
                  </Text>
                  <Text color="dark.1">
                    {adminAccounts.length} {t("image.adminAccountCount")}
                  </Text>
                </Stack>
              </Paper>
              {manageMessage ? (
                <Alert color="violet" title={t("image.manageNotice")}>
                  {manageMessage}
                </Alert>
              ) : null}
              {knowledgeBase.map((artwork) => {
                const isImported = artwork.id.startsWith("imported-");
                const isEditing = editingArtworkId === artwork.id;

                return (
                  <Paper key={artwork.id} p="md" className={classes.resultCard}>
                    <Stack spacing="md">
                      <Group align="center" position="apart" noWrap>
                        <Group align="center" noWrap>
                          <Image
                            src={artwork.image}
                            alt={getArtworkTitle(artwork, locale)}
                            width={112}
                            height={88}
                            radius="sm"
                            fit="cover"
                          />
                          <Stack spacing={4}>
                            <Group spacing="xs">
                              <Badge color="violet.7" variant="outline">
                                {getArtworkCategory(artwork, locale)}
                              </Badge>
                              <Badge
                                color={
                                  getListingType(artwork) === "product"
                                    ? "green"
                                    : "blue"
                                }
                              >
                                {getListingType(artwork) === "product"
                                  ? t("image.productBadge")
                                  : t("image.collectionBadge")}
                              </Badge>
                              {isImported ? (
                                <Badge color="violet.9">{t("image.imported")}</Badge>
                              ) : (
                                <Badge color="gray">{t("image.seeded")}</Badge>
                              )}
                            </Group>
                            <Text weight={700}>{getArtworkTitle(artwork, locale)}</Text>
                            <Text size="sm" color="dark.1">
                              {getArtworkPeriod(artwork, locale)}
                            </Text>
                          </Stack>
                        </Group>
                        <Group spacing="xs" noWrap>
                          <Button
                            size="xs"
                            variant="light"
                            leftIcon={<IconEdit size={14} />}
                            onClick={() => handleStartEdit(artwork)}
                            disabled={!isImported}
                          >
                            {t("image.editItem")}
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            variant="outline"
                            leftIcon={<IconTrash size={14} />}
                            onClick={() => handleDeleteImportedArtwork(artwork.id)}
                            disabled={!isImported}
                          >
                            {t("image.deleteItem")}
                          </Button>
                        </Group>
                      </Group>

                      {isEditing ? (
                        <Stack spacing="sm">
                          <SegmentedControl
                            value={editListingType}
                            onChange={(value) =>
                              setEditListingType(value as ArtworkListingType)
                            }
                            data={[
                              { label: t("image.listingProduct"), value: "product" },
                              {
                                label: t("image.listingCollection"),
                                value: "collection",
                              },
                            ]}
                          />
                          <SimpleGrid
                            cols={2}
                            breakpoints={[{ maxWidth: "sm", cols: 1 }]}
                          >
                            <TextInput
                              label={t("image.fieldTitle")}
                              value={editTitle}
                              onChange={(event) =>
                                setEditTitle(event.currentTarget.value)
                              }
                            />
                            <TextInput
                              label={t("image.fieldCategory")}
                              value={editCategory}
                              onChange={(event) =>
                                setEditCategory(event.currentTarget.value)
                              }
                            />
                            <TextInput
                              label={t("image.fieldPeriod")}
                              value={editPeriod}
                              onChange={(event) =>
                                setEditPeriod(event.currentTarget.value)
                              }
                            />
                          </SimpleGrid>
                          <Textarea
                            label={t("image.fieldDescription")}
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.currentTarget.value)
                            }
                            minRows={2}
                          />
                          <Group position="right">
                            <Button
                              variant="subtle"
                              leftIcon={<IconX size={16} />}
                              onClick={resetEditForm}
                            >
                              {t("image.cancelEdit")}
                            </Button>
                            <Button
                              leftIcon={<IconCheck size={16} />}
                              onClick={() => handleSaveEdit(artwork)}
                            >
                              {t("image.saveEdit")}
                            </Button>
                          </Group>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })}
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
                    ? `${t("image.dominantSignal")}: ${getFeatureInsightText(
                        strongestInsight.label
                      ).label}`
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
                  {productKnowledgeBase.slice(0, 4).map((artwork) => (
                    <Button
                      key={artwork.id}
                      variant="light"
                      size="xs"
                      onClick={() => handleDemoSearch(artwork.id)}
                    >
                      {getArtworkCategory(artwork, locale)}
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
                              {getFeatureInsightText(insight.label).label}
                            </Text>
                            <Text size="sm" color="violet.7" weight={700}>
                              {insight.value}
                            </Text>
                          </Group>
                          <Progress value={insight.value} color="violet.7" />
                          <Text size="xs" color="dark.1">
                            {getFeatureInsightText(insight.label).description}
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
                  : `${productKnowledgeBase.length} ${t("image.indexed")}`}
              </Badge>
            </Group>

            {results.length ? (
              <Paper p="md" className={classes.insightCard}>
                <Group spacing="xs">
                  <IconSparkles size={18} color={theme.colors.violet[7]} />
                  <Text weight={700}>{t("image.bestMatch")}</Text>
                  <Text color="dark.1">
                    {getArtworkTitle(results[0].artwork, locale)} · {results[0].score}% {t("image.similarity")}
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
                    alt={getArtworkTitle(artwork, locale)}
                    height={190}
                    radius="sm"
                    fit="cover"
                  />
                  <Stack spacing="xs">
                    <Group spacing="xs" position="apart">
                      <Group spacing="xs">
                        <Badge color="violet.7" variant="outline">
                          {getArtworkCategory(artwork, locale)}
                        </Badge>
                        {score ? (
                          <Badge color="violet.9">
                            {t("image.rank")} #{index + 1}
                          </Badge>
                        ) : null}
                      </Group>
                      <Text size="sm" color="dark.1">
                        {getArtworkPeriod(artwork, locale)}
                      </Text>
                    </Group>
                    <Title order={3}>{getArtworkTitle(artwork, locale)}</Title>
                    <Text size="sm" color="dark.1">
                      {getArtworkDescription(artwork, locale)}
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
