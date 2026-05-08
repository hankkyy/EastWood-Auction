import {
  Box,
  Burger,
  Button,
  ButtonProps,
  createStyles,
  Divider,
  Drawer,
  Group,
  Header,
  Image,
  rem,
  ScrollArea,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import LanguagePicker from "@/components/LanguagePicker";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  header: {
    border: "none",
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: "rgba(15, 18, 22, 0.96)",
    color: theme.white,
    backdropFilter: "blur(12px)",
  },
  link: {
    color: theme.colors.dark[0],
    [theme.fn.smallerThan("sm")]: {},

    ...theme.fn.hover({
      backgroundColor: theme.colors.dark[6],
      color: theme.colors.violet[7],
    }),
  },
  activeLink: {
    color: theme.colors.violet[7],
    backgroundColor: "rgba(216, 183, 109, 0.12)",
    borderBottom: `2px solid ${theme.colors.violet[7]}`,

    ...theme.fn.hover({
      borderRadius: theme.radius.sm,
      backgroundColor: "rgba(216, 183, 109, 0.16)",
    }),

    [theme.fn.smallerThan("md")]: {
      color: theme.colors.violet[7],
    },
  },
  hiddenMobile: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },
  hiddenTablet: {
    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },
  hiddenDesktop: {
    [theme.fn.largerThan("md")]: {
      display: "none",
    },
  },
  brandButton: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  brandLogo: {
    width: 188,
    height: 52,
    objectFit: "contain",
    borderRadius: theme.radius.xs,
    [theme.fn.smallerThan("sm")]: {
      width: 142,
      height: 42,
    },
  },
}));

const mockdata = [
  {
    labelKey: "nav.visit",
    link: "/visit",
  },
  {
    labelKey: "nav.exhibitions",
    link: "/exhibitions",
  },
  {
    labelKey: "nav.collections",
    link: "/collections",
  },
  {
    labelKey: "nav.imageSearch",
    link: "/image-search",
  },
  {
    labelKey: "nav.support",
    link: "/support",
  },
] as const;

interface IProps {
  handleOpenSearch: () => void;
}

export default function TopNav({ handleOpenSearch }: IProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const { classes, cx, theme } = useStyles();
  const router = useRouter();
  const { t } = useI18n();

  const urlResolver = (url: string): boolean => {
    return router.pathname === url;
  };

  const buttonProps: ButtonProps = {
    variant: "subtle",
    size: "md",
  };

  const links = mockdata.map((item) => (
    <Button
      className={urlResolver(item.link) ? classes.activeLink : classes.link}
      key={item.link}
      component={Link}
      href={item.link}
      {...buttonProps}
    >
      {t(item.labelKey)}
    </Button>
  ));

  return (
    <Box>
      <Header height="100%" px="md" className={classes.header}>
        <Group position="apart" sx={{ height: "100%" }}>
          <UnstyledButton
            component={Link}
            href="/"
            className={classes.brandButton}
            aria-label={t("common.brand")}
          >
            <Image
              src="/eastwood-logo.png"
              alt={t("common.brand")}
              className={classes.brandLogo}
              fit="contain"
            />
          </UnstyledButton>

          <Group
            sx={{ height: "100%" }}
            spacing="xs"
            className={classes.hiddenTablet}
          >
            {links}
            <Button
              className={classes.link}
              key="search button"
              leftIcon={<IconSearch size={18} />}
              onClick={handleOpenSearch}
              {...buttonProps}
            >
              {t("nav.search")}
            </Button>
            <Button size="md" component={Link} href="/donation">
              {t("nav.donate")}
            </Button>
          </Group>

          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            className={classes.hiddenDesktop}
            title={t("nav.openMenu")}
          />
        </Group>
      </Header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title={t("common.brand")}
        className={classes.hiddenDesktop}
        zIndex={1000000}
      >
        <ScrollArea h={`calc(100vh - ${rem(60)})`} mx="-md">
          <Divider
            my="sm"
            color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
          />
          <Stack spacing="sm" px="sm" mb="sm">
            {links}
            <Button
              className={classes.link}
              key="search small button"
              leftIcon={<IconSearch size={18} />}
              onClick={() => {
                closeDrawer();
                handleOpenSearch();
              }}
              {...buttonProps}
            >
              {t("nav.search")}
            </Button>
            <Button size="md" component={Link} href="/donation">
              {t("nav.donate")}
            </Button>
          </Stack>
          <Divider
            my="sm"
            color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
          />{" "}
          <Stack align="center" spacing="sm" px="sm" mb="sm">
            <Button variant="subtle">{t("top.joinGive")}</Button>
            <Button variant="subtle">{t("top.shop")}</Button>
            <LanguagePicker />
          </Stack>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
