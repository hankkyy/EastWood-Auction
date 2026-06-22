import { GetStaticProps } from "next";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Wrapper } from "@/layout";
import { useI18n } from "@/i18n";
import {
  appFieldLabelColor,
  appMutedTextColor,
  appSurfaceBorder,
} from "@/components/artworkStyles";
import type { Artwork } from "@/data/artworks";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import { IconArrowRight } from "@tabler/icons-react";
import { SEO } from "@/components/SEO";
import Link from "next/link";

interface SearchPageProps {
  initialData: Artwork[];
}

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

const getSearchType = (artwork: Artwork) => {
  if (artwork.caseRecord) return "case";
  return artwork.listingType;
};

const normalizeCategoryKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const getCanonicalCategory = (artwork: Artwork):
  | "calligraphy"
  | "porcelain"
  | "jade"
  | "bronze"
  | "misc"
  | `custom:${string}` => {
  const raw = normalizeCategoryKey(`${artwork.categoryZh ?? ""} ${artwork.category ?? ""}`);
  if (!raw) return "misc";
  if (raw.includes("字画") || raw.includes("书画") || raw.includes("painting") || raw.includes("calligraphy")) {
    return "calligraphy";
  }
  if (raw.includes("瓷") || raw.includes("porcelain")) {
    return "porcelain";
  }
  if (raw.includes("玉") || raw.includes("jade")) {
    return "jade";
  }
  if (raw.includes("铜") || raw.includes("bronze")) {
    return "bronze";
  }
  if (raw.includes("杂") || raw.includes("misc")) {
    return "misc";
  }
  return `custom:${raw}`;
};

const getCategoryLabelByKey = (
  key: string,
  locale: "zh" | "en",
  fallback?: string
) => {
  switch (key) {
    case "calligraphy":
      return locale === "zh" ? "字画" : "Paintings & Calligraphy";
    case "porcelain":
      return locale === "zh" ? "瓷器" : "Porcelain";
    case "jade":
      return locale === "zh" ? "翡翠玉器" : "Jade";
    case "bronze":
      return locale === "zh" ? "铜器" : "Bronze";
    case "misc":
      return locale === "zh" ? "杂项" : "Miscellaneous";
    case "case":
      return locale === "zh" ? "回流案例" : "Return Cases";
    default:
      return fallback || (locale === "zh" ? "其他" : "Other");
  }
};

export default function SearchPage({ initialData }: SearchPageProps) {
  const { t, locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "collection" | "case">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [saleFilter, setSaleFilter] = useState<"all" | "for-sale" | "not-for-sale">("all");

  // Read query param from URL (set by SearchModal or direct link)
  useEffect(() => {
    const q = router.query.q;
    if (typeof q === "string" && q.trim()) {
      setQuery(q.trim());
    }
  }, [router.query.q]);

  const normalizedQuery = query.trim().toLowerCase();

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: locale === "zh" ? "全部分类" : "All categories" },
      { value: "calligraphy", label: locale === "zh" ? "字画" : "Paintings & Calligraphy" },
      { value: "misc", label: locale === "zh" ? "杂项" : "Miscellaneous" },
      { value: "porcelain", label: locale === "zh" ? "瓷器" : "Porcelain" },
      { value: "jade", label: locale === "zh" ? "翡翠玉器" : "Jade" },
      { value: "bronze", label: locale === "zh" ? "铜器" : "Bronze" },
    ],
    [locale]
  );

  const filtered = useMemo(() => {
    return initialData.filter((item) => {
      const itemType = getSearchType(item);
      if (typeFilter !== "all" && itemType !== typeFilter) return false;

      const categoryKey = getCanonicalCategory(item);
      if (categoryFilter !== "all" && categoryKey !== categoryFilter) return false;

      if (saleFilter === "for-sale" && !item.isForSale) return false;
      if (saleFilter === "not-for-sale" && item.isForSale) return false;

      if (!normalizedQuery) return true;

      const caseDetailText = item.caseRecord
        ? Object.values(item.caseRecord)
            .filter((value) => typeof value === "string" && value.trim().length > 0)
            .join(" ")
        : "";

      const searchText = [
        item.title,
        item.titleZh,
        item.category,
        item.categoryZh,
        item.period,
        item.periodZh,
        item.description,
        item.descriptionZh,
        item.collectionId,
        item.uploadedBy,
        item.listingType,
        item.caseRecord?.caseId,
        item.caseRecord?.salePlatform,
        item.caseRecord?.clientRegion,
        item.caseRecord?.riskAdvice,
        caseDetailText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [initialData, typeFilter, categoryFilter, saleFilter, normalizedQuery]);

  return (
    <>
      <SEO
        title="Search"
        description="Search for antiques by text or upload an image to find similar items. Browse Chinese porcelain, jade, paintings, and bronze artifacts from Eastwood Auction."
      />
      <Wrapper>
        <Container size="xl" py={48} px={isMobile ? 14 : undefined}>
          <Stack spacing="lg">
            <div>
              <Title order={1}>{t("search.title")}</Title>
              <Text color="dimmed" mt="xs">
                {locale === "zh"
                  ? "通过关键词搜索藏品、商品和回流案例，并使用筛选条件快速定位结果。"
                  : "Search collections, products, and return cases by keywords with filter controls."}
              </Text>
            </div>

            <Card withBorder radius="md" p="md">
              <Stack spacing="sm">
                <Group position="apart" align="flex-start" noWrap={!isMobile}>
                  <div>
                    <Text
                      size="sm"
                      weight={600}
                      sx={(theme) =>
                        locale === "zh"
                          ? { color: theme.colorScheme === "dark" ? "#f3e7c2" : "#5a4a2a" }
                          : {}
                      }
                    >
                      {locale === "zh" ? "关键词搜索" : "Keyword search"}
                    </Text>
                    <Text
                      size="sm"
                      mt={4}
                      sx={(theme) => ({
                        color: appMutedTextColor(theme),
                      })}
                    >
                      {locale === "zh"
                        ? "通过关键词检索藏品、商品和回流案例。"
                        : "Search collections, products, and return cases by keywords."}
                    </Text>
                  </div>
                </Group>
                <TextInput
                  label={locale === "zh" ? "关键词" : "Keyword"}
                  placeholder={
                    locale === "zh"
                      ? "输入藏品编号、案例编号、标题、品类、年代等"
                      : "Search by collection ID, case ID, title, category, period..."
                  }
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  styles={(theme) => ({
                    label: {
                      color: appFieldLabelColor(theme),
                    },
                  })}
                />
                <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
                  <Select
                    label={locale === "zh" ? "类型" : "Type"}
                    value={typeFilter}
                    onChange={(value) => setTypeFilter((value as typeof typeFilter) || "all")}
                    withinPortal
                    zIndex={5000}
                    styles={(theme) => ({
                      label: {
                        color: appFieldLabelColor(theme),
                      },
                    })}
                    data={[
                      { value: "all", label: locale === "zh" ? "全部" : "All" },
                      { value: "collection", label: locale === "zh" ? "藏品" : "Collections" },
                      { value: "case", label: locale === "zh" ? "回流案例" : "Return cases" },
                    ]}
                  />
                  <Select
                    label={locale === "zh" ? "分类" : "Category"}
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value || "all")}
                    data={categoryOptions}
                    searchable
                    withinPortal
                    zIndex={5000}
                    styles={(theme) => ({
                      label: {
                        color: appFieldLabelColor(theme),
                      },
                    })}
                  />
                  <Select
                    label={locale === "zh" ? "可售状态" : "Sale status"}
                    value={saleFilter}
                    onChange={(value) => setSaleFilter((value as typeof saleFilter) || "all")}
                    withinPortal
                    zIndex={5000}
                    styles={(theme) => ({
                      label: {
                        color: appFieldLabelColor(theme),
                      },
                    })}
                    data={[
                      { value: "all", label: locale === "zh" ? "全部" : "All" },
                      { value: "for-sale", label: locale === "zh" ? "可售" : "For sale" },
                      { value: "not-for-sale", label: locale === "zh" ? "不可售" : "Not for sale" },
                    ]}
                  />
                </SimpleGrid>
              </Stack>
            </Card>

            <Group position="apart" noWrap={!isMobile}>
              <Text color="dimmed">
                {locale === "zh" ? `共 ${filtered.length} 条结果` : `${filtered.length} results`}
              </Text>
            </Group>

            <SimpleGrid cols={3} breakpoints={[{ maxWidth: "lg", cols: 2 }, { maxWidth: "sm", cols: 1 }]}>
              {filtered.map((item) => {
                const itemType = getSearchType(item);
                const typeLabel =
                  itemType === "case"
                    ? locale === "zh"
                      ? "回流案例"
                      : "Return case"
                    : itemType === "product"
                      ? locale === "zh"
                        ? "商品"
                        : "Product"
                      : locale === "zh"
                        ? "藏品"
                        : "Collection";

                return (
                  <Card key={item.id} withBorder radius="md" p="md">
                    <Stack spacing="xs">
                      <Box
                        sx={(theme) => ({
                          height: 180,
                          borderRadius: 8,
                          overflow: "hidden",
                          background:
                            theme.colorScheme === "dark"
                              ? "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.9))"
                              : "linear-gradient(180deg, rgba(250, 247, 242, 0.96), rgba(242, 233, 216, 0.98))",
                          border: `1px solid ${appSurfaceBorder(theme)}`,
                        })}
                      >
                        <Image
                          src={item.image}
                          alt={getLocalized(locale, item.title, item.titleZh)}
                          fit="contain"
                          height={180}
                        />
                      </Box>
                      <Group position="apart" noWrap={false} align="flex-start">
                        <Badge color={itemType === "case" ? "violet.4" : itemType === "product" ? "violet.5" : "yellow"}>
                          {typeLabel}
                        </Badge>
                        {item.collectionId ? (
                          <Text size="xs" color="dimmed" sx={{ overflowWrap: "anywhere" }}>
                            {item.collectionId}
                          </Text>
                        ) : item.caseRecord?.caseId ? (
                          <Text size="xs" color="dimmed" sx={{ overflowWrap: "anywhere" }}>
                            {item.caseRecord.caseId}
                          </Text>
                        ) : null}
                      </Group>
                      <Title order={4} sx={{ lineHeight: 1.4 }}>
                        {getLocalized(locale, item.title, item.titleZh)}
                      </Title>
                      <Group spacing="xs" noWrap={false}>
                        <Badge
                          variant="filled"
                          sx={(theme) => ({
                            backgroundColor: "rgba(216, 183, 109, 0.28)",
                            color: theme.colorScheme === "dark" ? "#f8edd2" : "#4a3510",
                            border: "1px solid rgba(216, 183, 109, 0.55)",
                          })}
                        >
                          {getCategoryLabelByKey(
                            getCanonicalCategory(item),
                            locale,
                            getLocalized(locale, item.category, item.categoryZh)
                          )}
                        </Badge>
                        {(item.periodZh || item.period) ? (
                          <Badge variant="light" color="gray">
                            {getLocalized(locale, item.period, item.periodZh)}
                          </Badge>
                        ) : null}
                      </Group>
                      <Button
                        component={Link}
                        href={getDetailHref(item)}
                        variant="filled"
                        color="yellow"
                        fullWidth
                        rightIcon={<IconArrowRight size={16} />}
                        styles={{
                          root: {
                            minHeight: 46,
                            fontSize: 15,
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #d8b76d 0%, #c89c3d 100%)",
                            color: "#1b1f24",
                            boxShadow: "0 10px 24px rgba(200, 156, 61, 0.28)",
                          },
                          rightIcon: {
                            marginLeft: 6,
                          },
                        }}
                      >
                        {locale === "zh" ? "查看详情" : "View details"}
                      </Button>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Container>
      </Wrapper>
    </>
  );
}

export const getStaticProps: GetStaticProps<SearchPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    return {
      props: {
        initialData: data || [],
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch search data:", error);
    throw error;
  }
};
