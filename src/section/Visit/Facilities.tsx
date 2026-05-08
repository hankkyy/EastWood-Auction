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
            sx={{ backgroundColor: theme.colors.violet[0] }}
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
