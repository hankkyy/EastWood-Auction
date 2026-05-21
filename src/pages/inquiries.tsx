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
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function InquiriesPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, loading, isAdmin } = useAuth();
  const [authModalOpened, setAuthModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inquiryCode, setInquiryCode] = useState("");
  const [noInquiryCode, setNoInquiryCode] = useState(false);
  const [details, setDetails] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const returnTo =
    typeof router.query.returnTo === "string" && router.query.returnTo.startsWith("/")
      ? router.query.returnTo
      : "/";

  useEffect(() => {
    if (!router.isReady || loading || user) {
      return;
    }

    if (router.query.authRequired === "1") {
      notifications.show({
        title: t("inquiry.loginRequiredTitle"),
        message: t("inquiry.loginRequiredMessage"),
        color: "yellow",
      });
      setAuthModalOpened(true);
    }
  }, [router.isReady, router.query.authRequired, loading, user, t]);

  useEffect(() => {
    if (!router.isReady || loading || !user || !isAdmin) {
      return;
    }

    notifications.show({
      title: t("inquiry.adminBlockedTitle"),
      message: t("inquiry.adminBlockedMessage"),
      color: "yellow",
    });
  }, [router.isReady, loading, user, isAdmin, t]);

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
        <Container size="sm" py={48}>
          <Stack spacing="xl">
            <div>
              <Title order={1}>{t("inquiry.pageTitle")}</Title>
              <Text color="dimmed" mt="sm">
                {t("inquiry.pageDescription")}
              </Text>
            </div>

            {!loading && !user ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title={t("inquiry.loginRequiredTitle")}>
                <Stack spacing="sm">
                  <Text>{t("inquiry.loginRequiredMessage")}</Text>
                  <Group>
                    <Button onClick={() => setAuthModalOpened(true)}>
                      {t("auth.loginRegister")}
                    </Button>
                    <Button
                      variant="filled"
                      color="yellow"
                      onClick={() => router.push("/")}
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

            {!loading && user && isAdmin ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title={t("inquiry.adminBlockedTitle")}>
                <Stack spacing="sm">
                  <Text>{t("inquiry.adminBlockedMessage")}</Text>
                  <Group>
                    <Button onClick={() => router.push("/inbox")}>
                      {t("inbox.pageTitle")}
                    </Button>
                    <Button
                      variant="filled"
                      color="yellow"
                      onClick={() => router.push("/")}
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
              sx={
                !user
                  ? {
                      backgroundColor: "rgba(246, 231, 176, 0.14)",
                      borderColor: "rgba(246, 231, 176, 0.3)",
                      "& .mantine-Input-input:disabled, & .mantine-Textarea-input:disabled": {
                        backgroundColor: "rgba(255, 248, 220, 0.78)",
                        borderColor: "rgba(246, 231, 176, 0.42)",
                        color: "#5b4820",
                        opacity: 1,
                        WebkitTextFillColor: "#5b4820",
                      },
                      "& .mantine-Input-input:disabled::placeholder, & .mantine-Textarea-input:disabled::placeholder": {
                        color: "rgba(91, 72, 32, 0.72)",
                      },
                      "& .mantine-Checkbox-input:disabled": {
                        backgroundColor: "rgba(255, 248, 220, 0.78)",
                        borderColor: "rgba(246, 231, 176, 0.5)",
                        opacity: 1,
                      },
                      "& .mantine-Checkbox-label": {
                        color: "#f3e7c8",
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
                    disabled={noInquiryCode || !user || isAdmin}
                    required={!noInquiryCode}
                  />
                  <Checkbox
                    checked={noInquiryCode}
                    onChange={(event) => setNoInquiryCode(event.currentTarget.checked)}
                    label={t("inquiry.noCodeLabel")}
                    disabled={!user || isAdmin}
                  />
                  <Textarea
                    label={t("inquiry.detailsLabel")}
                    placeholder={t("inquiry.detailsPlaceholder")}
                    minRows={6}
                    value={details}
                    onChange={(event) => setDetails(event.currentTarget.value)}
                    required
                    disabled={!user || isAdmin}
                  />
                  <TextInput
                    label={t("inquiry.phoneLabel")}
                    placeholder={t("inquiry.phonePlaceholder")}
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.currentTarget.value)}
                    required
                    disabled={!user || isAdmin}
                  />
                  <TextInput
                    label={t("inquiry.emailLabel")}
                    placeholder={t("inquiry.emailPlaceholder")}
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.currentTarget.value)}
                    required
                    type="email"
                    disabled={!user || isAdmin}
                  />
                  <Group position="right">
                    <Button
                      variant="filled"
                      color="yellow"
                      type="button"
                      onClick={() => router.push(returnTo)}
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
                    <Button type="submit" loading={submitting} disabled={!user || isAdmin}>
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
