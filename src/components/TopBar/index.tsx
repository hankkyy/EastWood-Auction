import {
  Button,
  Container,
  createStyles,
  Group,
  Header,
  Indicator,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import LanguagePicker from "@/components/LanguagePicker";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabase/client";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { IconInbox, IconMessageCircle, IconSun, IconMoon } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useMantineColorScheme, ActionIcon } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  inner: {
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: `${theme.spacing.xs} ${theme.spacing.xl}`,
    backgroundColor: "transparent",
    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
    borderBottom: "none",

    [theme.fn.smallerThan("sm")]: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    },
  },

  actionGroup: {
    gap: theme.spacing.xs,

    [theme.fn.smallerThan("sm")]: {
      width: "100%",
      justifyContent: "space-between",
    },
  },
}));

export default function TopBar() {
  const { classes } = useStyles();
  const { t, locale } = useI18n();
  const { user, loading, roleLoading, isAdmin } = useAuth();
  const authReady = !loading && !roleLoading;
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useMediaQuery("(max-width: 600px)");

  const handleInquiryClick = () => {
    if (!authReady) {
      return;
    }

    if (!user) {
      void router.push("/inquiries?authRequired=1");
      return;
    }

    if (isAdmin) {
      notifications.show({
        title: t("inquiry.adminBlockedTitle"),
        message: t("inquiry.adminBlockedMessage"),
        color: "#c4a255",
      });
      void router.push("/inbox");
      return;
    }

    void router.push("/inquiries");
  };

  const handleInboxClick = () => {
    if (!authReady) {
      return;
    }

    if (!user) {
      notifications.show({
        title: t("inbox.loginRequiredTitle"),
        message: t("inbox.loginRequiredMessage"),
      });
      void router.push("/inbox");
      return;
    }

    void router.push("/inbox");
  };

  useEffect(() => {
    const loadInboxCount = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setUnreadCount(0);
          return;
        }

        const response = await fetch("/api/inquiries?countOnly=1", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await response.json()) as {
          unreadCount?: number;
        };

        if (!response.ok) {
          setUnreadCount(0);
          return;
        }

        setUnreadCount(payload.unreadCount ?? 0);
      } catch {
        setUnreadCount(0);
      }
    };

    if (authReady) {
      void loadInboxCount();
    }

    const handleRefresh = () => {
      void loadInboxCount();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("inquiries:changed", handleRefresh as EventListener);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("inquiries:changed", handleRefresh as EventListener);
    };
  }, [authReady, user, router.asPath]);

  return (
    <Header height="100%" sx={(theme) => ({ borderBottom: `1px solid ${theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.15)" : "rgba(0, 0, 0, 0.08)"}`, backgroundColor: "transparent" })}>
      <Container className={classes.inner} fluid>
        <Group className={classes.actionGroup} noWrap>
          <Indicator
            inline
            size={isMobile ? 16 : 18}
            offset={4}
            color="red"
            disabled={!unreadCount}
            label={unreadCount > 99 ? "99+" : unreadCount}
          >
            <Button
              size={isMobile ? "sm" : "xs"}
              variant={isMobile ? "subtle" : "light"}
              color={isMobile ? "gray" : "yellow"}
              onClick={handleInboxClick}
              leftIcon={isMobile ? undefined : <IconInbox size={16} />}
              styles={{
                root: {
                  minWidth: isMobile ? 0 : undefined,
                  flex: isMobile ? 1 : undefined,
                  paddingLeft: isMobile ? 12 : undefined,
                  paddingRight: isMobile ? 12 : undefined,
                  fontSize: isMobile ? 13 : undefined,
                },
              }}
            >
              {t("inbox.pageTitle")}
            </Button>
          </Indicator>
          <Button
            size={isMobile ? "sm" : "xs"}
            variant={isMobile ? "subtle" : "light"}
            color="yellow"
            onClick={handleInquiryClick}
            leftIcon={isMobile ? undefined : <IconMessageCircle size={16} />}
            styles={{
              root: {
                minWidth: isMobile ? 0 : undefined,
                flex: isMobile ? 1 : undefined,
                paddingLeft: isMobile ? 12 : undefined,
                paddingRight: isMobile ? 12 : undefined,
                fontSize: isMobile ? 13 : undefined,
              },
            }}
          >
            {t("inquiry.entryButton")}
          </Button>
          <ThemeToggle />
          <LanguagePicker />
        </Group>
      </Container>
    </Header>
  );
}

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <ActionIcon
      variant="light"
      color={isDark ? "yellow" : "gray"}
      onClick={() => toggleColorScheme()}
      title={isDark ? "Switch to light" : "Switch to dark"}
      size="lg"
    >
      {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </ActionIcon>
  );
}
