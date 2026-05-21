import {
  ActionIcon,
  ActionIconProps,
  Anchor,
  Button,
  Container,
  createStyles,
  Divider,
  Flex,
  rem,
  SimpleGrid,
  Stack,
  StackProps,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandYoutube,
  IconClock,
  IconMap2,
} from "@tabler/icons-react";
import React from "react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  footer: {
    marginTop: rem(120),
    backgroundColor: "#0f1216",
    color: theme.colors.dark[0],
    borderTop: `${rem(1)} solid rgba(216, 183, 109, 0.18)`,
  },

  container: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,

    [theme.fn.smallerThan("sm")]: {
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
  },

  logo: {
    maxWidth: rem(200),

    [theme.fn.smallerThan("sm")]: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
  },

  description: {
    marginTop: rem(5),

    [theme.fn.smallerThan("sm")]: {
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
  },

  inner: {
    display: "flex",
    justifyContent: "space-between",

    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column",
      alignItems: "center",
    },
  },

  groups: {
    display: "flex",
    flexWrap: "wrap",

    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  wrapper: {
    width: rem(160),
  },

  link: {
    display: "block",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[1]
        : theme.colors.dark[0],
    fontSize: theme.fontSizes.md,
    paddingTop: rem(4),
    paddingBottom: rem(4),

    "&:hover": {
      textDecoration: "underline",
    },
  },

  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 700,
    marginBottom: `calc(${theme.spacing.xs} / 2)`,
    color: theme.white,
  },

  afterFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderTop: `${rem(1)} solid rgba(216, 183, 109, 0.18)`,

    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column",
    },
  },

  social: {
    [theme.fn.smallerThan("sm")]: {
      marginTop: theme.spacing.xs,
    },
  },
  newsletterRow: {
    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  legalRow: {
    [theme.fn.smallerThan("sm")]: {
      flexWrap: "wrap",
    },
  },
}));

interface FooterLinksProps {
  data: {
    title: string;
    links: { label: string; link: string }[];
  }[];
}

export default function AppFooter({ data }: FooterLinksProps) {
  const { classes, theme } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const actionIconProps: ActionIconProps = {
    size: smallerThan ? "lg" : "xl",
    variant: "light",
    radius: "xl",
    color: "violet",
  };

  const stackProps: StackProps = {
    p: theme.spacing.md,
    spacing: 6,
    sx: {
      backgroundColor: theme.colors.dark[6],
      border: `1px solid rgba(216, 183, 109, 0.18)`,
      borderRadius: theme.radius.sm,
    },
  };

  const footerLabels: Record<string, string> = {
    "About Us": t("footer.about"),
    Governance: t("footer.governance"),
    "Museum Story": t("footer.museumStory"),
    Jobs: t("footer.jobs"),
    Press: t("footer.press"),
    "Contact Us": t("footer.contactUs"),
    Visit: t("footer.visit"),
    Map: t("footer.map"),
    "Exhibitions and Events": t("footer.exhibitionsEvents"),
    Accessibility: t("footer.accessibility"),
    "Audio Guide": t("footer.audioGuide"),
    Resources: t("footer.resources"),
    "Study Rooms": t("footer.studyRooms"),
    "Library and Archive": t("footer.libraryArchive"),
    Blog: t("footer.blog"),
    Community: t("footer.community"),
  };

  const translateFooterLabel = (label: string) => footerLabels[label] ?? label;

  const groups = data.map((group) => {
    const links = group.links.map((link, index) => (
      <Text<"a">
        key={index}
        className={classes.link}
        component="a"
        href={link.link}
        onClick={(event) => event.preventDefault()}
      >
        {translateFooterLabel(link.label)}
      </Text>
    ));

    return (
      <div className={classes.wrapper} key={group.title}>
        <Text className={classes.title}>{translateFooterLabel(group.title)}</Text>
        {links}
      </div>
    );
  });

  return (
    <footer className={classes.footer}>
      <Container fluid className={classes.container}>
        <Flex
          align="center"
          justify="space-between"
          direction={{ base: "column", sm: "row" }}
        >
          <Stack spacing="sm">
            <Title order={2} align={smallerThan ? "center" : "start"}>
              {t("footer.connect")}
            </Title>
            <Flex gap="sm">
              <Tooltip label="Facebook">
                <ActionIcon title="facebook" {...actionIconProps}>
                  <IconBrandFacebook />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Twitter">
                <ActionIcon title="twitter" {...actionIconProps}>
                  <IconBrandTwitter />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Instagram">
                <ActionIcon title="instagram" {...actionIconProps}>
                  <IconBrandInstagram />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="YouTube">
                <ActionIcon title="youtube" {...actionIconProps}>
                  <IconBrandYoutube />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="LinkedIn">
                <ActionIcon title="linkedin" {...actionIconProps}>
                  <IconBrandLinkedin />
                </ActionIcon>
              </Tooltip>
            </Flex>
          </Stack>
          <Stack spacing="sm" mt={smallerThan ? "md" : 0}>
            <Text size={smallerThan ? "md" : "lg"}>
              {t("footer.newsletter")}
            </Text>
            <Flex gap={smallerThan ? "sm" : "xs"} className={classes.newsletterRow}>
              <TextInput
                size="md"
                sx={{ flexGrow: 1 }}
                aria-label={t("footer.emailAria")}
                placeholder={t("footer.emailPlaceholder")}
              />
              <Button size="md" fullWidth={smallerThan}>{t("footer.signup")}</Button>
            </Flex>
          </Stack>
        </Flex>
      </Container>
      <Divider />
      <Container fluid className={classes.container}>
        <SimpleGrid
          cols={4}
          spacing="lg"
          breakpoints={[
            { maxWidth: "md", cols: 2, spacing: "md" },
            { maxWidth: "sm", cols: 1, spacing: "sm" },
          ]}
        >
          <Stack>
            <Stack {...stackProps}>
              <Flex gap="md" align="center">
                <IconMap2 size={24} />
                <Text size="lg" weight={500}>
                  {t("home.whereVisit")}
                </Text>
              </Flex>
              <Text>{t("home.addressLineOne")}</Text>
              <Text>{t("home.addressLineTwo")}</Text>
              <Text>+254 000 000 000</Text>
            </Stack>
            <Stack {...stackProps}>
              <Flex gap="md" align="center">
                <IconClock size={24} />
                <Text size="lg" weight={500}>
                  {t("home.openingTimes")}
                </Text>
              </Flex>
              <Text>{t("home.openingFrom")}</Text>
              <Text>{t("home.openingWeekday")}</Text>
            </Stack>
          </Stack>
          {groups}
        </SimpleGrid>
      </Container>
      <Divider />
      <Container fluid className={classes.container}>
        <Flex
          justify="space-between"
          align="center"
          direction={{ base: "column", md: "row" }}
          gap={{ base: "sm", sm: "lg" }}
        >
          <Flex gap="sm" justify="center" align="center" className={classes.legalRow}>
            <Anchor weight={500} color="violet.7">
              {t("footer.privacy")}
            </Anchor>
            <Anchor weight={500} color="violet.7">
              {t("footer.cookies")}
            </Anchor>
            <Anchor weight={500} color="violet.7">
              {t("footer.terms")}
            </Anchor>
          </Flex>
          <Text>&copy;{new Date().getFullYear()}&nbsp;{t("footer.copyright")}</Text>

        </Flex>
      </Container>
    </footer>
  );
}
