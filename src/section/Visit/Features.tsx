import {
  Box,
  Container,
  Image,
  Paper,
  SimpleGrid,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const data = [
  {
    image:
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80",
    titleKey: "visit.galleriesTitle",
  },
  {
    image:
      "https://plus.unsplash.com/premium_photo-1661893375334-e2603ce341d7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1194&q=80",
    titleKey: "visit.familyTitle",
  },
  {
    image:
      "https://images.unsplash.com/photo-1601059252957-c3d6f1911313?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
    titleKey: "visit.eventsTitle",
  },
] as const;

export default function FeaturesSection() {
  const theme = useMantineTheme();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  return (
    <Container fluid pt={80} pb={120}>
      <Title size={smallerThan ? 32 : 48} align="center" mb="xl">
        {t("visit.exploreTitle")}
      </Title>
      <SimpleGrid
        cols={3}
        spacing="md"
        breakpoints={[
          { maxWidth: "md", cols: 1, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {data.map((d, i) => (
          <Paper
            key={`visit-feature-${i}`}
            sx={{ backgroundColor: theme.colors.violet[0] }}
          >
            <Image src={d.image} alt={t(d.titleKey)} height={360} radius="sm" />
            <Box p="md">
              <Title order={3} mb="md">
                {t(d.titleKey)}
              </Title>
              <Text>{t("visit.featureDescription")}</Text>
            </Box>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
}
