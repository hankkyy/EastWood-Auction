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
      backgroundColor: theme.colors.violet[0],
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
