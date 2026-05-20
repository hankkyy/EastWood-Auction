import {
  Button,
  Container,
  createStyles,
  Header,
  Group,
} from "@mantine/core";
import LanguagePicker from "@/components/LanguagePicker";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { IconInbox } from "@tabler/icons-react";

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

    [theme.fn.smallerThan("sm")]: {
      justifyContent: "center",
    },
  },
}));

export default function TopBar() {
  const { classes } = useStyles();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const router = useRouter();

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

    void router.push("/inquiries");
  };

  return (
    <Header height="100%" sx={{ borderBottom: 0 }}>
      <Container className={classes.inner} fluid>
        <Group spacing="xs" noWrap>
          <Button
            size="xs"
            variant="light"
            color="yellow"
            onClick={handleInquiryClick}
            leftIcon={<IconInbox size={14} />}
          >
            {t("inquiry.entryButton")}
          </Button>
          <LanguagePicker />
        </Group>
      </Container>
    </Header>
  );
}
