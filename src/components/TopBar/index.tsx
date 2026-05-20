import {
  Button,
  ButtonProps,
  Container,
  createStyles,
  Divider,
  Flex,
  Group,
  Header,
  Paper,
  rem,
  Text,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import React, { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import LanguagePicker from "@/components/LanguagePicker";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const { Slide } = Carousel;

const useStyles = createStyles((theme) => ({
  inner: {
    height: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "nowrap",
    padding: `${theme.spacing.xs} ${theme.spacing.xl}`,
    backgroundColor: "#0f1216",
    color: theme.colors.dark[0],
    borderBottom: `1px solid rgba(216, 183, 109, 0.18)`,

    [theme.fn.smallerThan("md")]: {
      justifyContent: "space-between",
    },

    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column",
      justifyContent: "center",
    },
  },

  links: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  burger: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  link: {
    display: "block",
    lineHeight: 1,
    padding: `${rem(8)} ${rem(12)}`,
    borderRadius: theme.radius.sm,
    textDecoration: "none",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.dark[0],
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    "&:hover": {
      backgroundColor: theme.colors.dark[6],
    },
  },

  linkLabel: {
    marginRight: rem(5),
  },

  announcementCard: {
    backgroundColor: "rgba(216, 183, 109, 0.12)",
    color: theme.colors.dark[0],
    border: `1px solid rgba(216, 183, 109, 0.22)`,
    textAlign: "center",
    padding: rem(8),

    [theme.fn.smallerThan("sm")]: {
      padding: 0,
    },
  },

  hiddenTablet: {
    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },

  leftSection: {
    justifyContent: "space-between",

    [theme.fn.smallerThan("md")]: {
      width: "100%",
    },
    [theme.fn.smallerThan("sm")]: {
      justifyContent: "center",
    },
  },
}));

const announcementsData = [
  "top.announcementMuseum",
  "top.announcementCovid",
] as const;

export default function TopBar() {
  const { classes } = useStyles();
  const { t } = useI18n();
  const autoplay = useRef(Autoplay({ delay: 15000 }));
  const smallerThan = useMediaQuery("(max-width: 600px)");

  const buttonProps: ButtonProps = {
    variant: "subtle",
  };

  return (
    <Header height="100%" sx={{ borderBottom: 0 }}>
      <Container className={classes.inner} fluid>
        <Flex gap="sm" align="center" className={classes.leftSection}>
          <Text size={smallerThan ? "xs" : "sm"} weight={600}>
            {t("top.openToday")}
          </Text>
          <Divider orientation="vertical" className={classes.hiddenTablet} />
          <Carousel
            slideSize="100%"
            align="start"
            withIndicators={false}
            loop={true}
            draggable={false}
            height={36}
            orientation="vertical"
            plugins={[autoplay.current]}
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
            withControls={false}
          >
            {announcementsData.map((a, i) => (
              <Slide key={`announcement-${i}`}>
                <Paper className={classes.announcementCard}>
                  <Text
                    size={smallerThan ? "xs" : "sm"}
                    weight={500}
                    transform="uppercase"
                  >
                    {t(a)}
                  </Text>
                </Paper>
              </Slide>
            ))}
          </Carousel>
        </Flex>
        <Group spacing="sm" className={classes.hiddenTablet}>
          <Button {...buttonProps}>{t("top.joinGive")}</Button>
          <LanguagePicker />
        </Group>
      </Container>
    </Header>
  );
}
