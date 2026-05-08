import {
  Box,
  Container,
  createStyles,
  Paper,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.violet[9],
    color: theme.white,

    "&:hover, &:focus": {
      cursor: "pointer",
    },
  },
}));

export default function SupportSection() {
  const { classes } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  return (
    <Container pt={80} pb={120} sx={{ overflow: "hidden" }}>
      <Box mb="xl" sx={{ textAlign: "center" }}>
        <Title size={smallerThan ? 32 : 48} mb="md">
          {t("sharedSupport.title")}
        </Title>
        <Text size="lg">{t("sharedSupport.subtitle")}</Text>
      </Box>
      <SimpleGrid
        cols={3}
        breakpoints={[
          { maxWidth: "md", cols: 1, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        <Paper p="md" className={classes.card}>
          <Text size="xl" weight={600} mb="sm">
            {t("sharedSupport.memberTitle")}
          </Text>
          <Text>
            {t("sharedSupport.memberDescription")}
          </Text>
        </Paper>
        <Paper p="md" className={classes.card}>
          <Text size="xl" weight={600} mb="sm">
            {t("sharedSupport.donateTitle")}
          </Text>
          <Text>
            {t("sharedSupport.donateDescription")}
          </Text>
        </Paper>
        <Paper p="md" className={classes.card}>
          <Text size="xl" weight={600} mb="sm">
            {t("sharedSupport.shopTitle")}
          </Text>
          <Text>
            {t("sharedSupport.shopDescription")}
          </Text>
        </Paper>
      </SimpleGrid>
    </Container>
  );
}
