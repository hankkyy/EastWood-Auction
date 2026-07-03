import { Box, createStyles, Flex, rem, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  IconHome,
  IconSearch,
  IconShoppingCart,
  IconBriefcase,
  IconMessageCircle,
} from "@tabler/icons-react";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor:
      theme.colorScheme === "dark"
        ? "rgba(26, 24, 21, 0.95)"
        : "rgba(251, 248, 242, 0.95)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderTop: `1px solid ${
      theme.colorScheme === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.06)"
    }`,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${rem(4)})`,
  },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rem(2),
    padding: `${rem(6)} ${rem(4)}`,
    minWidth: 0,
    flex: 1,
    borderRadius: rem(8),
    textDecoration: "none",
    color:
      theme.colorScheme === "dark"
        ? "rgba(255,255,255,0.45)"
        : "rgba(0,0,0,0.4)",
    transition: "color 180ms ease, background-color 180ms ease",
    cursor: "pointer",
    minHeight: rem(56),

    "&:active": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? "rgba(196,162,85,0.1)"
          : "rgba(196,162,85,0.06)",
    },
  },
  activeTab: {
    color: "#c4a255",
    backgroundColor:
      theme.colorScheme === "dark"
        ? "rgba(196,162,85,0.12)"
        : "rgba(196,162,85,0.08)",
  },
  icon: {
    width: rem(22),
    height: rem(22),
    flexShrink: 0,
  },
  label: {
    fontSize: rem(10),
    fontWeight: 500,
    lineHeight: 1.2,
    textAlign: "center",
    whiteSpace: "nowrap",
  },
}));

const tabs = [
  { href: "/", icon: IconHome, labelKey: "bottomNav.home" },
  { href: "/collections", icon: IconBriefcase, labelKey: "bottomNav.collections" },
  { href: "/search", icon: IconSearch, labelKey: "bottomNav.search" },
  { href: "/shop", icon: IconShoppingCart, labelKey: "bottomNav.shop" },
  { href: "/inbox", icon: IconMessageCircle, labelKey: "bottomNav.inbox" },
] as const;

export default function BottomNav() {
  const { classes, cx } = useStyles();
  const router = useRouter();
  const { t } = useI18n();
  const showBottomNav = useMediaQuery("(max-width: 768px)");

  if (!showBottomNav) return null;

  return (
    <Box component="nav" className={classes.nav} aria-label="Mobile navigation">
      <Flex>
        {tabs.map(({ href, icon: Icon, labelKey }) => {
          const isActive =
            router.pathname === href ||
            (href !== "/" && router.pathname.startsWith(href));

          return (
            <Box
              key={href}
              component={Link}
              href={href}
              className={cx(classes.tab, isActive && classes.activeTab)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={classes.icon} />
              <Text className={classes.label}>{t(labelKey)}</Text>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
