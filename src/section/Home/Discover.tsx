import { useRouter } from "next/router";
import {
  Box,
  Button,
  ButtonProps,
  Center,
  Container,
  createStyles,
  Divider,
  Grid,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { proxyImageUrl } from "@/lib/proxyImage";
import {
  appMutedTextColor,
  artworkCardShellBackground,
  cardTextureOverlay,
  cardShadow,
  cardShadowHover,
  cardInnerRim,
  cardBorder,
  cardBorderHover,
  primaryActionButtonSx,
  secondaryActionButtonSx,
} from "@/components/artworkStyles";

const useStyles = createStyles((theme) => ({
  card: {
    background: `${artworkCardShellBackground(theme)}, ${cardTextureOverlay(theme)}`,
    border: cardBorder(theme),
    boxShadow: cardShadow(theme),
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    transition:
      "transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 280ms ease, box-shadow 320ms ease",

    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: 20,
      boxShadow: cardInnerRim(theme),
      pointerEvents: "none",
      zIndex: 2,
    },

    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: 20,
      background:
        theme.colorScheme === "dark"
          ? "radial-gradient(ellipse at 30% 20%, rgba(196,162,85,0.04) 0%, transparent 60%)"
          : "radial-gradient(ellipse at 30% 20%, rgba(196,162,85,0.06) 0%, transparent 60%)",
      pointerEvents: "none",
      zIndex: 1,
    },

    "&:hover": {
      transform: "translateY(-6px)",
      border: cardBorderHover(theme),
      boxShadow: cardShadowHover(theme),
    },
  },
}));

export default function DiscoverSection() {
  const router = useRouter();
  const { classes } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const buttonProps: ButtonProps = {
    variant: "outline",
    fullWidth: smallerThan,
  };

  const handleDiscoverMore = () => {
    router.push("/shop");
  };

  return (
    <Container fluid pt={80} pb={120}>
      <Box mb="xl" sx={{ textAlign: "center", maxWidth: 780, margin: "0 auto 48px" }}>
        <Title size={smallerThan ? 32 : 48} mb="md">
          {t("home.discoverTitle")}
        </Title>
        <Text size="lg" sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.8 })}>
          {t("home.discoverSubtitle")}
        </Text>
      </Box>
      <Paper className={classes.card} p={smallerThan ? 10 : 8}>
        <Grid sx={{ alignItems: "center", position: "relative", zIndex: 3 }}>
          <Grid.Col lg={6} p={0}>
            <Image
              src={proxyImageUrl("https://images.unsplash.com/photo-1610494940231-a07875fb25fc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80")}
              alt=""
              height={smallerThan ? 320 : 420}
              fit="cover"
              radius="sm"
            />
          </Grid.Col>
          <Grid.Col lg={6} p={0}>
            <Stack align="start" p={smallerThan ? "md" : "xl"} spacing="md">
              <Title size={smallerThan ? 24 : 28}>{t("home.discoverFeatureTitle")}</Title>
              <Text sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.8 })}>
                {t("home.discoverFeatureP1")}
              </Text>
              <Text sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.8 })}>
                {t("home.discoverFeatureP2")}
              </Text>
              <Text sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.8 })}>
                {t("home.discoverFeatureP3")}
              </Text>
              <Button
                {...buttonProps}
                size={smallerThan ? "sm" : "md"}
                onClick={handleDiscoverMore}
                sx={(theme) => secondaryActionButtonSx(theme)}
              >
                {t("home.continueReading")}
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
      {!smallerThan && <Divider my="xl" />}
      <SimpleGrid
        cols={2}
        mt="xl"
        breakpoints={[
          { maxWidth: "lg", cols: 2, spacing: "lg" },
          { maxWidth: "md", cols: 1, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {[
          { titleKey: "home.newsTitle1", textKey: "home.newsText1" },
          { titleKey: "home.newsTitle2", textKey: "home.newsText2" },
          { titleKey: "home.newsTitle3", textKey: "home.newsText3" },
          { titleKey: "home.newsTitle4", textKey: "home.newsText4" },
        ].map((item, i) => (
          <Paper key={`news-item-${i}`} className={classes.card} p={smallerThan ? "md" : "lg"}>
            <Box sx={{ position: "relative", zIndex: 3 }}>
              <Text size="lg" weight={600} mb="md">
                {t(item.titleKey as any)}
              </Text>
              <Text mb="md" sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.75 })}>
                {t(item.textKey as any)}
              </Text>
              <Button {...buttonProps} onClick={handleDiscoverMore} sx={(theme) => secondaryActionButtonSx(theme)}>
                {t("home.readMore")}
              </Button>
            </Box>
          </Paper>
        ))}
      </SimpleGrid>
      <Center mt={smallerThan ? 36 : "xl"}>
        <Button
          size="xl"
          variant="filled"
          fullWidth={smallerThan}
          onClick={handleDiscoverMore}
          sx={primaryActionButtonSx}
        >
          {t("home.discoverMore")}
        </Button>
      </Center>
    </Container>
  );
}
