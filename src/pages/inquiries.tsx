import Head from "next/head";
import { Wrapper } from "@/layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase/client";
import {
  Alert,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export default function InquiriesPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, loading, roleLoading, isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const authReady = !loading && !roleLoading;
  const [authModalOpened, setAuthModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inquiryCode, setInquiryCode] = useState("");
  const [noInquiryCode, setNoInquiryCode] = useState(false);
  const [details, setDetails] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const authNoticeShownRef = useRef(false);
  const adminNoticeShownRef = useRef(false);
  const returnTo =
    typeof router.query.returnTo === "string" && router.query.returnTo.startsWith("/")
      ? router.query.returnTo
      : "/";

  useEffect(() => {
    if (!router.isReady || !authReady || user) {
      return;
    }

    if (router.query.authRequired === "1") {
      if (authNoticeShownRef.current) {
        return;
      }
      authNoticeShownRef.current = true;
      notifications.show({
        title: t("inquiry.loginRequiredTitle"),
        message: t("inquiry.loginRequiredMessage"),
        color: "yellow",
      });
    }
  }, [router.isReady, router.query.authRequired, authReady, user, t]);

  useEffect(() => {
    if (!router.isReady || !authReady || !user || !isAdmin) {
      return;
    }

    if (adminNoticeShownRef.current) {
      return;
    }
    adminNoticeShownRef.current = true;

    notifications.show({
      title: t("inquiry.adminBlockedTitle"),
      message: t("inquiry.adminBlockedMessage"),
      color: "yellow",
    });
  }, [router.isReady, authReady, user, isAdmin, t]);

  useEffect(() => {
    if (router.query.authRequired !== "1") {
      authNoticeShownRef.current = false;
    }
    if (!user || !isAdmin) {
      adminNoticeShownRef.current = false;
    }
  }, [router.query.authRequired, user, isAdmin]);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    setContactEmail((prev) => prev || user.email || "");
  }, [user?.email]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const prefilledCode = typeof router.query.code === "string" ? router.query.code.trim() : "";
    if (!prefilledCode) {
      return;
    }

    setInquiryCode(prefilledCode);
    setNoInquiryCode(false);
  }, [router.isReady, router.query.code]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authReady) {
      return;
    }

    if (!user) {
      notifications.show({
        title: t("inquiry.loginRequiredTitle"),
        message: t("inquiry.loginRequiredMessage"),
        color: "yellow",
      });
      setAuthModalOpened(true);
      return;
    }

    if (isAdmin) {
      notifications.show({
        title: t("inquiry.adminBlockedTitle"),
        message: t("inquiry.adminBlockedMessage"),
        color: "yellow",
      });
      return;
    }

    if (!noInquiryCode && !inquiryCode.trim()) {
      notifications.show({
        title: t("inquiry.submitFailedTitle"),
        message: t("inquiry.codeRequiredError"),
        color: "red",
      });
      return;
    }

    if (!details.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      notifications.show({
        title: t("inquiry.submitFailedTitle"),
        message: t("inquiry.requiredFieldsError"),
        color: "red",
      });
      return;
    }

    try {
      setSubmitting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(t("inquiry.loginRequiredMessage"));
      }

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          inquiryCode,
          noInquiryCode,
          details,
          contactPhone,
          contactEmail,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit inquiry.");
      }

      notifications.show({
        title: t("inquiry.submitSuccessTitle"),
        message: t("inquiry.submitSuccessMessage"),
        color: "green",
        icon: <IconCircleCheck size={16} />,
      });

      window.dispatchEvent(new Event("inquiries:changed"));

      setInquiryCode("");
      setNoInquiryCode(false);
      setDetails("");
      setContactPhone("");
      setContactEmail(user.email || "");
      await router.push("/inbox");
    } catch (error: any) {
      notifications.show({
        title: t("inquiry.submitFailedTitle"),
        message: error.message || t("inquiry.submitFailedFallback"),
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t("inquiry.pageTitle")} - Eastwood Auction</title>
      </Head>
      <Wrapper>
        <Container size="sm" py={48} px={isMobile ? 14 : undefined}>
          <Stack spacing="xl">
            <div>
              <Title order={1}>{t("inquiry.pageTitle")}</Title>
              <Text color="dimmed" mt="sm">
                {t("inquiry.pageDescription")}
              </Text>
            </div>

            {authReady && !user ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title={t("inquiry.loginRequiredTitle")}>
                <Stack spacing="sm">
                  <Text>{t("inquiry.loginRequiredMessage")}</Text>
                  <Group
                    noWrap={!isMobile}
                    sx={{
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                    }}
                  >
                    <Button onClick={() => setAuthModalOpened(true)} fullWidth={isMobile}>
                      {t("auth.loginRegister")}
                    </Button>
                    <Button
                      variant="filled"
                      color="yellow"
                      onClick={() => router.push("/")}
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: "#f6e7b0",
                        color: "#4f3b12",
                        "&:hover": {
                          backgroundColor: "#f2dc8f",
                        },
                      }}
                    >
                      {locale === "zh" ? "返回首页" : "Back Home"}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : null}

            {authReady && user && isAdmin ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title={t("inquiry.adminBlockedTitle")}>
                <Stack spacing="sm">
                  <Text>{t("inquiry.adminBlockedMessage")}</Text>
                  <Group
                    noWrap={!isMobile}
                    sx={{
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                    }}
                  >
                    <Button onClick={() => router.push("/inbox")} fullWidth={isMobile}>
                      {t("inbox.pageTitle")}
                    </Button>
                    <Button
                      variant="filled"
                      color="yellow"
                      onClick={() => router.push("/")}
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: "#f6e7b0",
                        color: "#4f3b12",
                        "&:hover": {
                          backgroundColor: "#f2dc8f",
                        },
                      }}
                    >
                      {locale === "zh" ? "返回首页" : "Back Home"}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : null}

            <Paper
              withBorder
              radius="md"
              p="lg"
              sx={(theme) =>
                !user
                  ? {
                      background:
                        theme.colorScheme === "dark"
                          ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
                          : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
                      borderColor:
                        theme.colorScheme === "dark"
                          ? "rgba(196, 162, 85, 0.14)"
                          : "rgba(180, 158, 120, 0.18)",
                      "& .mantine-Input-input:disabled, & .mantine-Textarea-input:disabled": {
                        backgroundColor:
                          theme.colorScheme === "dark"
                            ? "rgba(26, 24, 21, 0.7)"
                            : "rgba(245, 240, 233, 0.6)",
                        borderColor:
                          theme.colorScheme === "dark"
                            ? "rgba(196, 162, 85, 0.22)"
                            : "rgba(180, 158, 120, 0.22)",
                        color:
                          theme.colorScheme === "dark"
                            ? theme.colors.dark[9]
                            : theme.colors.dark[0],
                        opacity: 1,
                        WebkitTextFillColor:
                          theme.colorScheme === "dark"
                            ? theme.colors.dark[9]
                            : theme.colors.dark[0],
                      },
                      "& .mantine-Input-input:disabled::placeholder, & .mantine-Textarea-input:disabled::placeholder": {
                        color:
                          theme.colorScheme === "dark"
                            ? theme.colors.dark[5]
                            : theme.colors.dark[4],
                      },
                      "& .mantine-Checkbox-input:disabled": {
                        backgroundColor:
                          theme.colorScheme === "dark"
                            ? "rgba(26, 24, 21, 0.7)"
                            : "rgba(245, 240, 233, 0.6)",
                        borderColor:
                          theme.colorScheme === "dark"
                            ? "rgba(196, 162, 85, 0.26)"
                            : "rgba(180, 158, 120, 0.26)",
                        opacity: 1,
                      },
                      "& .mantine-Checkbox-label": {
                        color:
                          theme.colorScheme === "dark"
                            ? theme.colors.dark[9]
                            : theme.colors.dark[0],
                      },
                    }
                  : undefined
              }
            >
              <form onSubmit={handleSubmit}>
                <Stack spacing="md">
                  <TextInput
                    label={t("inquiry.codeLabel")}
                    placeholder={t("inquiry.codePlaceholder")}
                    value={inquiryCode}
                    onChange={(event) => setInquiryCode(event.currentTarget.value)}
                    disabled={!authReady || noInquiryCode || !user || isAdmin}
                    required={!noInquiryCode}
                  />
                  <Checkbox
                    checked={noInquiryCode}
                    onChange={(event) => setNoInquiryCode(event.currentTarget.checked)}
                    label={t("inquiry.noCodeLabel")}
                    disabled={!authReady || !user || isAdmin}
                  />
                  <Textarea
                    label={t("inquiry.detailsLabel")}
                    placeholder={t("inquiry.detailsPlaceholder")}
                    minRows={6}
                    value={details}
                    onChange={(event) => setDetails(event.currentTarget.value)}
                    required
                    disabled={!authReady || !user || isAdmin}
                  />
                  <TextInput
                    label={t("inquiry.phoneLabel")}
                    placeholder={t("inquiry.phonePlaceholder")}
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.currentTarget.value)}
                    required
                    disabled={!authReady || !user || isAdmin}
                  />
                  <TextInput
                    label={t("inquiry.emailLabel")}
                    placeholder={t("inquiry.emailPlaceholder")}
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.currentTarget.value)}
                    required
                    type="email"
                    disabled={!authReady || !user || isAdmin}
                  />
                  <Group
                    position="right"
                    noWrap={!isMobile}
                    sx={{
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                    }}
                  >
                    <Button
                      variant="filled"
                      color="yellow"
                      type="button"
                      onClick={() => router.push(returnTo)}
                      fullWidth={isMobile}
                      sx={{
                        backgroundColor: "#f6e7b0",
                        color: "#4f3b12",
                        "&:hover": {
                          backgroundColor: "#f2dc8f",
                        },
                      }}
                    >
                      {t("inquiry.cancelButton")}
                    </Button>
                    <Button
                      type="submit"
                      loading={submitting}
                      disabled={!authReady || !user || isAdmin}
                      fullWidth={isMobile}
                    >
                      {t("inquiry.submitButton")}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Stack>
        </Container>
      </Wrapper>
      <AuthModal opened={authModalOpened} onClose={() => setAuthModalOpened(false)} />
    </>
  );
}
