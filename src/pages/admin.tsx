import Head from "next/head";
import { Wrapper } from "@/layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { supabase, type Profile } from "@/lib/supabase/client";
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
  Title,
} from "@mantine/core";
import { IconShield, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminProfile = Pick<
  Profile,
  "id" | "email" | "first_name" | "last_name" | "user_id" | "role" | "created_at" | "updated_at"
>;

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
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user_id: string | null;
    email: string | null;
  } | null;
};

const formatDisplayName = (profile: AdminProfile, locale: string) => {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  if (fullName) return fullName;
  if (profile.user_id) return profile.user_id;
  return locale === "zh" ? "未命名用户" : "Unnamed user";
};

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, refreshProfile, logout } = useAuth();
  const { locale } = useI18n();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);
  const [roleConfirmState, setRoleConfirmState] = useState<{
    id: string;
    nextRole: "admin" | "user";
  } | null>(null);
  const [inquiryConfirmState, setInquiryConfirmState] = useState<{
    id: string;
    nextProcessed: boolean;
  } | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(locale === "zh" ? "请先登录。" : "Please log in first.");
        return;
      }

      const [profilesResponse, inquiriesResponse] = await Promise.all([
        fetch("/api/admin/profiles", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        fetch("/api/inquiries", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      const profilesPayload = (await profilesResponse.json()) as {
        profiles?: AdminProfile[];
        error?: string;
      };
      const inquiriesPayload = (await inquiriesResponse.json()) as {
        inquiries?: InquiryRecord[];
        error?: string;
      };

      if (!profilesResponse.ok) {
        throw new Error(profilesPayload.error || "Unable to load profiles.");
      }

      if (!inquiriesResponse.ok) {
        throw new Error(inquiriesPayload.error || "Unable to load inquiries.");
      }

      setProfiles(profilesPayload.profiles ?? []);
      setInquiries(inquiriesPayload.inquiries ?? []);
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "加载失败" : "Load failed"));
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setIsLoading(false);
      return;
    }
    void loadAdminData();
  }, [authLoading, user, isAdmin, loadAdminData]);

  const adminProfiles = useMemo(
    () => profiles.filter((profile) => profile.role === "admin"),
    [profiles]
  );
  const userProfiles = useMemo(
    () => profiles.filter((profile) => profile.role === "user"),
    [profiles]
  );
  const pendingInquiries = useMemo(
    () => inquiries.filter((inquiry) => !inquiry.is_processed),
    [inquiries]
  );
  const processedInquiries = useMemo(
    () => inquiries.filter((inquiry) => inquiry.is_processed),
    [inquiries]
  );

  const formatInquiryOwner = (inquiry: InquiryRecord) => {
    const profile = inquiry.profiles;
    if (!profile) {
      return locale === "zh" ? "未知用户" : "Unknown user";
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    return fullName || profile.user_id || profile.email || (locale === "zh" ? "未知用户" : "Unknown user");
  };

  const formatInquiryTime = (value: string) =>
    new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");

  const updateInquiryStatus = async (inquiryId: string, isProcessed: boolean) => {
    if (
      inquiryConfirmState?.id !== inquiryId ||
      inquiryConfirmState.nextProcessed !== isProcessed
    ) {
      setRoleConfirmState(null);
      setDeleteArmedId(null);
      setInquiryConfirmState({ id: inquiryId, nextProcessed: isProcessed });
      return;
    }

    try {
      setUpdatingId(inquiryId);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(locale === "zh" ? "请先登录。" : "Please log in first.");
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
        throw new Error(payload.error || "Unable to update inquiry.");
      }

      setInquiries((prev) =>
        prev.map((item) => (item.id === payload.inquiry?.id ? payload.inquiry : item))
      );
      setInquiryConfirmState(null);
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "更新失败" : "Update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const renderInquiryCard = (inquiry: InquiryRecord) => {
    const isUpdating = updatingId === inquiry.id;
    const pendingProcessedState =
      inquiryConfirmState?.id === inquiry.id ? inquiryConfirmState.nextProcessed : null;

    return (
      <Paper key={inquiry.id} p="md" withBorder radius="md">
        <Stack spacing="sm">
          <Box sx={{ minWidth: 0 }}>
            <Group spacing="xs" align="center" mb={6}>
              <Text weight={700}>{formatInquiryOwner(inquiry)}</Text>
              <Badge color={inquiry.is_processed ? "teal" : "yellow"} variant="light">
                {inquiry.is_processed
                  ? locale === "zh"
                    ? "已处理"
                    : "Processed"
                  : locale === "zh"
                    ? "未处理"
                    : "Pending"}
              </Badge>
              <Badge color="gray" variant="light">
                {inquiry.no_inquiry_code
                  ? locale === "zh"
                    ? "无编号"
                    : "No code"
                  : inquiry.inquiry_code}
              </Badge>
            </Group>
            <Text size="sm" color="dimmed">
              {locale === "zh" ? "提交时间：" : "Submitted: "}
              {formatInquiryTime(inquiry.created_at)}
            </Text>
          </Box>
          <Stack spacing={4}>
            <Text size="sm" sx={{ wordBreak: "break-word" }}>
              {locale === "zh" ? "联系电话：" : "Phone: "}
              {inquiry.contact_phone}
            </Text>
            <Text size="sm" sx={{ wordBreak: "break-word" }}>
              {locale === "zh" ? "联系邮箱：" : "Email: "}
              {inquiry.contact_email}
            </Text>
          </Stack>
          <Box>
            <Text size="sm" weight={600} mb={4}>
              {locale === "zh" ? "咨询内容" : "Inquiry details"}
            </Text>
            <Text
              size="sm"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.7,
              }}
            >
              {inquiry.details}
            </Text>
          </Box>
          <Group position="right">
            {pendingProcessedState !== null ? (
              <>
                <Button
                  size="xs"
                  color={pendingProcessedState ? "teal" : "gray"}
                  variant="filled"
                  loading={isUpdating}
                  disabled={isUpdating}
                  onClick={() => void updateInquiryStatus(inquiry.id, pendingProcessedState)}
                >
                  {pendingProcessedState
                    ? locale === "zh"
                      ? "确认标记为已处理"
                      : "Confirm processed"
                    : locale === "zh"
                      ? "确认标记为未处理"
                      : "Confirm pending"}
                </Button>
                <Button
                  size="xs"
                  color="gray"
                  variant="light"
                  disabled={isUpdating}
                  onClick={() => setInquiryConfirmState(null)}
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </Button>
              </>
            ) : (
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
                        backgroundColor: "rgba(129, 140, 248, 0.18)",
                        color: "#c7d2fe",
                        border: "1px solid rgba(129, 140, 248, 0.35)",
                        "&:hover": {
                          backgroundColor: "rgba(129, 140, 248, 0.28)",
                        },
                      }
                    : undefined
                }
              >
                {inquiry.is_processed
                  ? locale === "zh"
                    ? "标记为未处理"
                    : "Mark as pending"
                  : locale === "zh"
                    ? "标记为已处理"
                    : "Mark as processed"}
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    );
  };

  const updateRole = async (profile: AdminProfile, nextRole: "admin" | "user") => {
    if (roleConfirmState?.id !== profile.id || roleConfirmState.nextRole !== nextRole) {
      setDeleteArmedId(null);
      setRoleConfirmState({ id: profile.id, nextRole });
      return;
    }

    try {
      setUpdatingId(profile.id);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(locale === "zh" ? "请先登录。" : "Please log in first.");
      }

      const response = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: profile.id,
          role: nextRole,
        }),
      });

      const payload = (await response.json()) as { profile?: AdminProfile; error?: string };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Unable to update role.");
      }

      setProfiles((prev) =>
        prev.map((item) => (item.id === payload.profile?.id ? payload.profile : item))
      );

      if (user?.id === profile.id) {
        await refreshProfile();
      }
      setRoleConfirmState(null);
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "更新失败" : "Update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteProfile = async (profile: AdminProfile) => {
    if (deleteArmedId !== profile.id) {
      setRoleConfirmState(null);
      setDeleteArmedId(profile.id);
      return;
    }

    const confirmed = window.confirm(
      locale === "zh"
        ? `请再次确认删除用户“${formatDisplayName(profile, locale)}”。此操作不可恢复。`
        : `Please confirm deleting "${formatDisplayName(profile, locale)}". This action cannot be undone.`
    );

    if (!confirmed) {
      setDeleteArmedId(null);
      return;
    }

    try {
      setUpdatingId(profile.id);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(locale === "zh" ? "请先登录。" : "Please log in first.");
      }

      const response = await fetch("/api/admin/profiles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: profile.id }),
      });

      const payload = (await response.json()) as { ok?: boolean; deletedId?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.deletedId) {
        throw new Error(payload.error || "Unable to delete user.");
      }

      setProfiles((prev) => prev.filter((item) => item.id !== payload.deletedId));
      setDeleteArmedId(null);

      if (user?.id === payload.deletedId) {
        await logout();
      }
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "删除失败" : "Delete failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const renderProfileCard = (profile: AdminProfile) => {
    const isSelf = user?.id === profile.id;
    const isUpdating = updatingId === profile.id;
    const isDeleteArmed = deleteArmedId === profile.id;
    const pendingRoleChange =
      roleConfirmState?.id === profile.id ? roleConfirmState.nextRole : null;
    const nextRole = profile.role === "admin" ? "user" : "admin";

    return (
      <Paper key={profile.id} p="md" withBorder radius="md">
        <Group position="apart" align="flex-start" noWrap>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Group spacing="xs" mb="xs">
              <Text weight={700}>{formatDisplayName(profile, locale)}</Text>
              {isSelf && (
                <Badge color="blue" variant="light">
                  {locale === "zh" ? "当前账号" : "Current account"}
                </Badge>
              )}
            </Group>
            <Stack spacing={4}>
              <Text size="sm" color="dimmed">
                {profile.email || (locale === "zh" ? "无邮箱" : "No email")}
              </Text>
              <Text size="sm" color="dimmed">
                ID: {profile.user_id || "-"}
              </Text>
            </Stack>
          </Box>

          <Group spacing="xs">
            {pendingRoleChange ? (
              <>
                <Button
                  size="xs"
                  color={pendingRoleChange === "user" ? "yellow" : "red"}
                  variant="filled"
                  loading={isUpdating && !isDeleteArmed}
                  disabled={isUpdating}
                  onClick={() => updateRole(profile, pendingRoleChange)}
                  sx={
                    pendingRoleChange === "user"
                      ? {
                          color: "#111",
                          boxShadow: "0 4px 12px rgba(216, 183, 109, 0.35)",
                          "&:hover": {
                            boxShadow: "0 6px 16px rgba(216, 183, 109, 0.45)",
                          },
                        }
                      : undefined
                  }
                >
                  {locale === "zh" ? "确认修改权限" : "Confirm role change"}
                </Button>
                <Button
                  size="xs"
                  color="gray"
                  variant="light"
                  disabled={isUpdating}
                  onClick={() => setRoleConfirmState(null)}
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                color={profile.role === "admin" ? "yellow" : "red"}
                variant="filled"
                loading={isUpdating && !isDeleteArmed}
                disabled={isUpdating}
                onClick={() => updateRole(profile, nextRole)}
                sx={
                  profile.role === "admin"
                    ? {
                        color: "#111",
                        boxShadow: "0 4px 12px rgba(216, 183, 109, 0.35)",
                        "&:hover": {
                          boxShadow: "0 6px 16px rgba(216, 183, 109, 0.45)",
                        },
                      }
                    : undefined
                }
              >
                {profile.role === "admin"
                  ? locale === "zh"
                    ? "设为用户"
                    : "Set as user"
                  : locale === "zh"
                    ? "设为管理员"
                    : "Make admin"}
              </Button>
            )}
            {isDeleteArmed ? (
              <>
                <Button
                  size="xs"
                  color="red"
                  variant="filled"
                  loading={isUpdating}
                  disabled={isUpdating}
                  onClick={() => void deleteProfile(profile)}
                >
                  {locale === "zh" ? "再次确认删除" : "Confirm delete"}
                </Button>
                <Button
                  size="xs"
                  color="gray"
                  variant="light"
                  disabled={isUpdating}
                  onClick={() => setDeleteArmedId(null)}
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                color="red"
                variant="light"
                loading={isUpdating && isDeleteArmed}
                disabled={isUpdating}
                onClick={() => void deleteProfile(profile)}
              >
                {locale === "zh" ? "删除用户" : "Delete user"}
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    );
  };

  const title = locale === "zh" ? "管理后台" : "Admin Panel";

  return (
    <>
      <Head>
        <title>{title} - Eastwood Auction</title>
      </Head>
      <Wrapper>
        <Container size="lg" py={48}>
          <Stack spacing="xl">
            <Group position="apart" align="flex-end">
              <div>
                <Title order={1}>{title}</Title>
                <Text color="dimmed">
                  {locale === "zh"
                    ? "查看所有管理员和用户，并直接调整账号权限。"
                    : "Review all administrators and users, then update account roles directly."}
                </Text>
              </div>
              <Button component={Link} href="/" variant="light">
                {locale === "zh" ? "返回首页" : "Back Home"}
              </Button>
            </Group>

            {!authLoading && (!user || !isAdmin) ? (
              <Alert color="red" title={locale === "zh" ? "无权限访问" : "Access denied"}>
                {locale === "zh"
                  ? "只有管理员可以进入管理后台。"
                  : "Only administrators can access this page."}
              </Alert>
            ) : null}

            {error ? (
              <Alert color="red" title={locale === "zh" ? "操作失败" : "Request failed"}>
                {error}
              </Alert>
            ) : null}

            {isLoading || authLoading ? (
              <Group position="center" py="xl">
                <Loader />
              </Group>
            ) : user && isAdmin ? (
              <Stack spacing="xl">
                <Paper p="lg" withBorder radius="md">
                  <Group position="apart" mb="md">
                    <Group spacing="sm">
                      <IconShield size={20} />
                      <Title order={3}>{locale === "zh" ? "管理员" : "Administrators"}</Title>
                    </Group>
                    <Badge color="red" variant="light">
                      {adminProfiles.length}
                    </Badge>
                  </Group>
                  <Stack spacing="sm">
                    {adminProfiles.map(renderProfileCard)}
                  </Stack>
                </Paper>

                <Divider />

                <Paper p="lg" withBorder radius="md">
                  <Group position="apart" mb="md">
                    <Group spacing="sm">
                      <IconUser size={20} />
                      <Title order={3}>{locale === "zh" ? "用户" : "Users"}</Title>
                    </Group>
                    <Badge color="blue" variant="light">
                      {userProfiles.length}
                    </Badge>
                  </Group>
                  <Stack spacing="sm">
                    {userProfiles.map(renderProfileCard)}
                  </Stack>
                </Paper>

                <Divider />

                <Paper p="lg" withBorder radius="md">
                  <Group position="apart" mb="md">
                    <Title order={3}>{locale === "zh" ? "委托与咨询" : "Consignments & Inquiries"}</Title>
                    <Badge color="grape" variant="light">
                      {inquiries.length}
                    </Badge>
                  </Group>
                  <Stack spacing="lg">
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
                          {locale === "zh" ? "未处理咨询" : "Pending Inquiries"}
                        </Text>
                        <Badge color="yellow" variant="light">
                          {pendingInquiries.length}
                        </Badge>
                      </Group>
                      <Text size="sm" color="dimmed" mb="md">
                        {locale === "zh"
                          ? "优先处理这一组，表示管理员还没有完成跟进。"
                          : "Prioritize this group first. These inquiries still need follow-up."}
                      </Text>
                      <Stack spacing="sm">
                        {pendingInquiries.length ? (
                          pendingInquiries.map(renderInquiryCard)
                        ) : (
                          <Text color="dimmed">
                            {locale === "zh" ? "当前没有未处理咨询。" : "No pending inquiries."}
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    <Divider
                      label={locale === "zh" ? "处理归档" : "Processed Archive"}
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
                          {locale === "zh" ? "已处理咨询" : "Processed Inquiries"}
                        </Text>
                        <Badge color="teal" variant="light">
                          {processedInquiries.length}
                        </Badge>
                      </Group>
                      <Text size="sm" color="dimmed" mb="md">
                        {locale === "zh"
                          ? "这一组是已经处理完成的咨询记录。"
                          : "This group contains inquiries that have already been handled."}
                      </Text>
                      <Stack spacing="sm">
                        {processedInquiries.length ? (
                          processedInquiries.map(renderInquiryCard)
                        ) : (
                          <Text color="dimmed">
                            {locale === "zh" ? "当前没有已处理咨询。" : "No processed inquiries."}
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  </Stack>
                </Paper>
              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Wrapper>
    </>
  );
}
