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

export default function FaqsSection() {
  const { classes } = useStyles();
  const { t } = useI18n();
  const questions = [
    ["reset-password", "faq.openingHours"],
    ["another-account", "faq.duration"],
    ["newsletter", "faq.guides"],
    ["credit-card", "faq.talks"],
    ["payment", "faq.shop"],
    ["luggage", "faq.luggage"],
    ["access", "faq.access"],
    ["suitable", "faq.family"],
  ] as const;

  return (
    <Container size="sm" className={classes.wrapper}>
      <Title align="center" className={classes.title}>
        {t("faq.title")}
      </Title>
      <Accordion variant="separated">
        {questions.map(([value, questionKey]) => (
          <Accordion.Item className={classes.item} value={value} key={value}>
            <Accordion.Control>{t(questionKey)}</Accordion.Control>
            <Accordion.Panel>{t("faq.placeholder")}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Container>
  );
}
