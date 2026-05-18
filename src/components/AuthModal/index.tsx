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

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function AuthModal({ opened, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      notifications.show({
        title: "错误",
        message: "请填写邮箱和密码",
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
        title: "错误",
        message: "请填写邮箱和密码",
        color: "red",
      });
      return;
    }

    if (password.length < 6) {
      notifications.show({
        title: "错误",
        message: "密码长度至少为6位",
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await register(email, password, displayName);
      
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
        setDisplayName("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="用户认证"
      centered
      size="md"
      closeOnClickOutside={false} // 禁止点击外部关闭
    >
      <Tabs value={activeTab} onTabChange={(tab) => setActiveTab(tab as "login" | "register")}>
        <Tabs.List grow>
          <Tabs.Tab value="login">登录</Tabs.Tab>
          <Tabs.Tab value="register">注册</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" pt="md">
          <form onSubmit={handleLogin}>
            <Stack spacing="md">
              <TextInput
                label="邮箱"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />
              <PasswordInput
                label="密码"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              <Button type="submit" loading={loading} fullWidth>
                登录
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="md">
          <form onSubmit={handleRegister}>
            <Stack spacing="md">
              <TextInput
                label="显示名称（可选）"
                placeholder="您的昵称"
                value={displayName}
                onChange={(e) => setDisplayName(e.currentTarget.value)}
              />
              <TextInput
                label="邮箱"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />
              <PasswordInput
                label="密码"
                placeholder="至少6位字符"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              <Text size="xs" color="dimmed">
                密码长度至少为6位
              </Text>
              <Button type="submit" loading={loading} fullWidth>
                注册
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
