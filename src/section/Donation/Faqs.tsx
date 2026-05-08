import { Container, Title, Accordion, createStyles, rem } from "@mantine/core";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  wrapper: {
    paddingTop: `calc(${theme.spacing.xl} * 2)`,
    paddingBottom: `calc(${theme.spacing.xl} * 2)`,
    minHeight: 650,
  },

  title: {
    marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
  },

  item: {
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
    border: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },
}));

const methods = [
  "donation.methodCreditPhone",
  "donation.methodCheck",
  "donation.methodTransfer",
  "donation.methodStock",
  "donation.methodDonorFund",
] as const;

export default function FaqsSection() {
  const { classes } = useStyles();
  const { t } = useI18n();

  return (
    <Container size="sm" className={classes.wrapper}>
      <Title align="center" className={classes.title}>
        {t("donation.waysTitle")}
      </Title>

      <Accordion variant="separated">
        {methods.map((method) => (
          <Accordion.Item className={classes.item} value={method} key={method}>
            <Accordion.Control>{t(method)}</Accordion.Control>
            <Accordion.Panel>{t("donation.methodDescription")}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Container>
  );
}
