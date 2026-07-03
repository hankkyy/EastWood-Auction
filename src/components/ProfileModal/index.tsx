import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Text,
  Group,
  Avatar,
  Divider,
  Badge,
  Box,
  CloseButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { primaryActionButtonSx, secondaryActionButtonSx } from "@/components/artworkStyles";

interface ProfileModalProps {
  opened: boolean;
  onClose: () => void;
  userOverride?: AuthUser | null;
  isAdminOverride?: boolean;
  roleLoadingOverride?: boolean;
  logoutOverride?: () => Promise<void> | void;
}

export default function ProfileModal({
  opened,
  onClose,
  userOverride,
  isAdminOverride,
  roleLoadingOverride,
  logoutOverride,
}: ProfileModalProps) {
  const auth = useAuth();
  const user = userOverride ?? auth.user;
  const isAdmin = isAdminOverride ?? auth.isAdmin;
  const roleLoading = roleLoadingOverride ?? auth.roleLoading;
  const logout = logoutOverride ?? auth.logout;
  const updateProfile = auth.updateProfile;
  const { t, locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [userIdChangeCount, setUserIdChangeCount] = useState(0);

  // 当 user.profile 变化时，初始化表单数据
  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.first_name || "");
      setLastName(user.profile.last_name || "");
      setUserId(user.profile.user_id || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setLoading(true);
      const result = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        user_id: userId,
      });

      if (result.success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";
  const avatarColor = roleLoading ? "gray" : isAdmin ? "red" : "blue";
  const roleText = roleLoading
    ? locale === "zh"
      ? "正在同步角色"
      : "Syncing role"
    : isAdmin
      ? t("auth.adminRole")
      : t("auth.userRole");
  const roleBadgeText = roleLoading
    ? locale === "zh"
      ? "角色同步中"
      : "Role syncing"
    : isAdmin
      ? t("auth.adminRole")
      : t("auth.normalUserRole");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={false}
      closeOnClickOutside={false}
      fullScreen={isMobile}
      transitionProps={{ transition: "fade", duration: 200 }}
      styles={{
        content: {
          borderRadius: isMobile ? 0 : 16,
          padding: 0,
          maxHeight: isMobile ? "100vh" : "90vh",
          overflowY: "auto",
        },
        header: { display: "none" },
      }}
    >
      <Box
        sx={(theme) => ({
          padding: isMobile ? 16 : 24,
          paddingTop: 12,
          backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[1] : "#fffdf9",
          color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
        })}
      >
      {/* 显式的关闭按钮 — 移动端 fullScreen 模式下确保可见可触 */}
      <Group position="right" mb="xs">
        <CloseButton
          onClick={onClose}
          size="lg"
          aria-label={locale === "zh" ? "关闭个人资料" : "Close profile"}
          sx={(theme) => ({
            color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
          })}
        />
      </Group>
      <Stack spacing="lg">
        {/* 用户信息卡片 */}
        <Group position="apart" align="flex-start" noWrap>
          <Group spacing="md" noWrap>
            <Avatar color={avatarColor} radius="xl" size="xl">
              {initials}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text weight={600} sx={{ wordBreak: "break-word" }}>{user.email}</Text>
              <Text size="sm" color="dimmed">
                {t("auth.roleLabel")}: {roleText}
              </Text>
              <Badge
                color={avatarColor}
                variant="light"
                size="sm"
                mt="xs"
              >
                {roleBadgeText}
              </Badge>
            </div>
          </Group>
        </Group>

        <Divider />

        <Text size="sm" color="dimmed">
          {locale === "zh"
            ? "建议先完善姓名与用户编号，后续询价和沟通会更顺畅。"
            : "Filling in your name and user ID first makes inquiries and follow-up much smoother."}
        </Text>

        {/* 编辑表单 */}
        <form onSubmit={handleUpdateProfile}>
          <Stack spacing="md">
            <TextInput
              label={t("auth.firstNameLabel")}
              placeholder={t("auth.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
              autoComplete="given-name"
              styles={(theme) => ({
                input: {
                  minHeight: 48,
                  fontSize: 16,
                  color: theme.colorScheme === "dark" ? "#f0ebe3" : undefined,
                },
              })}
            />
            <TextInput
              label={t("auth.lastNameLabel")}
              placeholder={t("auth.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              autoComplete="family-name"
              styles={(theme) => ({
                input: {
                  minHeight: 48,
                  fontSize: 16,
                  color: theme.colorScheme === "dark" ? "#f0ebe3" : undefined,
                },
              })}
            />
            <TextInput
              label={t("auth.userIdLabel")}
              placeholder={t("auth.userIdPlaceholder")}
              value={userId}
              onChange={(e) => setUserId(e.currentTarget.value)}
              description={t("auth.userIdDescription")}
              disabled={userIdChangeCount >= 3}
              autoComplete="username"
              styles={(theme) => ({
                input: {
                  minHeight: 48,
                  fontSize: 16,
                  color: theme.colorScheme === "dark" ? "#f0ebe3" : undefined,
                },
              })}
            />
            {userIdChangeCount < 3 && (
              <Text size="xs" color="dimmed" sx={{ marginTop: -8 }}>
                {locale === "zh" 
                  ? `剩余 ${3 - userIdChangeCount} 次修改机会`
                  : `${3 - userIdChangeCount} changes remaining`}
              </Text>
            )}
            <TextInput
              label={t("auth.emailLabel")}
              value={user.email || ""}
              disabled
              description={t("auth.emailNotEditable")}
              styles={{
                input: {
                  minHeight: 48,
                  fontSize: 16,
                },
              }}
            />
            <Button 
              type="submit" 
              loading={loading} 
              fullWidth
              size="lg"
              sx={{
                ...primaryActionButtonSx,
                minHeight: 52,
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              {t("auth.saveChanges")}
            </Button>
          </Stack>
        </form>

        <Divider />

        {/* 退出登录按钮 */}
        <Button
          variant="default"
          onClick={() => {
            logout();
            onClose();
          }}
          fullWidth
          size="lg"
          sx={(theme) => ({
            ...secondaryActionButtonSx(theme),
            minHeight: 52,
            fontSize: 17,
            fontWeight: 600,
            "&:hover": {
              ...secondaryActionButtonSx(theme)["&:hover"],
              transform: "translateY(-2px)",
            },
            transition: "all 0.2s ease",
          })}
        >
          {t("auth.logout")}
        </Button>
      </Stack>
      </Box>
    </Modal>
  );
}
