import { Box, Container, createStyles, Image, SimpleGrid, Tabs, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const categories = [
  { value: "all", labelKey: "collections.tabAll" },
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

const data = [
  {
    image:
      "https://images.unsplash.com/photo-1578926288207-a90a5366759d?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemPorcelainBowl",
    category: "porcelain",
  },
  {
    image:
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemInkPainting",
    category: "calligraphy",
  },
  {
    image:
      "https://images.unsplash.com/photo-1602086232396-bdff9b31bc7d?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemBlueVase",
    category: "porcelain",
  },
  {
    image:
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemJadePendant",
    category: "jade",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemBronzeVessel",
    category: "bronze",
  },
  {
    image:
      "https://images.unsplash.com/photo-1611308013843-a639168ef025?auto=format&fit=crop&w=1200&q=85",
    titleKey: "collections.itemLacquerBox",
    category: "misc",
  },
] as const;

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
    backgroundColor: "#050505",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: remValue(560),
    objectFit: "cover",
    display: "block",
    transition: "transform 220ms ease, filter 220ms ease",

    "&:hover": {
      transform: "scale(1.025)",
      filter: "brightness(1.08)",
    },

    [theme.fn.smallerThan("md")]: {
      height: remValue(420),
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

export default function Collections() {
  const { classes } = useStyles();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

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
                ? data.slice(0, 3)
                : data.filter((item) => item.category === category.value);

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
                    <Box key={item.titleKey}>
                      <Box className={classes.imageWrap}>
                        <Image
                          src={item.image}
                          alt={t(item.titleKey)}
                          className={classes.image}
                        />
                      </Box>
                      <Text className={classes.itemTitle}>{t(item.titleKey)}</Text>
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
