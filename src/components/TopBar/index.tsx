import {
  ActionIcon,
  Button,
  Container,
  createStyles,
  Group,
  Header,
  Indicator,
} from "@mantine/core";
import LanguagePicker from "@/components/LanguagePicker";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabase/client";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { IconInbox } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const useStyles = createStyles((theme) => ({
  inner: {
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: `${theme.spacing.xs} ${theme.spacing.xl}`,
    backgroundColor: "#0f1216",
    color: theme.colors.dark[0],
    borderBottom: `1px solid rgba(216, 183, 109, 0.18)`,
  },
}));

export default function TopBar() {
  const { classes } = useStyles();
  const { t } = useI18n();
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleInquiryClick = () => {
    if (!loading && !user) {
      notifications.show({
        title: t("inquiry.loginRequiredTitle"),
        message: t("inquiry.loginRequiredMessage"),
        color: "yellow",
      });
      void router.push("/inquiries?authRequired=1");
      return;
    }

    if (isAdmin) {
      notifications.show({
        title: t("inquiry.adminBlockedTitle"),
        message: t("inquiry.adminBlockedMessage"),
        color: "yellow",
      });
      void router.push("/inbox");
      return;
    }

    void router.push("/inquiries");
  };

  const handleInboxClick = () => {
    if (!loading && !user) {
      notifications.show({
        title: t("inbox.loginRequiredTitle"),
        message: t("inbox.loginRequiredMessage"),
        color: "yellow",
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

    if (!loading) {
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
  }, [loading, user, router.asPath]);

  return (
    <Header height="100%" sx={{ borderBottom: 0 }}>
      <Container className={classes.inner} fluid>
        <Group spacing="xs" noWrap>
          <Indicator
            inline
            size={18}
            offset={4}
            color="red"
            disabled={!unreadCount}
            label={unreadCount > 99 ? "99+" : unreadCount}
          >
            <ActionIcon
              size="lg"
              variant="light"
              color="yellow"
              onClick={handleInboxClick}
              aria-label={t("inbox.pageTitle")}
            >
              <IconInbox size={16} />
            </ActionIcon>
          </Indicator>
          <Button
            size="xs"
            variant="light"
            color="yellow"
            onClick={handleInquiryClick}
          >
            {t("inquiry.entryButton")}
          </Button>
          <LanguagePicker />
        </Group>
      </Container>
    </Header>
  );
}
