import {
  Button,
  Container,
  Flex,
  Grid,
  List,
  Paper,
  PaperProps,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const { Item } = List;

export default function InfoSection() {
  const theme = useMantineTheme();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const paperProps: PaperProps = {
    p: "md",
    sx: {
      background:
        theme.colorScheme === "dark"
          ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
          : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
      boxShadow:
        theme.colorScheme === "dark"
          ? "0 1px 3px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.22)"
          : "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)",
      borderRadius: 16,
      border:
        theme.colorScheme === "dark"
          ? "1px solid rgba(196, 162, 85, 0.10)"
          : "1px solid rgba(180, 158, 120, 0.15)",
    },
  };

  return (
    <Container fluid pt={80} pb={120}>
      <Grid>
        <Grid.Col lg={7}>
          <Paper {...paperProps}>
            <Title order={2} mb="lg">
              {t("support.infoTitle")}
            </Title>
            <Text mb="md">{t("support.infoDescription")}</Text>
            <List mb="md">
              <Item>{t("support.infoItemOne")}</Item>
              <Item>{t("support.infoItemTwo")}</Item>
              <Item>{t("support.infoItemThree")}</Item>
              <Item>{t("support.infoItemFour")}</Item>
              <Item>{t("support.infoItemFive")}</Item>
            </List>
            <Text>{t("support.caseStudies")}</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col lg={5}>
          <Paper {...paperProps}>
            <Title order={3} mb="lg">
              {t("support.contactTitle")}
            </Title>
            <Text mb="md">
              {t("support.contactIntro")}
            </Text>
            <Text mb="md">Email: email@museum.org</Text>
            <Text mb="md">Phone: +000 000 000</Text>
            <Flex gap="sm" wrap="wrap">
              <Button fullWidth={smallerThan}>{t("support.donateNow")}</Button>
              <Button fullWidth={smallerThan}>{t("support.regularDonation")}</Button>
              <Button fullWidth={smallerThan}>{t("support.donateArtifact")}</Button>
            </Flex>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
