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
            sx={(theme) => ({
              background: theme.colorScheme === "dark"
                ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
                : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
              boxShadow: theme.colorScheme === "dark"
                ? "0 1px 3px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.22)"
                : "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)",
              borderRadius: 16,
              border: theme.colorScheme === "dark"
                ? "1px solid rgba(196, 162, 85, 0.10)"
                : "1px solid rgba(180, 158, 120, 0.15)",
            })}
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
