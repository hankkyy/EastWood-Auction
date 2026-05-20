import { useState } from "react";
import {
  Modal,
  Tabs,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Group,
} from "@mantine/core";
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
  const { t } = useI18n();

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
      } else {
        notifications.show({
          title: t("auth.loginFailed"),
          message: result.error || t("auth.loginError"),
          color: "red",
        });
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
        notifications.show({
          title: "提示",
          message: "注册成功！请登录",
          color: "green",
        });
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
    >
      <Tabs value={activeTab} onTabChange={(tab) => setActiveTab(tab as "login" | "register")}>
        <Tabs.List grow>
          <Tabs.Tab value="login">{t("auth.login")}</Tabs.Tab>
          <Tabs.Tab value="register">{t("auth.register")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" pt="md">
          <form onSubmit={handleLogin}>
            <Stack spacing="md">
              <TextInput
                label={t("auth.emailLabel")}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />
              <PasswordInput
                label={t("auth.passwordLabel")}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              <Button type="submit" loading={loading} fullWidth>
                {t("auth.login")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="md">
          <form onSubmit={handleRegister}>
            <Stack spacing="md">
              <TextInput
                label={t("auth.firstNameLabel")}
                placeholder={t("auth.firstNamePlaceholder")}
                value={firstName}
                onChange={(e) => setFirstName(e.currentTarget.value)}
                required
              />
              <TextInput
                label={t("auth.lastNameLabel")}
                placeholder={t("auth.lastNamePlaceholder")}
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
                required
              />
              <TextInput
                label={t("auth.userIdLabel")}
                placeholder={t("auth.userIdPlaceholder")}
                value={userId}
                onChange={(e) => setUserId(e.currentTarget.value)}
                description={t("auth.userIdDescription")}
              />
              <TextInput
                label={t("auth.emailLabel")}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />
              <PasswordInput
                label={t("auth.passwordLabel")}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              <Text size="xs" color="dimmed">
                {t("auth.passwordRequirement")}
              </Text>
              <Button type="submit" loading={loading} fullWidth>
                {t("auth.register")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
