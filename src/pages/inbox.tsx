import Head from "next/head";
import Link from "next/link";
import { Wrapper } from "@/layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase/client";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconInbox, IconSend } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";

type InquiryMessage = {
  id: string;
  inquiry_id: string;
  sender_user_id: string;
  sender_role: "admin" | "user";
  body: string;
  is_read: boolean;
  created_at: string;
};

type InquiryRecord = {
  id: string;
  user_id: string;
  inquiry_code: string | null;
  no_inquiry_code: boolean;
  is_processed: boolean;
  details: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  messages: InquiryMessage[];
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user_id: string | null;
    email: string | null;
  } | null;
};

export default function InboxPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, loading, isAdmin } = useAuth();
  const [authModalOpened, setAuthModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    id: string;
    nextProcessed: boolean;
  } | null>(null);

  const markMessagesRead = useCallback(async (inquiryIds: string[]) => {
    if (!inquiryIds.length) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    await fetch("/api/inquiry-messages", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ inquiryIds }),
    });

    setInquiries((prev) =>
      prev.map((inquiry) => ({
        ...inquiry,
        messages: inquiry.messages.map((message) =>
          message.sender_role !== (isAdmin ? "admin" : "user")
            ? { ...message, is_read: true }
            : message
        ),
      }))
    );
    setUnreadCount(0);
    window.dispatchEvent(new Event("inquiries:changed"));
  }, [isAdmin]);

  useEffect(() => {
    const loadInbox = async () => {
      if (!user) {
        setInquiries([]);
        setPendingCount(0);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(t("inbox.loginRequiredMessage"));
        }

        const response = await fetch("/api/inquiries", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await response.json()) as {
          inquiries?: InquiryRecord[];
          pendingCount?: number;
          unreadCount?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load inbox.");
        }

        const nextInquiries = payload.inquiries ?? [];
        setInquiries(nextInquiries);
        setPendingCount(payload.pendingCount ?? 0);
        setUnreadCount(payload.unreadCount ?? 0);

        const unreadInquiryIds = nextInquiries
          .filter((inquiry) =>
            inquiry.messages.some(
              (message) => !message.is_read && message.sender_role !== (isAdmin ? "admin" : "user")
            )
          )
          .map((inquiry) => inquiry.id);

        if (unreadInquiryIds.length) {
          void markMessagesRead(unreadInquiryIds);
        }
      } catch (err: any) {
        setError(err.message || t("inbox.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      void loadInbox();
    }
  }, [loading, user, t, isAdmin, markMessagesRead]);

  const processedCount = useMemo(
    () => inquiries.filter((item) => item.is_processed).length,
    [inquiries]
  );
  const pendingInquiries = useMemo(
    () => inquiries.filter((item) => !item.is_processed),
    [inquiries]
  );
  const processedInquiries = useMemo(
    () => inquiries.filter((item) => item.is_processed),
    [inquiries]
  );

  const formatInquiryOwner = (inquiry: InquiryRecord) => {
    const profile = inquiry.profiles;
    if (!profile) {
      return locale === "zh" ? "我的咨询" : "My inquiry";
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    return fullName || profile.user_id || profile.email || (locale === "zh" ? "未知用户" : "Unknown user");
  };

  const formatInquiryOwnerMeta = (inquiry: InquiryRecord) => {
    const profile = inquiry.profiles;
    if (!profile) {
      return [
        {
          label: locale === "zh" ? "邮箱" : "Email",
          value: inquiry.contact_email,
        },
      ];
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;

    return [
      {
        label: locale === "zh" ? "用户姓名" : "Full name",
        value: fullName,
      },
      {
        label: locale === "zh" ? "邮箱" : "Email",
        value: profile.email || inquiry.contact_email || null,
      },
      {
        label: locale === "zh" ? "用户ID" : "User ID",
        value: profile.user_id || null,
      },
    ].filter((item) => item.value);
  };

  const formatInquiryTitle = (inquiry: InquiryRecord) => {
    if (inquiry.no_inquiry_code) {
      return locale === "zh" ? "无编号咨询" : "Inquiry without code";
    }

    return locale === "zh"
      ? `咨询藏品或回流案例编号：${inquiry.inquiry_code}`
      : `Inquiry code: ${inquiry.inquiry_code}`;
  };

  const formatInquiryTime = (value: string) =>
    new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");

  const getMessageLabel = (message: InquiryMessage) => {
    if (message.sender_role === "admin") {
      return locale === "zh" ? "管理员" : "Admin";
    }

    if (isAdmin) {
      const inquiry = inquiries.find((item) => item.id === message.inquiry_id);
      return inquiry
        ? formatInquiryOwner(inquiry)
        : (locale === "zh" ? "用户" : "Customer");
    }

    return locale === "zh" ? "我" : "You";
  };

  const handleReplyChange = (inquiryId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [inquiryId]: value,
    }));
  };

  const handleReplySubmit = async (inquiryId: string) => {
    const body = replyDrafts[inquiryId]?.trim() ?? "";
    if (!body) {
      notifications.show({
        title: t("inbox.replyFailedTitle"),
        message: t("inbox.replyRequiredError"),
        color: "red",
      });
      return;
    }

    try {
      setReplyingId(inquiryId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(t("inbox.loginRequiredMessage"));
      }

      const response = await fetch("/api/inquiry-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inquiryId, body }),
      });

      const payload = (await response.json()) as {
        message?: InquiryMessage;
        error?: string;
      };

      if (!response.ok || !payload.message) {
        throw new Error(payload.error || t("inbox.replyFailedFallback"));
      }

      setInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === inquiryId
            ? {
                ...inquiry,
                is_processed: isAdmin,
                messages: [...inquiry.messages, payload.message!],
              }
            : inquiry
        )
      );
      setReplyDrafts((prev) => ({
        ...prev,
        [inquiryId]: "",
      }));
      setPendingCount((prev) => {
        const currentInquiry = inquiries.find((item) => item.id === inquiryId);
        if (!currentInquiry) {
          return prev;
        }
        if (isAdmin && !currentInquiry.is_processed) {
          return Math.max(0, prev - 1);
        }
        if (!isAdmin && currentInquiry.is_processed) {
          return prev + 1;
        }
        return prev;
      });

      notifications.show({
        title: t("inbox.replySuccessTitle"),
        message: t("inbox.replySuccessMessage"),
        color: "green",
      });
      window.dispatchEvent(new Event("inquiries:changed"));
    } catch (err: any) {
      notifications.show({
        title: t("inbox.replyFailedTitle"),
        message: err.message || t("inbox.replyFailedFallback"),
        color: "red",
      });
    } finally {
      setReplyingId(null);
    }
  };

  const updateInquiryStatus = async (inquiryId: string, isProcessed: boolean) => {
    if (
      statusConfirmState?.id !== inquiryId ||
      statusConfirmState.nextProcessed !== isProcessed
    ) {
      setStatusConfirmState({ id: inquiryId, nextProcessed: isProcessed });
      return;
    }

    try {
      setStatusUpdatingId(inquiryId);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(t("inbox.loginRequiredMessage"));
      }

      const response = await fetch("/api/inquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: inquiryId,
          isProcessed,
        }),
      });

      const payload = (await response.json()) as {
        inquiry?: InquiryRecord;
        error?: string;
      };

      if (!response.ok || !payload.inquiry) {
        throw new Error(payload.error || t("inbox.statusUpdateFailed"));
      }

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === inquiryId
            ? {
                ...item,
                is_processed: payload.inquiry!.is_processed,
              }
            : item
        )
      );
      setPendingCount((prev) => {
        const currentInquiry = inquiries.find((item) => item.id === inquiryId);
        if (!currentInquiry || currentInquiry.is_processed === isProcessed) {
          return prev;
        }
        return isProcessed ? Math.max(0, prev - 1) : prev + 1;
      });
      setStatusConfirmState(null);
      window.dispatchEvent(new Event("inquiries:changed"));
    } catch (err: any) {
      notifications.show({
        title: t("inbox.statusUpdateFailedTitle"),
        message: err.message || t("inbox.statusUpdateFailed"),
        color: "red",
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const renderStatusAction = (inquiry: InquiryRecord) => {
    if (!isAdmin) {
      return null;
    }

    const isUpdating = statusUpdatingId === inquiry.id;
    const pendingState =
      statusConfirmState?.id === inquiry.id ? statusConfirmState.nextProcessed : null;

    if (pendingState !== null) {
      return (
        <Group position="right">
          <Button
            size="xs"
            color={pendingState ? "teal" : "gray"}
            variant="filled"
            loading={isUpdating}
            disabled={isUpdating}
            onClick={() => void updateInquiryStatus(inquiry.id, pendingState)}
          >
            {pendingState ? t("inbox.confirmProcessed") : t("inbox.confirmPending")}
          </Button>
          <Button
            size="xs"
            color="gray"
            variant="light"
            disabled={isUpdating}
            onClick={() => setStatusConfirmState(null)}
          >
            {locale === "zh" ? "取消" : "Cancel"}
          </Button>
        </Group>
      );
    }

    return (
      <Group position="right">
        <Button
          size="xs"
          color={inquiry.is_processed ? "gray" : "teal"}
          variant={inquiry.is_processed ? "light" : "filled"}
          loading={isUpdating}
          disabled={isUpdating}
          onClick={() => void updateInquiryStatus(inquiry.id, !inquiry.is_processed)}
          sx={
            inquiry.is_processed
              ? {
                  backgroundColor: "rgba(255, 224, 102, 0.28)",
                  color: "#fff3bf",
                  border: "1px solid rgba(255, 224, 102, 0.48)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 224, 102, 0.4)",
                  },
                }
              : undefined
          }
        >
          {inquiry.is_processed ? t("inbox.markPending") : t("inbox.markProcessed")}
        </Button>
      </Group>
    );
  };

  const renderInquiryCard = (inquiry: InquiryRecord) => (
    <Paper
      key={inquiry.id}
      p="md"
      withBorder
      radius="md"
      sx={{
        borderColor: inquiry.is_processed
          ? "rgba(32, 201, 151, 0.35)"
          : "rgba(216, 183, 109, 0.28)",
        backgroundColor: inquiry.is_processed
          ? "rgba(32, 201, 151, 0.04)"
          : "rgba(255, 255, 255, 0.02)",
        boxShadow: inquiry.is_processed
          ? "0 10px 24px rgba(32, 201, 151, 0.08)"
          : "0 10px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      <Stack spacing="md">
        <Group position="apart" align="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Group spacing="xs" mb={6} align="center">
              <Text weight={800} size="lg">
                {formatInquiryTitle(inquiry)}
              </Text>
              <Badge color={inquiry.is_processed ? "teal" : "yellow"} variant="light">
                {inquiry.is_processed ? t("inbox.statusProcessed") : t("inbox.statusPending")}
              </Badge>
            </Group>
            {isAdmin ? (
              <Stack spacing={2} mb={8}>
                <Stack spacing={2}>
                  {formatInquiryOwnerMeta(inquiry).map((item) => (
                    <Text key={item.label} size="sm" color="dimmed" sx={{ wordBreak: "break-word" }}>
                      <Text component="span" weight={600} color="gray.3">
                        {item.label}
                        {locale === "zh" ? "：" : ": "}
                      </Text>
                      {item.value}
                    </Text>
                  ))}
                </Stack>
              </Stack>
            ) : null}
            <Text size="sm" color="dimmed">
              {t("inbox.submittedAt")}
              {formatInquiryTime(inquiry.created_at)}
            </Text>
            <Text size="sm" sx={{ wordBreak: "break-word" }} mt={6}>
              {t("inbox.contactPhone")}
              {inquiry.contact_phone}
            </Text>
            <Text size="sm" sx={{ wordBreak: "break-word" }}>
              {t("inbox.contactEmail")}
              {inquiry.contact_email}
            </Text>
          </Box>
        </Group>

        {renderStatusAction(inquiry)}

        <Divider />

        <Stack spacing="sm">
          <Text size="sm" weight={700}>
            {t("inbox.threadTitle")}
          </Text>
          {inquiry.messages.map((message) => {
            const isOwnMessage = message.sender_role === (isAdmin ? "admin" : "user");
            return (
              <Paper
                key={message.id}
                p="sm"
                radius="md"
                sx={{
                  marginLeft: isOwnMessage ? "auto" : 0,
                  maxWidth: "88%",
                  backgroundColor: isOwnMessage
                    ? isAdmin
                      ? "rgba(64, 192, 87, 0.16)"
                      : "rgba(59, 130, 246, 0.18)"
                    : isAdmin
                      ? "rgba(245, 159, 0, 0.14)"
                      : "rgba(129, 140, 248, 0.14)",
                  border: `1px solid ${
                    isOwnMessage
                      ? isAdmin
                        ? "rgba(64, 192, 87, 0.35)"
                        : "rgba(59, 130, 246, 0.32)"
                      : isAdmin
                        ? "rgba(245, 159, 0, 0.28)"
                        : "rgba(129, 140, 248, 0.28)"
                  }`,
                }}
              >
                <Stack spacing={6}>
                  <Group position="apart" spacing="xs" noWrap>
                    <Group spacing="xs" noWrap>
                      <Text size="sm" weight={600}>
                        {getMessageLabel(message)}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          message.sender_role === "admin"
                            ? "green"
                            : isAdmin
                              ? "orange"
                              : "blue"
                        }
                      >
                        {message.sender_role === "admin"
                          ? locale === "zh"
                            ? "管理员消息"
                            : "Admin message"
                          : locale === "zh"
                            ? "用户消息"
                            : "Customer message"}
                      </Badge>
                      {!message.is_read && !isOwnMessage ? (
                        <Badge color="red" size="xs" variant="filled">
                          {locale === "zh" ? "新" : "New"}
                        </Badge>
                      ) : null}
                    </Group>
                    <Text size="xs" color="dimmed">
                      {formatInquiryTime(message.created_at)}
                    </Text>
                  </Group>
                  <Text
                    size="sm"
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.7,
                    }}
                  >
                    {message.body}
                  </Text>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Stack spacing="xs">
          <Text size="sm" weight={600}>
            {isAdmin ? t("inbox.replyBoxAdmin") : t("inbox.replyBoxUser")}
          </Text>
          <Textarea
            minRows={3}
            autosize
            value={replyDrafts[inquiry.id] ?? ""}
            onChange={(event) => handleReplyChange(inquiry.id, event.currentTarget.value)}
            placeholder={t("inbox.replyPlaceholder")}
          />
          <Group position="right">
            <Button
              leftIcon={<IconSend size={16} />}
              onClick={() => void handleReplySubmit(inquiry.id)}
              loading={replyingId === inquiry.id}
            >
              {t("inbox.sendReply")}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );

  return (
    <>
      <Head>
        <title>{t("inbox.pageTitle")} - Eastwood Auction</title>
      </Head>
      <Wrapper>
        <Container size="md" py={48}>
          <Stack spacing="xl">
            <Group position="apart" align="flex-start">
              <div>
                <Title order={1}>{t("inbox.pageTitle")}</Title>
                <Text color="dimmed" mt="sm" sx={{ whiteSpace: "pre-line" }}>
                  {isAdmin ? t("inbox.adminDescription") : t("inbox.pageDescription")}
                </Text>
              </div>
              {user ? (
                <Group spacing="xs">
                  <Badge color="red" variant="light" size="lg">
                    {locale === "zh" ? `未读 ${unreadCount}` : `Unread ${unreadCount}`}
                  </Badge>
                  {isAdmin ? (
                    <>
                      <Badge color="yellow" variant="light" size="lg">
                        {locale === "zh" ? `未处理 ${pendingCount}` : `Pending ${pendingCount}`}
                      </Badge>
                      <Badge color="teal" variant="light" size="lg">
                        {locale === "zh" ? `已处理 ${processedCount}` : `Processed ${processedCount}`}
                      </Badge>
                    </>
                  ) : null}
                </Group>
              ) : null}
            </Group>

            {!loading && !user ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title={t("inbox.loginRequiredTitle")}>
                <Stack spacing="sm">
                  <Text>{t("inbox.loginRequiredMessage")}</Text>
                  <Group>
                    <Button onClick={() => setAuthModalOpened(true)}>
                      {t("auth.loginRegister")}
                    </Button>
                    <Button variant="light" component={Link} href="/inquiries">
                      {t("inquiry.entryButton")}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : null}

            {isLoading ? (
              <Group position="center" py="xl">
                <Loader color="yellow" />
              </Group>
            ) : error ? (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title={t("inbox.loadFailedTitle")}>
                {error}
              </Alert>
            ) : inquiries.length === 0 ? (
              <Paper withBorder radius="md" p="xl">
                <Stack spacing="sm" align="center">
                  <IconInbox size={28} />
                  <Text weight={600}>{t("inbox.emptyTitle")}</Text>
                  <Text color="dimmed" align="center">
                    {t("inbox.emptyDescription")}
                  </Text>
                  <Button component={Link} href="/inquiries">
                    {t("inquiry.entryButton")}
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <Stack spacing="lg">
                {isAdmin ? (
                  <>
                    <Paper
                      p="md"
                      withBorder
                      radius="md"
                      sx={{
                        borderColor: "rgba(216, 183, 109, 0.45)",
                        backgroundColor: "rgba(216, 183, 109, 0.06)",
                      }}
                    >
                      <Group position="apart" mb={4}>
                        <Text weight={800} color="yellow">
                          {locale === "zh" ? "待处理会话" : "Pending conversations"}
                        </Text>
                        <Badge color="yellow" variant="light">
                          {pendingInquiries.length}
                        </Badge>
                      </Group>
                      <Text size="sm" color="dimmed" mb="md">
                        {locale === "zh"
                          ? "这里集中显示需要继续跟进的用户咨询，回复和状态标记都在这里完成。"
                          : "Use this section for active customer follow-up. Replying and status updates both happen here."}
                      </Text>
                      <Stack spacing="md">
                        {pendingInquiries.length ? (
                          pendingInquiries.map(renderInquiryCard)
                        ) : (
                          <Text color="dimmed">
                            {locale === "zh" ? "当前没有待处理会话。" : "No pending conversations right now."}
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    <Divider
                      label={locale === "zh" ? "已处理归档" : "Processed archive"}
                      labelPosition="center"
                    />

                    <Paper
                      p="md"
                      withBorder
                      radius="md"
                      sx={{
                        borderColor: "rgba(32, 201, 151, 0.4)",
                        backgroundColor: "rgba(32, 201, 151, 0.05)",
                      }}
                    >
                      <Group position="apart" mb={4}>
                        <Text weight={800} color="teal">
                          {locale === "zh" ? "已处理会话" : "Processed conversations"}
                        </Text>
                        <Badge color="teal" variant="light">
                          {processedInquiries.length}
                        </Badge>
                      </Group>
                      <Text size="sm" color="dimmed" mb="md">
                        {locale === "zh"
                          ? "已经完成跟进的会话会收进这里，如需继续处理可重新标记为未处理。"
                          : "Completed conversations are archived here. Reopen them anytime by marking them as pending again."}
                      </Text>
                      <Stack spacing="lg">
                        {processedInquiries.length ? (
                          processedInquiries.map((inquiry, index) => (
                            <Stack key={inquiry.id} spacing="lg">
                              {index > 0 ? (
                                <Divider
                                  label={locale === "zh" ? "已处理会话分隔" : "Conversation break"}
                                  labelPosition="center"
                                  color="rgba(32, 201, 151, 0.28)"
                                />
                              ) : null}
                              {renderInquiryCard(inquiry)}
                            </Stack>
                          ))
                        ) : (
                          <Text color="dimmed">
                            {locale === "zh" ? "当前没有已处理会话。" : "No processed conversations yet."}
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  </>
                ) : (
                  <Stack spacing="md">
                    {inquiries.map(renderInquiryCard)}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Container>
      </Wrapper>
      <AuthModal opened={authModalOpened} onClose={() => setAuthModalOpened(false)} />
    </>
  );
}
