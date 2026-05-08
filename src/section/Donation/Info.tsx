import {
  Alert,
  Anchor,
  Button,
  Container,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

export default function InfoSection() {
  const theme = useMantineTheme();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  return (
    <Container pt={80} pb={120}>
      <Title size={smallerThan ? 32 : 48} mb="xl" align="center">
        {t("donation.infoTitle")}
      </Title>
      <Text mb="md">{t("donation.infoParagraphOne")}</Text>
      <Text mb="md">{t("donation.infoParagraphTwo")}</Text>
      <Button
        size="md"
        my={smallerThan ? "xl" : "lg"}
        fullWidth={smallerThan}
        variant="filled"
      >
        {t("donation.donateNow")}
      </Button>
      <Alert>
        <Text weight={500} size="md">
          {t("donation.questionsPrefix")} {" "}
          <Anchor weight={500} color="black" td="underline">
            mail@museum.org
          </Anchor>{" "}
          {t("donation.or")} {" "}
          <Anchor weight={500} color="black" td="underline">
            000.000.0000.
          </Anchor>
        </Text>
      </Alert>
    </Container>
  );
}
