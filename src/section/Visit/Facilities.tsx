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
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1172&q=80",
    titleKey: "visit.foodTitle",
  },
  {
    image:
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
    titleKey: "visit.shopTitle",
  },
  {
    image:
      "https://images.unsplash.com/photo-1635184551554-e42829283972?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
    titleKey: "visit.collectionsTitle",
  },
] as const;

export default function FacilitiesSection() {
  const theme = useMantineTheme();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  return (
    <Container fluid pt={80} pb={120}>
      <Title size={smallerThan ? 32 : 48} mb="xl" align="center">
        {t("visit.facilitiesTitle")}
      </Title>
      <SimpleGrid
        cols={3}
        spacing="lg"
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
              <Title order={3} mb="md" transform="capitalize">
                {t(d.titleKey)}
              </Title>
              <Text>{t("visit.facilityDescription")}</Text>
            </Box>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
}
