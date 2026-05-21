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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";

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
      title={t("auth.modalTitle")}
      centered
      size="md"
      closeOnClickOutside={false} // 禁止点击外部关闭
      fullScreen={isMobile}
      transitionProps={{ transition: "fade", duration: 200 }}
      styles={{
        content: {
          borderRadius: isMobile ? 0 : 16,
          padding: isMobile ? 16 : 24,
          maxHeight: isMobile ? "100vh" : "90vh",
          overflowY: "auto",
        },
        header: {
          marginBottom: 16,
        },
      }}
    >
      <Stack spacing="md">
      <Tabs value={activeTab} onTabChange={(tab) => setActiveTab(tab as "login" | "register")}>
        <Tabs.List grow mb="lg">
          <Tabs.Tab 
            value="login"
            styles={{
              tab: {
                fontSize: 16,
                fontWeight: 600,
                padding: "12px 16px",
                minHeight: 48, // 增大触摸区域
              },
            }}
          >
            {t("auth.login")}
          </Tabs.Tab>
          <Tabs.Tab 
            value="register"
            styles={{
              tab: {
                fontSize: 16,
                fontWeight: 600,
                padding: "12px 16px",
                minHeight: 48, // 增大触摸区域
              },
            }}
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
                styles={{
                  root: {
                    minHeight: 52, // 增大按钮高度
                    fontSize: 17,
                    fontWeight: 600,
                  },
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
                styles={{
                  root: {
                    minHeight: 52,
                    fontSize: 17,
                    fontWeight: 600,
                  },
                }}
              >
                {t("auth.register")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
      </Stack>
    </Modal>
  );
}
