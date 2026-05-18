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
import { notifications } from "@mantine/notifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";

interface ProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function ProfileModal({ opened, onClose }: ProfileModalProps) {
  const { user, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setDisplayName(user.profile.display_name || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setLoading(true);
      const result = await updateProfile({
        display_name: displayName,
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
      title="个人资料"
      centered
      size="md"
    >
      <Stack spacing="lg">
        {/* 用户信息卡片 */}
        <Group position="apart" align="flex-start">
          <Group>
            <Avatar color={avatarColor} radius="xl" size="xl">
              {initials}
            </Avatar>
            <div>
              <Text weight={600}>{user.email}</Text>
              <Text size="sm" color="dimmed">
                角色: {user.profile?.role === "admin" ? "管理员" : "个人用户"}
              </Text>
              <Badge
                color={avatarColor}
                variant="light"
                size="sm"
                mt="xs"
              >
                {user.profile?.role === "admin" ? "管理员" : "普通用户"}
              </Badge>
            </div>
          </Group>
        </Group>

        <Divider />

        {/* 编辑表单 */}
        <form onSubmit={handleUpdateProfile}>
          <Stack spacing="md">
            <TextInput
              label="显示名称"
              placeholder="您的昵称"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
            />
            <TextInput
              label="邮箱"
              value={user.email || ""}
              disabled
              description="邮箱不可修改"
            />
            <Button type="submit" loading={loading} fullWidth>
              保存更改
            </Button>
          </Stack>
        </form>

        <Divider />

        {/* 退出登录按钮 */}
        <Button
          color="red"
          variant="outline"
          onClick={() => {
            logout();
            onClose();
          }}
          fullWidth
        >
          退出登录
        </Button>
      </Stack>
    </Modal>
  );
}
