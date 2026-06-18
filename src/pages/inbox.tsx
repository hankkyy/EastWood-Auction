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
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconInbox, IconSend } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { primaryActionButtonSx, secondaryActionButtonSx } from "@/components/artworkStyles";

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
  is_archived: boolean;
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
  const { t, locale } = useI18n();
  const { user, loading, roleLoading, isAdmin } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const roleResolved = !user || !roleLoading;
  const adminPreviewGridTemplate = "minmax(0, 1.35fr) minmax(0, 1.25fr) 84px 28px";
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
    update: {
      isProcessed?: boolean;
      isArchived?: boolean;
    };
    label: string;
  } | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      return;
    }

    setInquiries([]);
    setPendingCount(0);
    setUnreadCount(0);
    setReplyDrafts({});
    setReplyingId(null);
    setStatusUpdatingId(null);
    setStatusConfirmState(null);
    setSelectedInquiryId(null);
    setError(null);
  }, [user]);

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
        setSelectedInquiryId((current) =>
          current && nextInquiries.some((inquiry) => inquiry.id === current)
            ? current
            : nextInquiries[0]?.id ?? null
        );

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

    if (!loading && !roleLoading) {
      void loadInbox();
    }
  }, [loading, roleLoading, user, t, isAdmin, markMessagesRead]);

  const processedCount = useMemo(
    () => inquiries.filter((item) => item.is_processed && !item.is_archived).length,
    [inquiries]
  );
  const archivedCount = useMemo(
    () => inquiries.filter((item) => item.is_archived).length,
    [inquiries]
  );
  const pendingInquiries = useMemo(
    () => inquiries.filter((item) => !item.is_processed && !item.is_archived),
    [inquiries]
  );
  const processedInquiries = useMemo(
    () => inquiries.filter((item) => item.is_processed && !item.is_archived),
    [inquiries]
  );
  const archivedInquiries = useMemo(
    () => inquiries.filter((item) => item.is_archived),
    [inquiries]
  );
  const selectedInquiry = useMemo(
    () => inquiries.find((item) => item.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId]
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
      ? `咨询商品或回流案例编号：${inquiry.inquiry_code}`
      : `Inquiry code: ${inquiry.inquiry_code}`;
  };

  const formatInquiryTime = (value: string) =>
    new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");

  const formatInquiryPreviewOwner = (inquiry: InquiryRecord) => {
    const profile = inquiry.profiles;
    if (!profile) {
      return inquiry.contact_email || (locale === "zh" ? "未知用户" : "Unknown user");
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    return fullName || profile.user_id || profile.email || (locale === "zh" ? "未知用户" : "Unknown user");
  };

  const formatInquiryPreviewEmail = (inquiry: InquiryRecord) => {
    const profile = inquiry.profiles;
    return profile?.email || inquiry.contact_email || profile?.user_id || inquiry.id;
  };

  const getUnreadIncomingCount = (inquiry: InquiryRecord) =>
    inquiry.messages.filter(
      (message) => !message.is_read && message.sender_role !== (isAdmin ? "admin" : "user")
    ).length;

  const getInquiryStatusLabel = (inquiry: InquiryRecord) => {
    if (inquiry.is_archived) {
      return t("inbox.statusArchived");
    }
    return inquiry.is_processed ? t("inbox.statusProcessed") : t("inbox.statusPending");
  };

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
                is_archived: false,
                messages: [...inquiry.messages, payload.message!],
              }
            : inquiry
        )
      );
      setSelectedInquiryId(inquiryId);
      setReplyDrafts((prev) => ({
        ...prev,
        [inquiryId]: "",
      }));
      setPendingCount((prev) => {
        const currentInquiry = inquiries.find((item) => item.id === inquiryId);
        if (!currentInquiry || currentInquiry.is_archived) {
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

  const updateInquiryStatus = async (
    inquiryId: string,
    update: { isProcessed?: boolean; isArchived?: boolean },
    label: string
  ) => {
    if (
      statusConfirmState?.id !== inquiryId ||
      JSON.stringify(statusConfirmState.update) !== JSON.stringify(update)
    ) {
      setStatusConfirmState({ id: inquiryId, update, label });
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
          ...update,
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
                is_archived: payload.inquiry!.is_archived,
              }
            : item
        )
      );
      setPendingCount((prev) => {
        const currentInquiry = inquiries.find((item) => item.id === inquiryId);
        if (!currentInquiry) {
          return prev;
        }

        const wasPending = !currentInquiry.is_processed && !currentInquiry.is_archived;
        const nextProcessed = update.isArchived ? false : update.isProcessed ?? currentInquiry.is_processed;
        const nextArchived = update.isArchived ?? currentInquiry.is_archived;
        const isPendingNext = !nextProcessed && !nextArchived;

        if (wasPending === isPendingNext) {
          return prev;
        }

        return isPendingNext ? prev + 1 : Math.max(0, prev - 1);
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
    const pendingState = statusConfirmState?.id === inquiry.id ? statusConfirmState : null;

    if (pendingState !== null) {
      return (
        <Group
          position={isMobile ? "apart" : "right"}
          noWrap={false}
          sx={{
            width: "100%",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <Button
            size="xs"
            color={pendingState.update.isArchived ? "violet.4" : pendingState.update.isProcessed ? "violet.5" : "yellow"}
            variant="filled"
            loading={isUpdating}
            disabled={isUpdating}
            fullWidth={isMobile}
            sx={(theme) =>
              !pendingState.update.isArchived && !pendingState.update.isProcessed
                ? {
                    backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.22)" : "#f6e7b0",
                    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
                    border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.35)" : "rgba(180, 158, 120, 0.3)"}`,
                    "&:hover": {
                      backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.34)" : "#f2dc8f",
                    },
                  }
                : {}
            }
            onClick={() => void updateInquiryStatus(inquiry.id, pendingState.update, pendingState.label)}
          >
            {pendingState.label}
          </Button>
          <Button
            size="xs"
            color="gray"
            variant="light"
            disabled={isUpdating}
            fullWidth={isMobile}
            sx={(theme) => ({
              backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.08)" : "rgba(180, 158, 120, 0.1)",
              color: theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.dark[3],
              border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.15)" : "rgba(180, 158, 120, 0.2)"}`,
              "&:hover": {
                backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.14)" : "rgba(180, 158, 120, 0.18)",
              },
            })}
            onClick={() => setStatusConfirmState(null)}
          >
            {locale === "zh" ? "取消" : "Cancel"}
          </Button>
        </Group>
      );
    }

    return (
      <Group
        position={isMobile ? "apart" : "right"}
        noWrap={false}
        sx={{
          width: "100%",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        {inquiry.is_archived ? (
          <Button
            size="xs"
            variant="filled"
            loading={isUpdating}
            disabled={isUpdating}
            fullWidth={isMobile}
            sx={(theme) => ({
              backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "#f6e7b0",
              color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
              border: theme.colorScheme === "dark" ? "1px solid rgba(196,162,85,0.35)" : "none",
              "&:hover": {
                backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.28)" : "#f2dc8f",
              },
            })}
            onClick={() =>
              void updateInquiryStatus(
                inquiry.id,
                { isArchived: false, isProcessed: false },
                t("inbox.confirmUnarchived")
              )
            }
          >
            {t("inbox.markUnarchived")}
          </Button>
        ) : (
          <>
        <Button
          size="xs"
          color={inquiry.is_processed ? "yellow" : "violet.5"}
          variant="filled"
          loading={isUpdating}
          disabled={isUpdating}
          fullWidth={isMobile}
          onClick={() =>
            void updateInquiryStatus(
              inquiry.id,
              { isProcessed: !inquiry.is_processed },
              inquiry.is_processed ? t("inbox.confirmPending") : t("inbox.confirmProcessed")
            )
          }
          sx={(theme) =>
            inquiry.is_processed
              ? {
                  backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.22)" : "#f6e7b0",
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
                  border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.35)" : "rgba(180, 158, 120, 0.3)"}`,
                  "&:hover": {
                    backgroundColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.34)" : "#f2dc8f",
                  },
                }
              : {}
          }
        >
          {inquiry.is_processed ? t("inbox.markPending") : t("inbox.markProcessed")}
        </Button>
        <Button
          size="xs"
          color="violet.4"
          variant="filled"
          loading={isUpdating}
          disabled={isUpdating}
          fullWidth={isMobile}
          sx={(theme) => ({
            backgroundColor: theme.colorScheme === "dark" ? "rgba(180, 158, 120, 0.12)" : "#f6e7b0",
            color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
            "&:hover": {
              backgroundColor: theme.colorScheme === "dark" ? "rgba(180, 158, 120, 0.2)" : "#f2dc8f",
            },
          })}
          onClick={() =>
            void updateInquiryStatus(
              inquiry.id,
              { isArchived: true },
              t("inbox.confirmArchived")
            )
          }
        >
          {t("inbox.markArchived")}
        </Button>
          </>
        )}
      </Group>
    );
  };

  const renderInquiryPreviewCard = (inquiry: InquiryRecord) => {
    const isSelected = inquiry.id === selectedInquiryId;
    const unreadIncomingCount = getUnreadIncomingCount(inquiry);
    const isUnread = unreadIncomingCount > 0;
    const accentColor = inquiry.is_archived
      ? "rgba(186, 186, 186, 0.9)"
      : inquiry.is_processed
        ? "rgba(155, 139, 110, 0.85)"
        : "rgba(216, 183, 109, 0.92)";

    if (isMobile) {
      return (
        <Paper
          key={inquiry.id}
          p="md"
          withBorder
          radius="md"
          onClick={() => setSelectedInquiryId(isSelected ? null : inquiry.id)}
          sx={(theme) => ({
            cursor: "pointer",
            borderColor: isSelected
              ? accentColor
              : isUnread
                ? (theme.colorScheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.10)")
                : (theme.colorScheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"),
            background:
              theme.colorScheme === "dark"
                ? isSelected
                  ? "rgba(255, 255, 255, 0.04)"
                  : isUnread
                    ? "rgba(255, 255, 255, 0.07)"
                    : "rgba(255, 255, 255, 0.02)"
                : isSelected
                  ? "rgba(196, 162, 85, 0.06)"
                  : isUnread
                    ? "rgba(196, 162, 85, 0.04)"
                    : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
            boxShadow: isSelected
              ? (theme.colorScheme === "dark" ? "0 12px 28px rgba(0, 0, 0, 0.18)" : "0 4px 16px rgba(0,0,0,0.06)")
              : (theme.colorScheme === "dark" ? "0 8px 20px rgba(0, 0, 0, 0.12)" : "0 1px 3px rgba(0,0,0,0.04)"),
            transition: "all 160ms ease",
            touchAction: "pan-y",
          })}
        >
          <Stack spacing="sm">
            <Group position="apart" align="flex-start" noWrap={false}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Text
                  weight={isUnread && !isSelected ? 800 : 700}
                  sx={{
                    minWidth: 0,
                    lineHeight: 1.45,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {inquiry.no_inquiry_code ? t("inbox.noCode") : inquiry.inquiry_code}
                </Text>
                <Text
                  size="sm"
                  mt={4}
                  sx={(theme) => ({
                    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                    lineHeight: 1.6,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  })}
                >
                  {isAdmin ? formatInquiryPreviewEmail(inquiry) : formatInquiryPreviewOwner(inquiry)}
                </Text>
              </Box>
              <Stack spacing={6} align="flex-end">
                <Badge
                  color={inquiry.is_archived ? "violet.4" : inquiry.is_processed ? "violet.5" : "yellow"}
                  variant={inquiry.is_archived ? "filled" : "light"}
                >
                  {getInquiryStatusLabel(inquiry)}
                </Badge>
                {isUnread ? (
                  <Badge color="red" variant="filled" size="sm">
                    {locale === "zh" ? `未读 ${unreadIncomingCount}` : `Unread ${unreadIncomingCount}`}
                  </Badge>
                ) : null}
              </Stack>
            </Group>

            <Group position="apart" noWrap={false} spacing="xs">
              <Text size="sm" color="dimmed">
                {formatInquiryTime(inquiry.created_at)}
              </Text>
              <Text size="sm" color="dimmed">
                {isSelected
                  ? locale === "zh"
                    ? "收起详情"
                    : "Collapse details"
                  : locale === "zh"
                    ? "点击展开详情"
                    : "Tap to expand"}
              </Text>
            </Group>

            {isSelected ? (
              <>
                <Divider />
                <Box onClick={(event) => event.stopPropagation()}>
                  {renderInquiryDetail(inquiry)}
                </Box>
              </>
            ) : null}
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper
        key={inquiry.id}
        px="sm"
        py="xs"
        radius={0}
        onClick={() => setSelectedInquiryId(inquiry.id)}
        sx={(theme) => ({
          cursor: "pointer",
          border: "none",
          borderBottom: `1px solid ${theme.colorScheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`,
          borderLeft: `3px solid ${isUnread && !isSelected ? accentColor : "transparent"}`,
          background:
            theme.colorScheme === "dark"
              ? isUnread && !isSelected
                ? "rgba(255, 255, 255, 0.075)"
                : isSelected
                  ? "rgba(255, 255, 255, 0.025)"
                  : "rgba(255, 255, 255, 0.012)"
              : isUnread && !isSelected
                ? "rgba(196, 162, 85, 0.06)"
                : isSelected
                  ? "rgba(196, 162, 85, 0.04)"
                  : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
          opacity: isUnread && !isSelected ? 1 : isSelected ? 0.62 : 0.72,
          transition: "all 140ms ease",
          "&:hover": {
            background:
              theme.colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.09)"
                : "rgba(196, 162, 85, 0.10)",
            opacity: 1,
          },
        })}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isAdmin
              ? adminPreviewGridTemplate
              : "1fr auto",
            gap: "8px",
            alignItems: "center",
            minWidth: 0,
            width: "100%",
            overflow: "hidden",
          }}
        >
          <Text
            size="md"
            weight={isUnread && !isSelected ? 800 : 600}
            sx={{
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={inquiry.no_inquiry_code ? t("inbox.noCode") : inquiry.inquiry_code ?? undefined}
          >
            {inquiry.no_inquiry_code ? t("inbox.noCode") : inquiry.inquiry_code}
          </Text>
          {isAdmin ? (
            <>
              <Text
                size="md"
                sx={(theme) => ({ 
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  minWidth: 0, paddingLeft: 8 
                })}
                lineClamp={1}
                title={formatInquiryPreviewEmail(inquiry)}
              >
                {formatInquiryPreviewEmail(inquiry)}
              </Text>
            </>
          ) : null}

          <Box
            sx={{
              width: 84,
              justifySelf: "stretch",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingLeft: 30,
            }}
          >
            <Text
              size="sm"
              weight={700}
              color={inquiry.is_archived ? "#b8a88a" : inquiry.is_processed ? "violet.5" : "yellow.2"}
              sx={{ whiteSpace: "nowrap", textAlign: "left" }}
            >
              {getInquiryStatusLabel(inquiry)}
            </Text>
          </Box>
          {isAdmin ? (
            <Box sx={{ width: 28, justifySelf: "end" }}>
              {isUnread ? (
                <Badge color="red" variant={isSelected ? "light" : "filled"} size="xs">
                  {unreadIncomingCount}
                </Badge>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Paper>
    );
  };

  const renderInquiryPreviewHeader = () => {
    if (isMobile) {
      return null;
    }

    return (
    <Box
      px="sm"
      py={8}
      sx={{
        display: "grid",
        gridTemplateColumns: isAdmin
          ? adminPreviewGridTemplate
          : "1fr auto",
        gap: "8px",
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Text size="sm" weight={700} color="dimmed" sx={{ minWidth: 0 }}>
        {locale === "zh" ? "咨询编号" : "Inquiry code"}
      </Text>
      {isAdmin ? (
        <>
          <Text size="sm" weight={700} color="dimmed" sx={{ minWidth: 0, paddingLeft: 8 }}>
            {locale === "zh" ? "用户邮箱" : "User email"}
          </Text>
        </>
      ) : null}
      <Box
        sx={{
          width: 84,
          justifySelf: "stretch",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: 30,
        }}
      >
        <Text size="sm" weight={700} color="dimmed" sx={{ whiteSpace: "nowrap", textAlign: "left" }}>
          {locale === "zh" ? "状态" : "Status"}
        </Text>
      </Box>
      {isAdmin ? <Box sx={{ width: 28 }} /> : null}
    </Box>
    );
  };

  const renderInquiryDetail = (inquiry: InquiryRecord) => (
    <Paper
      key={inquiry.id}
      p="md"
      withBorder
      radius="md"
      sx={{
        width: "100%",
        borderColor: inquiry.is_archived
          ? "rgba(160, 160, 160, 0.35)"
          : inquiry.is_processed
          ? "rgba(155, 139, 110, 0.35)"
          : "rgba(216, 183, 109, 0.28)",
        backgroundColor: inquiry.is_archived
          ? "rgba(160, 160, 160, 0.06)"
          : inquiry.is_processed
          ? "rgba(155, 139, 110, 0.05)"
          : "rgba(255, 255, 255, 0.02)",
        boxShadow: inquiry.is_archived
          ? "0 10px 24px rgba(160, 160, 160, 0.08)"
          : inquiry.is_processed
          ? "0 10px 24px rgba(155, 139, 110, 0.08)"
          : "0 10px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      <Stack spacing="md">
        <Box sx={{ width: "100%", minWidth: 0 }}>
          <Stack spacing={8} mb="sm">
            <Text
              weight={800}
              size="lg"
              sx={{
                width: "100%",
                minWidth: 0,
                lineHeight: 1.45,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                wordBreak: "normal",
              }}
            >
              {formatInquiryTitle(inquiry)}
            </Text>
            <Group spacing="xs" noWrap={false}>
              <Badge
                color={inquiry.is_archived ? "violet.4" : inquiry.is_processed ? "violet.5" : "yellow"}
                variant={inquiry.is_archived ? "filled" : "light"}
                sx={(theme) =>
                  inquiry.is_archived
                    ? {
                        backgroundColor: theme.colorScheme === "dark" ? "rgba(180, 158, 120, 0.18)" : "#f6e7b0",
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
                      }
                    : {}
                }
              >
                {getInquiryStatusLabel(inquiry)}
              </Badge>
              <Text size="sm" color="dimmed">
                {t("inbox.submittedAt")}
                {formatInquiryTime(inquiry.created_at)}
              </Text>
            </Group>
          </Stack>
          {isAdmin ? (
            <Stack spacing={2} mb={8}>
              <Stack spacing={2}>
                {formatInquiryOwnerMeta(inquiry).map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "120px minmax(0, 1fr)",
                        gap: 10,
                        alignItems: "start",
                      }}
                  >
                    <Text size="sm" weight={600} color="dimmed">
                      {item.label}
                      {locale === "zh" ? "：" : ": "}
                    </Text>
                    <Text
                      size="sm"
                      sx={(theme) => ({
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                        minWidth: 0,
                        lineHeight: 1.6,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        wordBreak: "normal",
                      })}
                    >
                      {item.value}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : null}
          <Stack spacing={2} mt={6}>
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "120px minmax(0, 1fr)",
                gap: 10,
                alignItems: "start",
              }}
            >
              <Text size="sm" weight={600} color="dimmed">
                {locale === "zh" ? "联系电话：" : "Phone: "}
              </Text>
              <Text
                size="sm"
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  minWidth: 0,
                  lineHeight: 1.6,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "normal",
                })}
              >
                {inquiry.contact_phone}
              </Text>
            </Box>
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "120px minmax(0, 1fr)",
                gap: 10,
                alignItems: "start",
              }}
            >
              <Text size="sm" weight={600} color="dimmed">
                {locale === "zh" ? "联系邮箱：" : "Email: "}
              </Text>
              <Text
                size="sm"
                sx={(theme) => ({
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  minWidth: 0,
                  lineHeight: 1.6,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "normal",
                })}
              >
                {inquiry.contact_email}
              </Text>
            </Box>
          </Stack>
        </Box>

        {renderStatusAction(inquiry)}

        <Divider />

        <Stack spacing="sm">
          <Text size="sm" weight={700}>
            {t("inbox.threadTitle")}
          </Text>
          {inquiry.messages.map((message) => {
            const isOwnMessage = message.sender_role === (isAdmin ? "admin" : "user");
            const isAdminMessage = message.sender_role === "admin";
            return (
              <Paper
                key={message.id}
                p="sm"
                radius="md"
                sx={{
                  marginLeft: isOwnMessage ? "auto" : 0,
                  maxWidth: isMobile ? "100%" : "88%",
                  backgroundColor: isAdminMessage
                    ? "rgba(66, 153, 225, 0.18)"
                    : "rgba(245, 159, 0, 0.16)",
                  border: `1px solid ${
                    isAdminMessage
                      ? "rgba(66, 153, 225, 0.38)"
                      : "rgba(245, 159, 0, 0.34)"
                  }`,
                  boxShadow: isAdminMessage
                    ? "0 8px 18px rgba(66, 153, 225, 0.12)"
                    : "0 8px 18px rgba(245, 159, 0, 0.1)",
                }}
              >
                <Stack spacing={6}>
                  <Group position="apart" spacing="xs" noWrap={!isMobile}>
                    <Group spacing="xs" noWrap={!isMobile}>
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
                      wordBreak: "normal",
                      overflowWrap: "anywhere",
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
          {inquiry.is_archived ? (
            <Alert color="gray" variant="light">
              {t("inbox.replyArchivedNotice")}
            </Alert>
          ) : (
            <>
              <Textarea
                minRows={3}
                autosize
                value={replyDrafts[inquiry.id] ?? ""}
                onChange={(event) => handleReplyChange(inquiry.id, event.currentTarget.value)}
                placeholder={t("inbox.replyPlaceholder")}
              />
              {statusConfirmState?.id === inquiry.id && !isAdmin ? (
                <Group
                  position="right"
                  noWrap={false}
                  sx={{
                    width: "100%",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                  }}
                >
                  <Button
                    size="sm"
                    color="violet.4"
                    variant="filled"
                    loading={statusUpdatingId === inquiry.id}
                    disabled={statusUpdatingId === inquiry.id}
                    fullWidth={isMobile}
                    sx={{ color: "#1a1815" }}
                    onClick={() =>
                      void updateInquiryStatus(
                        inquiry.id,
                        statusConfirmState.update,
                        statusConfirmState.label
                      )
                    }
                  >
                    {statusConfirmState.label}
                  </Button>
                  <Button
                    size="sm"
                    color="gray"
                    variant="light"
                    disabled={statusUpdatingId === inquiry.id}
                    fullWidth={isMobile}
                    onClick={() => setStatusConfirmState(null)}
                  >
                    {locale === "zh" ? "取消" : "Cancel"}
                  </Button>
                </Group>
              ) : (
                <Group
                  position="right"
                  noWrap={false}
                  sx={{
                    width: "100%",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                  }}
                >
                  {!isAdmin ? (
                    <Button
                      size="sm"
                      color="violet.4"
                      variant="light"
                      loading={statusUpdatingId === inquiry.id}
                      disabled={statusUpdatingId === inquiry.id}
                      fullWidth={isMobile}
                      sx={(theme) => ({
                        ...secondaryActionButtonSx(theme),
                        minHeight: 40,
                      })}
                      onClick={() =>
                        void updateInquiryStatus(
                          inquiry.id,
                          { isArchived: true },
                          t("inbox.confirmEndInquiry")
                        )
                      }
                    >
                      {t("inbox.endInquiry")}
                    </Button>
                  ) : null}
                  <Button
                    leftIcon={<IconSend size={16} />}
                    onClick={() => void handleReplySubmit(inquiry.id)}
                    loading={replyingId === inquiry.id}
                    fullWidth={isMobile}
                    sx={{
                      ...primaryActionButtonSx,
                      minHeight: 40,
                    }}
                  >
                    {t("inbox.sendReply")}
                  </Button>
                </Group>
              )}
            </>
          )}
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
        <Container
          size={user ? "xl" : "md"}
          py={48}
          sx={{
            touchAction: isMobile ? "pan-y" : undefined,
          }}
        >
          <Stack spacing="xl">
            <Group position="apart" align="flex-start" noWrap={!isMobile}>
              <div>
                <Title order={1}>{t("inbox.pageTitle")}</Title>
                <Text color="dimmed" mt="sm" sx={{ whiteSpace: "pre-line" }}>
                  {roleResolved
                    ? isAdmin
                      ? t("inbox.adminDescription")
                      : t("inbox.pageDescription")
                    : locale === "zh"
                      ? "正在确认账户角色并同步收件箱视图。"
                      : "Confirming your account role and syncing the inbox view."}
                </Text>
              </div>
              {user ? (
                <Group spacing="xs" noWrap={false}>
                  {roleResolved && unreadCount > 0 ? (
                    <Badge color="red" variant="light" size="lg">
                      {locale === "zh" ? `未读 ${unreadCount}` : `Unread ${unreadCount}`}
                    </Badge>
                  ) : null}
                  {roleResolved && isAdmin ? (
                    <>
                      <Badge color="yellow" variant="light" size="lg">
                        {locale === "zh" ? `未处理 ${pendingCount}` : `Pending ${pendingCount}`}
                      </Badge>
                      <Badge color="violet.5" variant="light" size="lg">
                        {locale === "zh" ? `已处理 ${processedCount}` : `Processed ${processedCount}`}
                      </Badge>
                      <Badge color="violet.4" variant="light" size="lg">
                        {locale === "zh" ? `已归档 ${archivedCount}` : `Archived ${archivedCount}`}
                      </Badge>
                    </>
                  ) : null}
                </Group>
              ) : null}
            </Group>

            {!loading && !roleLoading && !user ? (
              <Alert icon={<IconAlertCircle size={16} />}
                title={t("inbox.loginRequiredTitle")}
                sx={(theme) => ({
                  backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.1)" : "rgba(196,162,85,0.06)",
                  borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.3)" : "rgba(180,158,120,0.3)",
                  "& .mantine-Alert-title": {
                    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  },
                  "& .mantine-Alert-message": {
                    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                  },
                })}
              >
                <Stack spacing="sm">
                  <Text>{t("inbox.loginRequiredMessage")}</Text>
                  <Group>
                    <Button
                      onClick={() => setAuthModalOpened(true)}
                      sx={{
                        ...primaryActionButtonSx,
                      }}
                    >
                      {t("auth.loginRegister")}
                    </Button>
                    <Button
                      variant="filled"
                      component={Link}
                      href="/inquiries"
                      sx={(theme) => ({
                        backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "#f6e7b0",
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4f3b12",
                        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(196,162,85,0.35)" : "transparent"}`,
                        boxShadow: theme.colorScheme === "dark" ? "none" : "0 6px 16px rgba(246, 231, 176, 0.38)",
                        "&:hover": {
                          backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.28)" : "#f2dc8f",
                          boxShadow: theme.colorScheme === "dark" ? "none" : "0 8px 18px rgba(242, 220, 143, 0.48)",
                        },
                      })}
                    >
                      {t("inquiry.entryButton")}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : null}

            {!loading && !roleLoading && !user ? null : isLoading || roleLoading ? (
              <Group position="center" py="xl">
                <Loader color="#c4a255" />
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
                {isMobile ? (
                  <Stack
                    spacing="lg"
                    sx={{
                      touchAction: "pan-y",
                    }}
                  >
                    <Text size="sm" color="dimmed">
                      {locale === "zh"
                        ? "手机端改为单列会话卡片，点击任意卡片可直接展开完整详情和消息记录。"
                        : "On mobile, conversations are shown as a single-column card list. Tap any card to expand the full details and message thread."}
                    </Text>
                    {isAdmin ? (
                      <>
                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={(theme) => ({
                            borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "rgba(216, 183, 109, 0.45)",
                            backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.06)" : "rgba(216, 183, 109, 0.06)",
                          })}
                        >
                          <Group position="apart" mb="sm">
                            <Text weight={800} color="#c4a255">
                              {locale === "zh" ? "待处理会话" : "Pending conversations"}
                            </Text>
                            <Badge color="yellow" variant="light">
                              {pendingInquiries.length}
                            </Badge>
                          </Group>
                          <Stack spacing="sm">
                            {pendingInquiries.length ? (
                              pendingInquiries.map(renderInquiryPreviewCard)
                            ) : (
                              <Text color="dimmed">
                                {locale === "zh" ? "当前没有待处理会话。" : "No pending conversations right now."}
                              </Text>
                            )}
                          </Stack>
                        </Paper>

                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={(theme) => ({
                            borderColor: theme.colorScheme === "dark" ? "rgba(155,139,110,0.25)" : "rgba(155, 139, 110, 0.35)",
                            backgroundColor: theme.colorScheme === "dark" ? "rgba(155,139,110,0.06)" : "rgba(155, 139, 110, 0.05)",
                          })}
                        >
                          <Group position="apart" mb="sm">
                            <Text weight={800} sx={{ color: "#9b8b6e" }}>
                              {locale === "zh" ? "已处理会话" : "Processed conversations"}
                            </Text>
                            <Badge sx={{ color: "#9b8b6e" }} variant="light">
                              {processedInquiries.length}
                            </Badge>
                          </Group>
                          <Stack spacing="sm">
                            {processedInquiries.length ? (
                              processedInquiries.map(renderInquiryPreviewCard)
                            ) : (
                              <Text color="dimmed">
                                {locale === "zh" ? "当前没有已处理会话。" : "No processed conversations yet."}
                              </Text>
                            )}
                          </Stack>
                        </Paper>

                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={{
                            borderColor: "rgba(160, 160, 160, 0.35)",
                            backgroundColor: "rgba(160, 160, 160, 0.06)",
                          }}
                        >
                          <Group position="apart" mb="sm">
                            <Text weight={800} color="dimmed">
                              {locale === "zh" ? "已归档会话" : "Archived conversations"}
                            </Text>
                            <Badge color="gray" variant="light">
                              {archivedInquiries.length}
                            </Badge>
                          </Group>
                          <Stack spacing="sm">
                            {archivedInquiries.length ? (
                              archivedInquiries.map(renderInquiryPreviewCard)
                            ) : (
                              <Text color="dimmed">
                                {locale === "zh" ? "当前没有已归档会话。" : "No archived conversations yet."}
                              </Text>
                            )}
                          </Stack>
                        </Paper>
                      </>
                    ) : (
                      <Paper
                        p="md"
                        withBorder
                        radius="md"
                        sx={(theme) => ({
                          borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "rgba(196, 162, 85, 0.25)",
                          backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.04)" : "rgba(196, 162, 85, 0.04)",
                        })}
                      >
                        <Group position="apart" mb="sm">
                          <Text weight={800} sx={{ color: "#c4a255" }}>
                            {locale === "zh" ? "我的咨询列表" : "My inquiries"}
                          </Text>
                          <Badge color="yellow" variant="light">
                            {inquiries.length}
                          </Badge>
                        </Group>
                        <Stack spacing="sm">
                          {inquiries.map(renderInquiryPreviewCard)}
                        </Stack>
                      </Paper>
                    )}
                  </Stack>
                ) : isAdmin ? (
                  <Grid align="flex-start" gutter="lg">
                    <Grid.Col span={12} lg={6}>
                      <Stack spacing="lg">
                        <Text size="sm" color="dimmed">
                          {locale === "zh"
                            ? "左侧保留一行预览，详细内容统一放到右侧，点击查看详情。"
                            : "The left side keeps a one-line preview, with full details shown on the right. Click to view details."}
                        </Text>
                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={(theme) => ({
                            borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "rgba(216, 183, 109, 0.45)",
                            backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.06)" : "rgba(216, 183, 109, 0.06)",
                          })}
                        >
                          <Group position="apart" mb={4}>
                            <Text weight={800} color="#c4a255">
                              {locale === "zh" ? "待处理会话" : "Pending conversations"}
                            </Text>
                            <Badge color="yellow" variant="light">
                              {pendingInquiries.length}
                            </Badge>
                          </Group>
                          {renderInquiryPreviewHeader()}
                          <ScrollArea.Autosize mah={520} offsetScrollbars>
                            <Stack spacing={0}>
                              {pendingInquiries.length ? (
                                pendingInquiries.map(renderInquiryPreviewCard)
                              ) : (
                                <Text color="dimmed">
                                  {locale === "zh" ? "当前没有待处理会话。" : "No pending conversations right now."}
                                </Text>
                              )}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Paper>

                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={(theme) => ({
                            borderColor: theme.colorScheme === "dark" ? "rgba(155,139,110,0.25)" : "rgba(155, 139, 110, 0.35)",
                            backgroundColor: theme.colorScheme === "dark" ? "rgba(155,139,110,0.06)" : "rgba(155, 139, 110, 0.05)",
                          })}
                        >
                          <Group position="apart" mb={4}>
                            <Text weight={800} color="violet.5">
                              {locale === "zh" ? "已处理归档" : "Processed archive"}
                            </Text>
                            <Badge color="violet.5" variant="light">
                              {processedInquiries.length}
                            </Badge>
                          </Group>
                          {renderInquiryPreviewHeader()}
                          <ScrollArea.Autosize mah={400} offsetScrollbars>
                            <Stack spacing={0}>
                              {processedInquiries.length ? (
                                processedInquiries.map(renderInquiryPreviewCard)
                              ) : (
                                <Text color="dimmed">
                                  {locale === "zh" ? "当前没有已处理会话。" : "No processed conversations yet."}
                                </Text>
                              )}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Paper>

                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={{
                            borderColor: "rgba(160, 160, 160, 0.35)",
                            backgroundColor: "rgba(160, 160, 160, 0.06)",
                          }}
                        >
                          <Group position="apart" mb={4}>
                            <Text weight={800} color="dimmed">
                              {locale === "zh" ? "已归档会话" : "Archived conversations"}
                            </Text>
                            <Badge color="gray" variant="light">
                              {archivedInquiries.length}
                            </Badge>
                          </Group>
                          {renderInquiryPreviewHeader()}
                          <ScrollArea.Autosize mah={320} offsetScrollbars>
                            <Stack spacing={0}>
                              {archivedInquiries.length ? (
                                archivedInquiries.map(renderInquiryPreviewCard)
                              ) : (
                                <Text color="dimmed">
                                  {locale === "zh" ? "当前没有已归档会话。" : "No archived conversations yet."}
                                </Text>
                              )}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Paper>
                      </Stack>
                    </Grid.Col>

                    <Grid.Col span={12} lg={6}>
                      {selectedInquiry ? (
                        <Stack spacing="sm">
                          <Text size="sm" color="dimmed">
                            {locale === "zh"
                              ? "右侧显示完整咨询详情、联系方式和往来记录。"
                              : "The detail panel shows the full inquiry, contact details, and message thread."}
                          </Text>
                          {renderInquiryDetail(selectedInquiry)}
                        </Stack>
                      ) : (
                        <Paper withBorder radius="md" p="xl">
                          <Text color="dimmed" align="center">
                            {locale === "zh"
                              ? "请选择左侧一条咨询查看详情。"
                              : "Select a conversation from the left to view details."}
                          </Text>
                        </Paper>
                      )}
                    </Grid.Col>
                  </Grid>
                ) : (
                  <Grid align="flex-start" gutter="lg">
                    <Grid.Col span={12} md={5}>
                      <Stack spacing="lg">
                        <Text size="sm" color="dimmed">
                          {locale === "zh"
                            ? "左侧保留一行预览，右侧查看咨询详情与往来记录。"
                            : "Use the left side for one-line previews and the right side for full conversation details."}
                        </Text>
                        <Paper
                          p="md"
                          withBorder
                          radius="md"
                          sx={(theme) => ({
                            borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.2)" : "rgba(196, 162, 85, 0.25)",
                            backgroundColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.04)" : "rgba(196, 162, 85, 0.04)",
                          })}
                        >
                          <Group position="apart" mb={4}>
                            <Text weight={800} sx={{ color: "#c4a255" }}>
                              {locale === "zh" ? "我的咨询列表" : "My inquiries"}
                            </Text>
                            <Badge color="yellow" variant="light">
                              {inquiries.length}
                            </Badge>
                          </Group>
                          {renderInquiryPreviewHeader()}
                          <ScrollArea.Autosize mah={760} offsetScrollbars>
                            <Stack spacing={0}>
                              {inquiries.map(renderInquiryPreviewCard)}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Paper>
                      </Stack>
                    </Grid.Col>

                    <Grid.Col span={12} md={7}>
                      {selectedInquiry ? (
                        <Stack spacing="sm">
                          <Text size="sm" color="dimmed">
                            {locale === "zh"
                              ? "右侧显示完整咨询详情、处理状态和往来记录。"
                              : "The detail panel shows the full inquiry, current status, and reply thread."}
                          </Text>
                          {renderInquiryDetail(selectedInquiry)}
                        </Stack>
                      ) : (
                        <Paper withBorder radius="md" p="xl">
                          <Text color="dimmed" align="center">
                            {locale === "zh"
                              ? "请选择左侧一条咨询查看详情。"
                              : "Select an inquiry from the left to view details."}
                          </Text>
                        </Paper>
                      )}
                    </Grid.Col>
                  </Grid>
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
