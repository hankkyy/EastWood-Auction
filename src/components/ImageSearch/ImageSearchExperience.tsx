import {
  deleteImportedArtwork,
  getImportedArtworks,
  getKnowledgeBase,
  rehydrateImportedArtworkSignatures,
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
import type { Artwork, ArtworkCaseRecord, ArtworkListingType } from "@/data/artworks";
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
  Paper,
  Select,
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
import { useEffect, useState } from "react";

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


const collectionCategoryOptions = [
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

const getCanonicalCollectionCategory = (category?: string, categoryZh?: string) => {
  const normalized = `${category ?? ""} ${categoryZh ?? ""}`.toLowerCase();
  if (normalized.includes("calligraphy") || normalized.includes("painting") || normalized.includes("书") || normalized.includes("画")) return "calligraphy";
  if (normalized.includes("porcelain") || normalized.includes("瓷")) return "porcelain";
  if (normalized.includes("jade") || normalized.includes("玉")) return "jade";
  if (normalized.includes("bronze") || normalized.includes("铜")) return "bronze";
  return "misc";
};

const getCollectionCategoryText = (value: string, locale: Locale) => {
  switch (value) {
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
};

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
    background: "linear-gradient(180deg, rgba(46, 36, 28, 0.45), rgba(22, 26, 32, 0.92))",
    overflow: "hidden",
    padding: theme.spacing.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  containedImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
  },

  thumbFrame: {
    width: 112,
    height: 88,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(58, 46, 36, 0.5), rgba(23, 27, 34, 0.9))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },

  resultImageFrame: {
    height: 190,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.9))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.sm,
  },

  galleryThumbFrame: {
    height: 120,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.9))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xs,
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
  const [adminGalleryUrls, setAdminGalleryUrls] = useState<string[]>([]);
  const [adminCoverUrl, setAdminCoverUrl] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminCategory, setAdminCategory] = useState("");
  const [adminPeriod, setAdminPeriod] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [adminItemDetails, setAdminItemDetails] = useState("");
  const [adminSalePrice, setAdminSalePrice] = useState("");
  const [adminCaseId, setAdminCaseId] = useState("");
  const [adminSaleTime, setAdminSaleTime] = useState("");
  const [adminSalePlatform, setAdminSalePlatform] = useState("");
  const [adminClientRegion, setAdminClientRegion] = useState("");
  const [adminLogisticsCost, setAdminLogisticsCost] = useState("");
  const [adminPurchaseChannel, setAdminPurchaseChannel] = useState("");
  const [adminPurchaseCost, setAdminPurchaseCost] = useState("");
  const [adminRiskAdvice, setAdminRiskAdvice] = useState("");
  const [adminImportType, setAdminImportType] = useState<"case" | "collection">(
    "case"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editItemDetails, setEditItemDetails] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editCaseId, setEditCaseId] = useState("");
  const [editSaleTime, setEditSaleTime] = useState("");
  const [editSalePlatform, setEditSalePlatform] = useState("");
  const [editClientRegion, setEditClientRegion] = useState("");
  const [editLogisticsCost, setEditLogisticsCost] = useState("");
  const [editPurchaseChannel, setEditPurchaseChannel] = useState("");
  const [editPurchaseCost, setEditPurchaseCost] = useState("");
  const [editRiskAdvice, setEditRiskAdvice] = useState("");
  const [editGalleryUrls, setEditGalleryUrls] = useState<string[]>([]);
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const [editImportType, setEditImportType] = useState<"case" | "collection">(
    "case"
  );
  const [manageMessage, setManageMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void rehydrateImportedArtworkSignatures().then((updated) => {
      if (!cancelled && updated) {
        refreshKnowledgeBase();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
  const caseKnowledgeBase = knowledgeBase.filter((artwork) => artwork.caseRecord);
  const displayKnowledgeBase = knowledgeBase.filter((artwork) => !artwork.caseRecord);
  const collectionKnowledgeBase = displayKnowledgeBase;
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
    setEditItemDetails("");
    setEditCategory("");
    setEditImportType("case");
    setEditSalePrice("");
    setEditCaseId("");
    setEditSaleTime("");
    setEditSalePlatform("");
    setEditClientRegion("");
    setEditLogisticsCost("");
    setEditPurchaseChannel("");
    setEditPurchaseCost("");
    setEditRiskAdvice("");
    setEditGalleryUrls([]);
    setEditCoverUrl(null);
  };

  const handleStartEdit = (artwork: Artwork) => {
    const galleryUrls =
      artwork.galleryImages?.length ? artwork.galleryImages : [artwork.image];
    setEditingArtworkId(artwork.id);
    setEditTitle(artwork.title);
    setEditCategory(getCanonicalCollectionCategory(artwork.category, artwork.categoryZh));
    setEditPeriod(artwork.period);
    setEditDescription(artwork.description);
    setEditItemDetails(`${artwork.title}\n${artwork.description}`);
    setEditImportType(getListingType(artwork) === "collection" ? "collection" : "case");
    setEditSalePrice(artwork.caseRecord?.salePrice ?? "");
    setEditCaseId(artwork.caseRecord?.caseId ?? "");
    setEditSaleTime(artwork.caseRecord?.saleTime ?? "");
    setEditSalePlatform(artwork.caseRecord?.salePlatform ?? "");
    setEditClientRegion(artwork.caseRecord?.clientRegion ?? "");
    setEditLogisticsCost(artwork.caseRecord?.logisticsCost ?? "");
    setEditPurchaseChannel(artwork.caseRecord?.purchaseChannel ?? "");
    setEditPurchaseCost(artwork.caseRecord?.purchaseCost ?? "");
    setEditRiskAdvice(artwork.caseRecord?.riskAdvice ?? "");
    setEditGalleryUrls(galleryUrls);
    setEditCoverUrl(artwork.image);
    setManageMessage(null);
  };

  const handleSaveEdit = (artwork: Artwork) => {
    const nextCaseRecord =
      editImportType === "case"
        ? {
            salePrice: editSalePrice,
            caseId: editCaseId,
            saleTime: editSaleTime,
            salePlatform: editSalePlatform,
            clientRegion: editClientRegion,
            logisticsCost: editLogisticsCost,
            purchaseChannel: editPurchaseChannel,
            purchaseCost: editPurchaseCost,
            riskAdvice: editRiskAdvice,
          }
        : undefined;

    const coverImageUrl = editCoverUrl || artwork.image;
    const orderedGalleryImages = [
      coverImageUrl,
      ...editGalleryUrls.filter((imageUrl) => imageUrl !== coverImageUrl),
    ];

    updateImportedArtwork({
      ...artwork,
      title: (editItemDetails.split("\n")[0]?.trim() || editTitle) || artwork.title,
      category: editImportType === "collection" ? (editCategory || getCanonicalCollectionCategory(artwork.category, artwork.categoryZh)) : (editCategory || artwork.category),
      categoryZh: editImportType === "collection" ? getCollectionCategoryText(editCategory || getCanonicalCollectionCategory(artwork.category, artwork.categoryZh), "zh") : artwork.categoryZh,
      period: editPeriod || artwork.period,
      image: coverImageUrl,
      description: editItemDetails.trim() || editDescription || artwork.description,
      listingType: editImportType === "collection" ? "collection" : "product",
      galleryImages: orderedGalleryImages,
      caseRecord: nextCaseRecord,
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

  const handleAdminUpload = async (files: File[] | File | null) => {
    const nextFiles = Array.isArray(files) ? files : files ? [files] : [];

    if (!nextFiles.length) {
      return;
    }

    setAdminError(null);

    try {
      const [feature, storedImageUrls] = await Promise.all([
        extractImageFeature(nextFiles[0]),
        Promise.all(nextFiles.map((file) => readImageAsDataUrl(file))),
      ]);

      if (adminPreviewUrl && isObjectUrl(adminPreviewUrl)) {
        URL.revokeObjectURL(adminPreviewUrl);
      }

      setAdminCoverUrl(storedImageUrls[0]);
      setAdminPreviewUrl(storedImageUrls[0]);
      setAdminGalleryUrls(storedImageUrls);
      setAdminFeature({
        ...feature,
        previewUrl: storedImageUrls[0],
      });
      setAdminTitle(nextFiles[0].name.replace(/\.[^/.]+$/, ""));
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

    const nextCaseRecord: ArtworkCaseRecord | undefined =
      adminImportType === "case"
        ? {
            salePrice: adminSalePrice,
            caseId: adminCaseId || `EA-${Date.now()}`,
            saleTime: adminSaleTime,
            salePlatform: adminSalePlatform,
            clientRegion: adminClientRegion,
            logisticsCost: adminLogisticsCost,
            purchaseChannel: adminPurchaseChannel,
            purchaseCost: adminPurchaseCost,
            riskAdvice: adminRiskAdvice,
          }
        : undefined;

    const coverImageUrl = adminCoverUrl || adminPreviewUrl;
    const orderedGalleryImages = [
      coverImageUrl,
      ...adminGalleryUrls.filter((imageUrl) => imageUrl !== coverImageUrl),
    ];

    const nextArtwork: Artwork = {
      id: `imported-${Date.now()}`,
      title:
        adminItemDetails.split("\n")[0]?.trim() || adminTitle || t("image.untitledArtwork"),
      category: adminImportType === "collection" ? (adminCategory || "misc") : (adminCategory || t("image.uncategorized")),
      categoryZh: adminImportType === "collection" ? getCollectionCategoryText(adminCategory || "misc", "zh") : undefined,
      period: adminPeriod || t("image.unknownPeriod"),
      image: coverImageUrl,
      galleryImages: orderedGalleryImages,
      description:
        adminItemDetails.trim() || adminDescription || t("image.importedDescription"),
      listingType: adminImportType === "collection" ? "collection" : "product",
      featureVector: adminFeature.vector,
      imageSignature: adminFeature.signature,
      caseRecord: nextCaseRecord,
    };

    try {
      saveImportedArtwork(nextArtwork);
      refreshKnowledgeBase();
      setResults([]);
      setAdminTitle("");
      setAdminCategory("");
      setAdminPeriod("");
      setAdminDescription("");
      setAdminItemDetails("");
      setAdminSalePrice("");
      setAdminCaseId("");
      setAdminSaleTime("");
      setAdminSalePlatform("");
      setAdminClientRegion("");
      setAdminLogisticsCost("");
      setAdminPurchaseChannel("");
      setAdminPurchaseCost("");
      setAdminRiskAdvice("");
      setAdminImportType("case");
      setAdminPreviewUrl(null);
      setAdminGalleryUrls([]);
      setAdminCoverUrl(null);
      setAdminFeature(null);
      setAdminError(null);
      setManageMessage(t("image.itemImported"));
    } catch (saveError) {
      setAdminError(
        saveError instanceof Error
          ? saveError.message
          : t("image.importFallback")
      );
    }
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
                  <FileButton onChange={handleAdminUpload} accept="image/*" multiple>
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
                    <Box component="img" src={adminPreviewUrl} alt="Admin imported artwork preview" className={classes.containedImage} />
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

                <Stack spacing={6}>
                  <Text size="sm" weight={600}>{t("image.importEntryLabel")}</Text>
                  <SegmentedControl
                    value={adminImportType}
                    onChange={(value) => setAdminImportType(value as "case" | "collection")}
                    data={[
                      { label: t("image.importCaseEntry"), value: "case" },
                      { label: t("image.importCollectionEntry"), value: "collection" },
                    ]}
                  />
                  <Text size="sm" color="dark.1">
                    {adminImportType === "case" ? t("image.caseFormHint") : t("image.collectionFormHint")}
                  </Text>
                </Stack>

                <Textarea
                  label={t("image.caseItemDetails")}
                  value={adminItemDetails}
                  onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
                  placeholder={t("image.caseItemDetailsPlaceholder")}
                  minRows={4}
                />

                {adminImportType === "collection" ? (
                  <Select
                    label={t("image.collectionCategory")}
                    value={adminCategory || "misc"}
                    onChange={(value) => setAdminCategory(value || "misc")}
                    data={collectionCategoryOptions.map((option) => ({
                      value: option.value,
                      label: t(option.labelKey),
                    }))}
                    withinPortal
                  />
                ) : null}

                {adminGalleryUrls.length ? (
                  <>
                    <Text size="sm" color="dark.1">{t("image.caseGalleryHint")}</Text>
                    <Text size="sm" color="dark.1">{t("image.coverSelectionHint")}</Text>
                    <SimpleGrid cols={3} breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                      {adminGalleryUrls.map((imageUrl, index) => {
                        const isCover = imageUrl === (adminCoverUrl || adminPreviewUrl);

                        return (
                          <Box
                            key={`${imageUrl}-${index}`}
                            component="button"
                            type="button"
                            onClick={() => {
                              setAdminCoverUrl(imageUrl);
                              setAdminPreviewUrl(imageUrl);
                            }}
                            sx={{
                              position: "relative",
                              border: isCover ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                              borderRadius: 8,
                              padding: 0,
                              background: "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <Box className={classes.galleryThumbFrame}>
                              <Box component="img" src={imageUrl} alt={`gallery-${index + 1}`} className={classes.containedImage} />
                            </Box>
                            {isCover ? (
                              <Badge color="yellow" variant="filled" sx={{ position: "absolute", top: 8, left: 8 }}>
                                {t("image.coverBadge")}
                              </Badge>
                            ) : null}
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </>
                ) : null}

                {adminImportType === "case" ? (
                  <>
                    <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}> 
                      <TextInput label={t("image.caseId")} value={adminCaseId} onChange={(event) => setAdminCaseId(event.currentTarget.value)} />
                      <TextInput label={t("image.caseSalePrice")} value={adminSalePrice} onChange={(event) => setAdminSalePrice(event.currentTarget.value)} />
                      <TextInput label={t("image.caseSaleTime")} value={adminSaleTime} onChange={(event) => setAdminSaleTime(event.currentTarget.value)} />
                      <TextInput label={t("image.casePlatform")} value={adminSalePlatform} onChange={(event) => setAdminSalePlatform(event.currentTarget.value)} />
                      <TextInput label={t("image.caseClientRegion")} value={adminClientRegion} onChange={(event) => setAdminClientRegion(event.currentTarget.value)} />
                      <TextInput label={t("image.caseLogisticsCost")} value={adminLogisticsCost} onChange={(event) => setAdminLogisticsCost(event.currentTarget.value)} />
                      <TextInput label={t("image.casePurchaseChannel")} value={adminPurchaseChannel} onChange={(event) => setAdminPurchaseChannel(event.currentTarget.value)} />
                      <TextInput label={t("image.casePurchaseCost")} value={adminPurchaseCost} onChange={(event) => setAdminPurchaseCost(event.currentTarget.value)} />
                    </SimpleGrid>
                    <Textarea label={t("image.caseRiskAdvice")} value={adminRiskAdvice} onChange={(event) => setAdminRiskAdvice(event.currentTarget.value)} minRows={2} />
                  </>
                ) : null}

                <Group position="right">
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
              <Stack spacing="xs">
                <Group position="apart">
                  <Title order={3}>{t("image.importCaseEntry")}</Title>
                  <Badge color="yellow" variant="filled">{caseKnowledgeBase.length}</Badge>
                </Group>
                {caseKnowledgeBase.map((artwork) => {
                  const isImported = artwork.id.startsWith("imported-");
                  const isEditing = editingArtworkId === artwork.id;

                  return (
                    <Paper key={artwork.id} p="md" className={classes.resultCard}>
                      <Stack spacing="md">
                        <Group align="center" position="apart" noWrap>
                          <Group align="center" noWrap>
                            <Box className={classes.thumbFrame}>
                              <Box component="img" src={artwork.image} alt={getArtworkTitle(artwork, locale)} className={classes.containedImage} />
                            </Box>
                            <Stack spacing={4}>
                              <Group spacing="xs">
                                <Badge color="yellow" variant="filled">
                                  {t("image.importCaseEntry")}
                                </Badge>
                                {isImported ? (
                                  <Badge color="violet.9">{t("image.imported")}</Badge>
                                ) : (
                                  <Badge color="gray">{t("image.seeded")}</Badge>
                                )}
                              </Group>
                              <Text weight={700}>{getArtworkTitle(artwork, locale)}</Text>
                              <Text size="sm" color="dark.1">
                                {artwork.caseRecord?.saleTime || getArtworkPeriod(artwork, locale)}
                              </Text>
                            </Stack>
                          </Group>
                          <Group spacing="xs" noWrap>
                            <Button
                              size="xs"
                              variant="light"
                              leftIcon={<IconEdit size={14} />}
                              onClick={() => handleStartEdit(artwork)}
                            >
                              {t("image.editItem")}
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="outline"
                              leftIcon={<IconTrash size={14} />}
                              onClick={() => handleDeleteImportedArtwork(artwork.id)}
                            >
                              {t("image.deleteItem")}
                            </Button>
                          </Group>
                        </Group>

                        {isEditing ? (
                          <Stack spacing="sm">
                            <Stack spacing={6}>
                              <Text size="sm" weight={600}>{t("image.importEntryLabel")}</Text>
                              <SegmentedControl
                                value={editImportType}
                                onChange={(value) => setEditImportType(value as "case" | "collection")}
                                data={[
                                  { label: t("image.importCaseEntry"), value: "case" },
                                  { label: t("image.importCollectionEntry"), value: "collection" },
                                ]}
                              />
                            </Stack>
                            <Textarea
                              label={t("image.caseItemDetails")}
                              value={editItemDetails}
                              onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                              minRows={3}
                            />
                            {editImportType === "collection" ? (
                              <Select
                                label={t("image.collectionCategory")}
                                value={editCategory || "misc"}
                                onChange={(value) => setEditCategory(value || "misc")}
                                data={collectionCategoryOptions.map((option) => ({
                                  value: option.value,
                                  label: t(option.labelKey),
                                }))}
                                withinPortal
                              />
                            ) : null}
                            {editGalleryUrls.length ? (
                              <>
                                <Text size="sm" color="dark.1">{t("image.coverSelectionHint")}</Text>
                                <SimpleGrid cols={3} breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                                  {editGalleryUrls.map((imageUrl, index) => {
                                    const isCover = imageUrl === (editCoverUrl || artwork.image);

                                    return (
                                      <Box
                                        key={`${imageUrl}-${index}`}
                                        component="button"
                                        type="button"
                                        onClick={() => setEditCoverUrl(imageUrl)}
                                        sx={{
                                          position: "relative",
                                          border: isCover ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                                          borderRadius: 8,
                                          padding: 0,
                                          background: "transparent",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <Box className={classes.galleryThumbFrame}>
                                          <Box component="img" src={imageUrl} alt={`edit-gallery-${index + 1}`} className={classes.containedImage} />
                                        </Box>
                                        {isCover ? (
                                          <Badge color="yellow" variant="filled" sx={{ position: "absolute", top: 8, left: 8 }}>
                                            {t("image.coverBadge")}
                                          </Badge>
                                        ) : null}
                                      </Box>
                                    );
                                  })}
                                </SimpleGrid>
                              </>
                            ) : null}
                            {editImportType === "case" ? (
                              <>
                                <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}> 
                                  <TextInput label={t("image.caseId")} value={editCaseId} onChange={(event) => setEditCaseId(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseSalePrice")} value={editSalePrice} onChange={(event) => setEditSalePrice(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseSaleTime")} value={editSaleTime} onChange={(event) => setEditSaleTime(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePlatform")} value={editSalePlatform} onChange={(event) => setEditSalePlatform(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseClientRegion")} value={editClientRegion} onChange={(event) => setEditClientRegion(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseLogisticsCost")} value={editLogisticsCost} onChange={(event) => setEditLogisticsCost(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePurchaseChannel")} value={editPurchaseChannel} onChange={(event) => setEditPurchaseChannel(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePurchaseCost")} value={editPurchaseCost} onChange={(event) => setEditPurchaseCost(event.currentTarget.value)} />
                                </SimpleGrid>
                                <Textarea label={t("image.caseRiskAdvice")} value={editRiskAdvice} onChange={(event) => setEditRiskAdvice(event.currentTarget.value)} minRows={2} />
                              </>
                            ) : null}
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

              <Stack spacing="xs">
                <Group position="apart">
                  <Title order={3}>{t("image.importCollectionEntry")}</Title>
                  <Badge color="blue" variant="filled">{displayKnowledgeBase.length}</Badge>
                </Group>
                {displayKnowledgeBase.map((artwork) => {
                  const isImported = artwork.id.startsWith("imported-");
                  const isEditing = editingArtworkId === artwork.id;

                  return (
                    <Paper key={artwork.id} p="md" className={classes.resultCard}>
                      <Stack spacing="md">
                        <Group align="center" position="apart" noWrap>
                          <Group align="center" noWrap>
                            <Box className={classes.thumbFrame}>
                              <Box component="img" src={artwork.image} alt={getArtworkTitle(artwork, locale)} className={classes.containedImage} />
                            </Box>
                            <Stack spacing={4}>
                              <Group spacing="xs">
                                <Badge color="blue" variant="filled">
                                  {t("image.importCollectionEntry")}
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
                              <Text size="sm" color="dark.1">
                                {getCollectionCategoryText(getCanonicalCollectionCategory(artwork.category, artwork.categoryZh), locale)}
                              </Text>
                            </Stack>
                          </Group>
                          <Group spacing="xs" noWrap>
                            <Button
                              size="xs"
                              variant="light"
                              leftIcon={<IconEdit size={14} />}
                              onClick={() => handleStartEdit(artwork)}
                            >
                              {t("image.editItem")}
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="outline"
                              leftIcon={<IconTrash size={14} />}
                              onClick={() => handleDeleteImportedArtwork(artwork.id)}
                            >
                              {t("image.deleteItem")}
                            </Button>
                          </Group>
                        </Group>

                        {isEditing ? (
                          <Stack spacing="sm">
                            <Stack spacing={6}>
                              <Text size="sm" weight={600}>{t("image.importEntryLabel")}</Text>
                              <SegmentedControl
                                value={editImportType}
                                onChange={(value) => setEditImportType(value as "case" | "collection")}
                                data={[
                                  { label: t("image.importCaseEntry"), value: "case" },
                                  { label: t("image.importCollectionEntry"), value: "collection" },
                                ]}
                              />
                            </Stack>
                            <Textarea
                              label={t("image.caseItemDetails")}
                              value={editItemDetails}
                              onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                              minRows={3}
                            />
                            {editImportType === "collection" ? (
                              <Select
                                label={t("image.collectionCategory")}
                                value={editCategory || "misc"}
                                onChange={(value) => setEditCategory(value || "misc")}
                                data={collectionCategoryOptions.map((option) => ({
                                  value: option.value,
                                  label: t(option.labelKey),
                                }))}
                                withinPortal
                              />
                            ) : null}
                            {editGalleryUrls.length ? (
                              <>
                                <Text size="sm" color="dark.1">{t("image.coverSelectionHint")}</Text>
                                <SimpleGrid cols={3} breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                                  {editGalleryUrls.map((imageUrl, index) => {
                                    const isCover = imageUrl === (editCoverUrl || artwork.image);

                                    return (
                                      <Box
                                        key={`${imageUrl}-${index}`}
                                        component="button"
                                        type="button"
                                        onClick={() => setEditCoverUrl(imageUrl)}
                                        sx={{
                                          position: "relative",
                                          border: isCover ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                                          borderRadius: 8,
                                          padding: 0,
                                          background: "transparent",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <Box className={classes.galleryThumbFrame}>
                                          <Box component="img" src={imageUrl} alt={`edit-gallery-${index + 1}`} className={classes.containedImage} />
                                        </Box>
                                        {isCover ? (
                                          <Badge color="yellow" variant="filled" sx={{ position: "absolute", top: 8, left: 8 }}>
                                            {t("image.coverBadge")}
                                          </Badge>
                                        ) : null}
                                      </Box>
                                    );
                                  })}
                                </SimpleGrid>
                              </>
                            ) : null}
                            {editImportType === "case" ? (
                              <>
                                <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}> 
                                  <TextInput label={t("image.caseId")} value={editCaseId} onChange={(event) => setEditCaseId(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseSalePrice")} value={editSalePrice} onChange={(event) => setEditSalePrice(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseSaleTime")} value={editSaleTime} onChange={(event) => setEditSaleTime(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePlatform")} value={editSalePlatform} onChange={(event) => setEditSalePlatform(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseClientRegion")} value={editClientRegion} onChange={(event) => setEditClientRegion(event.currentTarget.value)} />
                                  <TextInput label={t("image.caseLogisticsCost")} value={editLogisticsCost} onChange={(event) => setEditLogisticsCost(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePurchaseChannel")} value={editPurchaseChannel} onChange={(event) => setEditPurchaseChannel(event.currentTarget.value)} />
                                  <TextInput label={t("image.casePurchaseCost")} value={editPurchaseCost} onChange={(event) => setEditPurchaseCost(event.currentTarget.value)} />
                                </SimpleGrid>
                                <Textarea label={t("image.caseRiskAdvice")} value={editRiskAdvice} onChange={(event) => setEditRiskAdvice(event.currentTarget.value)} minRows={2} />
                              </>
                            ) : null}
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
                  <Box component="img" src={previewUrl} alt="Uploaded search reference" className={classes.containedImage} />
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
                  <Box className={classes.resultImageFrame}>
                  <Box component="img" src={artwork.image} alt={getArtworkTitle(artwork, locale)} className={classes.containedImage} />
                  </Box>
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
