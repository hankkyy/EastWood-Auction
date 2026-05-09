import Link from "next/link";
import { getKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

export default function CasesSection() {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);

  useEffect(() => {
    setItems(getKnowledgeBase());
  }, []);

  const cases = useMemo(() => items.filter((item) => item.caseRecord), [items]);

  return (
    <Container fluid pt={80} pb={120}>
      <Title order={2} mb="xl">
        {t("support.caseTitle")}
      </Title>

      {cases.length === 0 ? (
        <Alert color="blue">{t("support.emptyCases")}</Alert>
      ) : (
        <SimpleGrid cols={3} spacing="xl" breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "sm", cols: 1 }]}>
          {cases.map((item) => {
            const caseRecord = item.caseRecord;

            if (!caseRecord) {
              return null;
            }

            const itemTitle = locale === "zh" && item.titleZh ? item.titleZh : item.title;
            const itemDescription =
              locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;

            return (
              <Card key={item.id} padding="md" radius="sm" sx={{ backgroundColor: "rgba(34, 39, 47, 0.96)", border: "1px solid rgba(216, 183, 109, 0.16)" }}>
                <Card.Section>
                  <Box sx={{ height: 220, background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.9))", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}><Box component="img" src={item.image} alt={itemTitle} sx={{ width: "100%", height: "100%", objectFit: "contain" }} /></Box>
                </Card.Section>
                <Stack spacing="sm" mt="md">
                  <Badge color="yellow" variant="filled" sx={{ alignSelf: "flex-start" }}>
                    {t("support.caseCardBadge")}
                  </Badge>
                  <Title order={3} size="h3">{itemTitle}</Title>
                  <Group spacing={8} color="dark.1">
                    <IconCalendarEvent size={16} />
                    <Text size="sm" color="dark.1">{caseRecord.saleTime}</Text>
                  </Group>
                  <Text size="sm" color="dark.1" lineClamp={3}>
                    {itemDescription}
                  </Text>
                  <Button component={Link} href={`/cases/${item.id}`} variant="subtle" px={0} sx={{ alignSelf: "flex-start" }}>
                    {t("image.caseOpen")}
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
