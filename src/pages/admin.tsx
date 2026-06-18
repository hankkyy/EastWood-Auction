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
import { useMediaQuery } from "@mantine/hooks";
import { IconShield, IconUser, IconEye } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminMarketWatch from "@/components/AdminMarketWatch";

type AdminProfile = Pick<
  Profile,
  "id" | "email" | "first_name" | "last_name" | "user_id" | "role" | "created_at" | "updated_at"
>;

const formatDisplayName = (profile: AdminProfile, locale: string) => {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  if (fullName) return fullName;
  if (profile.user_id) return profile.user_id;
  return locale === "zh" ? "未命名用户" : "Unnamed user";
};

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, roleLoading, refreshProfile, logout } = useAuth();
  const { locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);
  const [roleConfirmState, setRoleConfirmState] = useState<{
    id: string;
    nextRole: "admin" | "user";
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

      const profilesResponse = await fetch("/api/admin/profiles", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const profilesPayload = (await profilesResponse.json()) as {
        profiles?: AdminProfile[];
        error?: string;
      };

      if (!profilesResponse.ok) {
        throw new Error(profilesPayload.error || "Unable to load profiles.");
      }

      setProfiles(profilesPayload.profiles ?? []);
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "加载失败" : "Load failed"));
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user || !isAdmin) {
      setIsLoading(false);
      return;
    }
    void loadAdminData();
  }, [authLoading, roleLoading, user, isAdmin, loadAdminData]);

  const adminProfiles = useMemo(
    () => profiles.filter((profile) => profile.role === "admin"),
    [profiles]
  );
  const userProfiles = useMemo(
    () => profiles.filter((profile) => profile.role === "user"),
    [profiles]
  );

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
        <Group
          position="apart"
          align="flex-start"
          noWrap={!isMobile}
          sx={{
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "flex-start",
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1, width: "100%" }}>
            <Group spacing="xs" mb="xs">
              <Text weight={700}>{formatDisplayName(profile, locale)}</Text>
              {isSelf && (
                <Badge color="yellow" variant="light">
                  {locale === "zh" ? "当前账号" : "Current account"}
                </Badge>
              )}
            </Group>
            <Stack spacing="xs">
              <Text
                size="sm"
                color="dimmed"
                sx={{ lineHeight: 1.6, whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                <Text component="span" weight={600} color="gray.3">
                  {locale === "zh" ? "邮箱：" : "Email: "}
                </Text>
                {profile.email || (locale === "zh" ? "无邮箱" : "No email")}
              </Text>
              <Text
                size="sm"
                color="dimmed"
                sx={{ lineHeight: 1.6, whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                <Text component="span" weight={600} color="gray.3">
                  {locale === "zh" ? "用户ID：" : "User ID: "}
                </Text>
                {profile.user_id || "-"}
              </Text>
              <Text
                size="sm"
                color="dimmed"
                sx={{ lineHeight: 1.6, whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                <Text component="span" weight={600} color="gray.3">
                  {locale === "zh" ? "角色：" : "Role: "}
                </Text>
                {profile.role === "admin"
                  ? locale === "zh"
                    ? "管理员"
                    : "Admin"
                  : locale === "zh"
                    ? "用户"
                    : "User"}
              </Text>
            </Stack>
          </Box>

          <Group
            spacing="xs"
            sx={{
              width: isMobile ? "100%" : "auto",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
            }}
          >
            {pendingRoleChange ? (
              <>
                <Button
                  size="xs"
                  color={pendingRoleChange === "user" ? "yellow" : "red"}
                  variant="filled"
                  loading={isUpdating && !isDeleteArmed}
                  disabled={isUpdating}
                  onClick={() => updateRole(profile, pendingRoleChange)}
                  fullWidth={isMobile}
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
                  fullWidth={isMobile}
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
                fullWidth={isMobile}
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
                  fullWidth={isMobile}
                >
                  {locale === "zh" ? "再次确认删除" : "Confirm delete"}
                </Button>
                <Button
                  size="xs"
                  color="gray"
                  variant="light"
                  disabled={isUpdating}
                  onClick={() => setDeleteArmedId(null)}
                  fullWidth={isMobile}
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
                fullWidth={isMobile}
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
            <Group
              position="apart"
              align={isMobile ? "stretch" : "flex-end"}
              noWrap={!isMobile}
              sx={{ flexDirection: isMobile ? "column" : "row" }}
            >
              <div>
                <Title order={1}>{title}</Title>
                <Text color="dimmed">
                  {locale === "zh"
                    ? "这里只负责管理员与用户权限管理。委托与咨询的回复和处理状态请前往收件箱。"
                    : "This page is only for administrator and user permission management. Handle consignments and inquiries in the inbox."}
                </Text>
              </div>
              <Group spacing="xs" sx={{ width: isMobile ? "100%" : "auto" }}>
                <Button
                  component={Link}
                  href="/inbox"
                  variant="filled"
                  color="violet"
                  fullWidth={isMobile}
                  sx={{
                    boxShadow: "0 8px 18px rgba(196, 162, 85, 0.25)",
                    "&:hover": {
                      boxShadow: "0 10px 22px rgba(196, 162, 85, 0.35)",
                    },
                  }}
                >
                  {locale === "zh" ? "前往收件箱" : "Open Inbox"}
                </Button>
                <Button
                  component={Link}
                  href="/"
                  variant="filled"
                  color="orange"
                  fullWidth={isMobile}
                  sx={{
                    color: "#111",
                    boxShadow: "0 8px 18px rgba(245, 159, 0, 0.35)",
                    "&:hover": {
                      boxShadow: "0 10px 22px rgba(245, 159, 0, 0.45)",
                    },
                  }}
                >
                  {locale === "zh" ? "返回首页" : "Back Home"}
                </Button>
              </Group>
            </Group>

            {!authLoading && !roleLoading && (!user || !isAdmin) ? (
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

            {isLoading || authLoading || roleLoading ? (
              <Group position="center" py="xl">
                <Loader />
              </Group>
            ) : user && isAdmin ? (
              <Stack spacing="xl">
                <Paper p="lg" withBorder radius="md">
                  <Group position="apart" mb="md" noWrap={!isMobile}>
                    <Group spacing="sm" noWrap={!isMobile}>
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
                  <Group position="apart" mb="md" noWrap={!isMobile}>
                    <Group spacing="sm" noWrap={!isMobile}>
                      <IconUser size={20} />
                      <Title order={3}>{locale === "zh" ? "用户" : "Users"}</Title>
                    </Group>
                    <Badge color="yellow" variant="light">
                      {userProfiles.length}
                    </Badge>
                  </Group>
                  <Stack spacing="sm">
                    {userProfiles.map(renderProfileCard)}
                  </Stack>
                </Paper>

                <Divider />

                <Paper p="lg" withBorder radius="md">
                  <Group position="apart" mb="md" noWrap={!isMobile}>
                    <Group spacing="sm" noWrap={!isMobile}>
                      <IconEye size={20} />
                      <Title order={3}>
                        {locale === "zh" ? "市场监控" : "Market Watch"}
                      </Title>
                    </Group>
                  </Group>
                  <AdminMarketWatch />
                </Paper>

              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Wrapper>
    </>
  );
}
