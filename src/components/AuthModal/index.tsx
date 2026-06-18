import { useState } from "react";
import {
  Modal,
  Tabs,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Box,
  CloseButton,
  Group,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { primaryActionButtonSx } from "@/components/artworkStyles";

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function AuthModal({ opened, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { t, locale } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      notifications.show({
        title: t("auth.loginFailed"),
        message: t("auth.fillEmailAndPassword"),
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await login(email, password);
      
      if (result.success) {
        onClose();
        // 清空表单
        setEmail("");
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      notifications.show({
        title: t("auth.registerFailed"),
        message: t("auth.fillEmailAndPassword"),
        color: "red",
      });
      return;
    }

    if (!firstName || !lastName) {
      notifications.show({
        title: t("auth.registerFailed"),
        message: t("auth.fillFirstNameAndLastName"),
        color: "red",
      });
      return;
    }

    if (password.length < 6) {
      notifications.show({
        title: t("auth.registerFailed"),
        message: t("auth.passwordMinLength"),
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await register(email, password, firstName, lastName, userId);
      
      if (result.success) {
        // 注册成功后切换到登录标签
        setActiveTab("login");
        // 清空表单
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
      }
    } finally {
      setLoading(false);
    }
  };

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
      styles={(theme) => ({
        content: {
          borderRadius: isMobile ? 0 : 16,
          padding: 0,
          maxHeight: isMobile ? "100vh" : "90vh",
          overflowY: "auto",
        },
        header: { display: "none" },
      })}
    >
      <Box
        sx={(theme) => ({
          padding: isMobile ? 16 : 24,
          paddingTop: 12,
          backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[1] : "#fffdf9",
          color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
        })}
      >
      <Group position="right" mb="xs">
        <CloseButton
          onClick={onClose}
          size="md"
          sx={(theme) => ({
            color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
          })}
        />
      </Group>
      <Stack spacing="md">
      <Tabs value={activeTab} onTabChange={(tab) => setActiveTab(tab as "login" | "register")}>
        <Tabs.List grow mb="lg">
          <Tabs.Tab 
            value="login"
            styles={(theme) => ({
              tab: {
                fontSize: 16,
                fontWeight: 600,
                padding: "12px 16px",
                minHeight: 48,
                color: theme.colorScheme === "dark"
                  ? (activeTab === "login" ? theme.colors.dark[9] : theme.colors.dark[5])
                  : (activeTab === "login" ? theme.colors.dark[0] : theme.colors.dark[4]),
              },
            })}
          >
            {t("auth.login")}
          </Tabs.Tab>
          <Tabs.Tab 
            value="register"
            styles={(theme) => ({
              tab: {
                fontSize: 16,
                fontWeight: 600,
                padding: "12px 16px",
                minHeight: 48,
                color: theme.colorScheme === "dark"
                  ? (activeTab === "register" ? theme.colors.dark[9] : theme.colors.dark[5])
                  : (activeTab === "register" ? theme.colors.dark[0] : theme.colors.dark[4]),
              },
            })}
          >
            {t("auth.register")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" pt="md">
          <form onSubmit={handleLogin}>
            <Stack spacing="md" pb={isMobile ? 12 : 0}>
              <TextInput
                label={t("auth.emailLabel")}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
                autoComplete="email"
                styles={{
                  input: {
                    minHeight: 48, // 增大输入框高度
                    fontSize: 16, // 防止 iOS 自动缩放
                  },
                }}
              />
              <PasswordInput
                label={t("auth.passwordLabel")}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                styles={{
                  input: {
                    minHeight: 48,
                    fontSize: 16,
                  },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <Text size="xs" color="dimmed">
                  {locale === "zh" ? "密码区分大小写" : "Passwords are case-sensitive"}
                </Text>
                <Text size="xs" color="dimmed">
                  {locale === "zh" ? "登录后可在头像里编辑资料" : "You can edit your profile after signing in"}
                </Text>
              </Box>
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
                {t("auth.login")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="md">
          <form onSubmit={handleRegister}>
            <Stack spacing="md" pb={isMobile ? 12 : 0}>
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
                autoComplete="username"
                styles={{
                  input: {
                    minHeight: 48,
                    fontSize: 16,
                  },
                }}
              />
              <TextInput
                label={t("auth.emailLabel")}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
                autoComplete="email"
                styles={{
                  input: {
                    minHeight: 48,
                    fontSize: 16,
                  },
                }}
              />
              <PasswordInput
                label={t("auth.passwordLabel")}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="new-password"
                styles={{
                  input: {
                    minHeight: 48,
                    fontSize: 16,
                  },
                }}
              />
              <Text size="xs" color="dimmed" sx={{ marginTop: -8 }}>
                {t("auth.passwordRequirement")}
              </Text>
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
                {t("auth.register")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
      </Stack>
      </Box>
    </Modal>
  );
}
