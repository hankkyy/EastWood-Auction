import {
  Container,
  createStyles,
  Paper,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const data = [
  "collections.linkCollection",
  "collections.linkCollectionOnline",
  "collections.linkGalleries",
  "collections.linkBlog",
  "collections.linkPodcast",
] as const;

const useStyles = createStyles((theme) => ({
  card: {
    border: `1px solid ${theme.colors.gray[2]}`,

    "&:hover, &:focus": {
      border: `1px solid ${theme.colors.violet[7]}`,
      color: theme.colors.violet[7],
      cursor: "pointer",
      transition: "all ease-in 150ms",
      transform: "scale(1.03)",
    },
  },
}));

export default function LinksSection() {
  const { classes } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const items = data.map((d) => (
    <Paper key={t(d)} px="sm" py="xl" className={classes.card}>
      <Text transform="capitalize" weight={500} align="center">
        {t(d)}
      </Text>
    </Paper>
  ));

  return (
    <Container pt={80} pb={120}>
      <Title size={smallerThan ? 32 : 48} align="center" mb="xl">
        {t("collections.linksTitle")}
      </Title>
      <SimpleGrid
        cols={3}
        spacing="lg"
        breakpoints={[
          { maxWidth: "md", cols: 3, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {items}
      </SimpleGrid>
    </Container>
  );
}
