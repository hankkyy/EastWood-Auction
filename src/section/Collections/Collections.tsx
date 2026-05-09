import { Box, Container, createStyles, SimpleGrid, Tabs, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { getKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import type { Artwork } from "@/data/artworks";
import { useEffect, useMemo, useState } from "react";

const categories = [
  { value: "all", labelKey: "collections.tabAll" },
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

type CollectionCard = {
  key: string;
  image: string;
  title: string;
  category: string;
};

const useStyles = createStyles((theme) => ({
  wrapper: {
    backgroundColor: "#181a1b",
    color: theme.colors.dark[0],
    paddingTop: remValue(72),
    paddingBottom: remValue(96),
  },

  intro: {
    textAlign: "center",
    marginBottom: remValue(78),
  },

  eyebrow: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: remValue(25),
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: theme.colors.dark[0],
    marginBottom: remValue(18),
  },

  description: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: remValue(25),
    lineHeight: 1.45,
    textTransform: "uppercase",
    color: theme.colors.dark[0],
  },

  tabs: {
    marginBottom: remValue(46),

    ".mantine-Tabs-tabsList": {
      justifyContent: "center",
      borderBottom: "1px solid rgba(246, 239, 227, 0.22)",
      gap: remValue(24),
    },

    ".mantine-Tabs-tab": {
      color: "rgba(246, 239, 227, 0.68)",
      fontSize: remValue(22),
      fontWeight: 700,
      paddingLeft: remValue(4),
      paddingRight: remValue(4),
      paddingBottom: remValue(22),
      borderColor: "transparent",

      "&[data-active]": {
        color: theme.colors.dark[0],
        borderBottomColor: theme.colors.dark[0],
      },
    },
  },

  imageWrap: {
    background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.92))",
    overflow: "hidden",
    height: remValue(560),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: remValue(16),

    [theme.fn.smallerThan("md")]: {
      height: remValue(420),
      padding: remValue(12),
    },
  },

  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
    transition: "transform 220ms ease, filter 220ms ease",

    "&:hover": {
      transform: "scale(1.025)",
      filter: "brightness(1.08)",
    },

  },

  itemTitle: {
    marginTop: remValue(22),
    textAlign: "center",
    color: theme.colors.dark[0],
    fontSize: remValue(25),
    fontWeight: 800,
  },
}));

function remValue(value: number) {
  return `${value / 16}rem`;
}

const mapArtworkCategory = (artwork: Artwork): string => {
  const category = `${artwork.category} ${artwork.categoryZh ?? ""}`.toLowerCase();
  if (category.includes("jade") || category.includes("玉")) return "jade";
  if (category.includes("bronze") || category.includes("铜")) return "bronze";
  if (category.includes("porcelain") || category.includes("瓷")) return "porcelain";
  if (category.includes("painting") || category.includes("画") || category.includes("calligraphy") || category.includes("书")) return "calligraphy";
  return "misc";
};

export default function Collections() {
  const { classes } = useStyles();
  const { t, locale } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState<Artwork[]>([]);

  useEffect(() => {
    setKnowledgeBaseItems(getKnowledgeBase());
  }, []);

  const cards = useMemo<CollectionCard[]>(() => {
    return knowledgeBaseItems
      .filter((item) => !item.caseRecord)
      .map((item) => ({
        key: item.id,
        image: item.image,
        title: locale === "zh" && item.titleZh ? item.titleZh : item.title,
        category: mapArtworkCategory(item),
      }));
  }, [knowledgeBaseItems, locale]);

  return (
    <Box className={classes.wrapper}>
      <Container fluid px={smallerThan ? "md" : 72}>
        <Box className={classes.intro}>
          <Title order={2} className={classes.eyebrow}>
            {t("collections.exhibitionTitle")}
          </Title>
          <Text className={classes.description}>
            {t("collections.exhibitionDescription")}
          </Text>
        </Box>

        <Tabs defaultValue="all" className={classes.tabs} variant="outline">
          <Tabs.List>
            {categories.map((category) => (
              <Tabs.Tab key={category.value} value={category.value}>
                {t(category.labelKey)}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {categories.map((category) => {
            const visibleItems =
              category.value === "all"
                ? cards
                : cards.filter((item) => item.category === category.value);

            return (
              <Tabs.Panel key={category.value} value={category.value} pt="xl">
                <SimpleGrid
                  cols={3}
                  spacing={36}
                  breakpoints={[
                    { maxWidth: "md", cols: 2, spacing: "lg" },
                    { maxWidth: "sm", cols: 1, spacing: "md" },
                  ]}
                >
                  {visibleItems.map((item) => (
                    <Box key={item.key}>
                      <Box className={classes.imageWrap}>
                        <Box component="img" src={item.image} alt={item.title} className={classes.image} />
                      </Box>
                      <Text className={classes.itemTitle}>{item.title}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Tabs.Panel>
            );
          })}
        </Tabs>
      </Container>
    </Box>
  );
}
