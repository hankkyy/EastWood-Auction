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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";

interface ProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function ProfileModal({ opened, onClose }: ProfileModalProps) {
  const { user, updateProfile, logout } = useAuth();
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
  const avatarColor = user.profile?.role === "admin" ? "red" : "blue";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("auth.profileTitle")}
      centered
      size="md"
      fullScreen={isMobile}
      transitionProps={{ transition: "fade", duration: 200 }}
      styles={{
        content: {
          borderRadius: isMobile ? 0 : 16,
          padding: isMobile ? 16 : 24,
          maxHeight: isMobile ? "100vh" : "90vh",
          overflowY: "auto",
        },
      }}
    >
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
                {t("auth.roleLabel")}: {user.profile?.role === "admin" ? t("auth.adminRole") : t("auth.userRole")}
              </Text>
              <Badge
                color={avatarColor}
                variant="light"
                size="sm"
                mt="xs"
              >
                {user.profile?.role === "admin" ? t("auth.adminRole") : t("auth.normalUserRole")}
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
              styles={{
                input: {
                  minHeight: 48,
                  fontSize: 16,
                },
              }}
            />
            <TextInput
              label={t("auth.lastNameLabel")}
              placeholder={t("auth.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              autoComplete="family-name"
              styles={{
                input: {
                  minHeight: 48,
                  fontSize: 16,
                },
              }}
            />
            <TextInput
              label={t("auth.userIdLabel")}
              placeholder={t("auth.userIdPlaceholder")}
              value={userId}
              onChange={(e) => setUserId(e.currentTarget.value)}
              description={t("auth.userIdDescription")}
              disabled={userIdChangeCount >= 3}
              autoComplete="username"
              styles={{
                input: {
                  minHeight: 48,
                  fontSize: 16,
                },
              }}
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
              styles={{
                root: {
                  minHeight: 52,
                  fontSize: 17,
                  fontWeight: 600,
                },
              }}
            >
              {t("auth.saveChanges")}
            </Button>
          </Stack>
        </form>

        <Divider />

        {/* 退出登录按钮 */}
        <Button
          color="blue"
          variant="filled"
          onClick={() => {
            logout();
            onClose();
          }}
          fullWidth
          size="lg"
          sx={{
            minHeight: 52,
            fontSize: 17,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.5)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {t("auth.logout")}
        </Button>
      </Stack>
    </Modal>
  );
}
