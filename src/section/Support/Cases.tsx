import { getImportedArtworks } from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";
import {
  Alert,
  Badge,
  Container,
  Grid,
  Image,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

export default function CasesSection() {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);

  useEffect(() => {
    setItems(getImportedArtworks());
  }, []);

  const cases = useMemo(
    () => items.filter((item) => item.caseRecord),
    [items]
  );

  return (
    <Container fluid pt={80} pb={120}>
      <Title order={2} mb="xl">
        {t("support.caseTitle")}
      </Title>

      {cases.length === 0 ? (
        <Alert color="blue">{t("support.emptyCases")}</Alert>
      ) : (
        <Stack spacing="lg">
          {cases.map((item) => {
            const caseRecord = item.caseRecord;

            if (!caseRecord) {
              return null;
            }

            const itemTitle = locale === "zh" && item.titleZh ? item.titleZh : item.title;
            const itemDescription =
              locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;

            return (
              <Paper
                key={item.id}
                p="lg"
                sx={{
                  border: "1px solid rgba(216, 183, 109, 0.2)",
                  backgroundColor: "rgba(24, 30, 38, 0.96)",
                }}
              >
                <Grid>
                  <Grid.Col md={4}>
                    <Image
                      src={item.image}
                      alt={itemTitle}
                      height={260}
                      fit="cover"
                      radius="sm"
                    />
                  </Grid.Col>
                  <Grid.Col md={8}>
                    <Stack spacing="xs">
                      <Badge color="yellow">{t("support.caseDetails")}</Badge>
                      <Title order={3}>{itemTitle}</Title>
                      <Text color="dark.1">{itemDescription}</Text>
                      <Text>
                        <strong>{t("support.casePhoto")}:</strong> {item.image}
                      </Text>
                      <Text>
                        <strong>{t("support.caseName")}:</strong> {itemTitle} / {itemDescription}
                      </Text>
                      <Text>
                        <strong>{t("image.caseSalePrice")}:</strong> {caseRecord.salePrice}
                      </Text>
                      <Text>
                        <strong>{t("image.caseSaleTime")}:</strong> {caseRecord.saleTime}
                      </Text>
                      <Text>
                        <strong>{t("image.casePlatform")}:</strong> {caseRecord.salePlatform}
                      </Text>
                      <Text>
                        <strong>{t("image.caseClientRegion")}:</strong> {caseRecord.clientRegion}
                      </Text>
                      <Text>
                        <strong>{t("image.caseLogisticsCost")}:</strong> {caseRecord.logisticsCost}
                      </Text>
                      <Text>
                        <strong>{t("image.casePurchaseChannel")}:</strong> {caseRecord.purchaseChannel}
                      </Text>
                      <Text>
                        <strong>{t("image.casePurchaseCost")}:</strong> {caseRecord.purchaseCost}
                      </Text>
                      <Text>
                        <strong>{t("image.caseRiskAdvice")}:</strong> {caseRecord.riskAdvice}
                      </Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
