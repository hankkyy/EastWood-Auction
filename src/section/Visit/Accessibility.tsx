import {
  Button,
  Container,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { proxyImageUrl } from "@/lib/proxyImage";

export default function AccessibilitySection() {
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  return (
    <Container pt={80} pb={120}>
      <SimpleGrid
        cols={2}
        spacing="lg"
        sx={{ alignItems: "center" }}
        breakpoints={[
          { maxWidth: "md", cols: 2, spacing: "md" },
          { maxWidth: "sm", cols: 2, spacing: "sm" },
          { maxWidth: "xs", cols: 1, spacing: "sm" },
        ]}
      >
        <Stack align="start">
          <Title size={smallerThan ? 32 : 48}>
            {t("visit.accessibilityTitle")}
          </Title>
          <Text>{t("visit.accessibilityOne")}</Text>
          <Text>{t("visit.accessibilityTwo")}</Text>
          <Button size="md" variant="light" fullWidth={smallerThan}>
            {t("visit.learnMore")}
          </Button>
        </Stack>
        {!smallerThan && (
          <Image
            src={proxyImageUrl("https://images.unsplash.com/photo-1545483656-1a34ae73add1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80")}
            alt="accessibility image"
            height={360}
            radius="sm"
          />
        )}
      </SimpleGrid>
    </Container>
  );
}
