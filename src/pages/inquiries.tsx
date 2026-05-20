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
  const { user, loading } = useAuth();
  const [authModalOpened, setAuthModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inquiryCode, setInquiryCode] = useState("");
  const [noInquiryCode, setNoInquiryCode] = useState(false);
  const [details, setDetails] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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
    if (!user?.email) {
      return;
    }

    setContactEmail((prev) => prev || user.email || "");
  }, [user?.email]);

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
                    <Button variant="light" onClick={() => router.push("/")}>
                      {locale === "zh" ? "返回首页" : "Back Home"}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : null}

            <Paper withBorder radius="md" p="lg">
              <form onSubmit={handleSubmit}>
                <Stack spacing="md">
                  <TextInput
                    label={t("inquiry.codeLabel")}
                    placeholder={t("inquiry.codePlaceholder")}
                    value={inquiryCode}
                    onChange={(event) => setInquiryCode(event.currentTarget.value)}
                    disabled={noInquiryCode || !user}
                    required={!noInquiryCode}
                  />
                  <Checkbox
                    checked={noInquiryCode}
                    onChange={(event) => setNoInquiryCode(event.currentTarget.checked)}
                    label={t("inquiry.noCodeLabel")}
                    disabled={!user}
                  />
                  <Textarea
                    label={t("inquiry.detailsLabel")}
                    placeholder={t("inquiry.detailsPlaceholder")}
                    minRows={6}
                    value={details}
                    onChange={(event) => setDetails(event.currentTarget.value)}
                    required
                    disabled={!user}
                  />
                  <TextInput
                    label={t("inquiry.phoneLabel")}
                    placeholder={t("inquiry.phonePlaceholder")}
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.currentTarget.value)}
                    required
                    disabled={!user}
                  />
                  <TextInput
                    label={t("inquiry.emailLabel")}
                    placeholder={t("inquiry.emailPlaceholder")}
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.currentTarget.value)}
                    required
                    type="email"
                    disabled={!user}
                  />
                  <Group position="right">
                    <Button type="submit" loading={submitting} disabled={!user}>
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
