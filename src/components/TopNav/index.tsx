import {
  Box,
  Burger,
  Button,
  ButtonProps,
  createStyles,
  Divider,
  Drawer,
  Group,
  Header,
  rem,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  Avatar,
  Menu,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import LanguagePicker from "@/components/LanguagePicker";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { notifications } from "@mantine/notifications";
import { IconInbox } from "@tabler/icons-react";
import AuthModal from "@/components/AuthModal";
import ProfileModal from "@/components/ProfileModal";

const useStyles = createStyles((theme) => ({
  header: {
    border: "none",
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: "rgba(15, 18, 22, 0.96)",
    color: theme.white,
    backdropFilter: "blur(12px)",
  },
  link: {
    color: theme.colors.dark[0],
    [theme.fn.smallerThan("sm")]: {},

    ...theme.fn.hover({
      backgroundColor: theme.colors.dark[6],
      color: theme.colors.violet[7],
    }),
  },
  activeLink: {
    color: theme.colors.violet[7],
    backgroundColor: "rgba(216, 183, 109, 0.12)",
    borderBottom: `2px solid ${theme.colors.violet[7]}`,

    ...theme.fn.hover({
      borderRadius: theme.radius.sm,
      backgroundColor: "rgba(216, 183, 109, 0.16)",
    }),

    [theme.fn.smallerThan("md")]: {
      color: theme.colors.violet[7],
    },
  },
  hiddenMobile: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },
  hiddenTablet: {
    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },
  hiddenDesktop: {
    [theme.fn.largerThan("md")]: {
      display: "none",
    },
  },
  brandButton: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  brandMark: {
    width: rem(38),
    height: rem(38),
    flex: "0 0 auto",
    objectFit: "cover",
    borderRadius: theme.radius.sm,
    border: "1px solid rgba(216, 183, 109, 0.24)",
    [theme.fn.smallerThan("sm")]: {
      width: rem(32),
      height: rem(32),
    },
  },
  brandText: {
    color: theme.white,
    fontSize: rem(28),
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(21),
    },
  },
}));

const mockdata = [
  {
    labelKey: "nav.exhibitions",
    link: "/exhibitions",
  },
  {
    labelKey: "nav.collections",
    link: "/collections",
  },
  {
    labelKey: "nav.shop",
    link: "/shop",
  },
  {
    labelKey: "nav.support",
    link: "/cases",
  },
  {
    labelKey: "nav.search",
    link: "/search",
  },
] as const;

export default function TopNav() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [authModalOpened, { open: openAuthModalRaw, close: closeAuthModal }] =
    useDisclosure(false);
  const [profileModalOpened, { open: openProfileModalRaw, close: closeProfileModal }] =
    useDisclosure(false);
  
  // 自定义的 openAuthModal 函数：打开模态框时自动关闭 Drawer
  const openAuthModal = () => {
    closeDrawer(); // 先关闭移动端菜单
    openAuthModalRaw(); // 再打开登录模态框
  };
  
  // 自定义的 openProfileModal 函数：打开模态框时自动关闭 Drawer
  const openProfileModal = () => {
    closeDrawer(); // 先关闭移动端菜单
    openProfileModalRaw(); // 再打开个人资料模态框
  };
  
  const { classes, cx, theme } = useStyles();
  const router = useRouter();
  const { t } = useI18n();
  
  // 直接使用 useAuth hook
  const { user, loading, roleLoading, logout, isAdmin } = useAuth();
  const authReady = !loading && !roleLoading;

  const handleInquiryClick = () => {
    closeDrawer();

    if (!authReady) {
      return;
    }

    if (!user) {
      void router.push("/inquiries?authRequired=1");
      return;
    }

    if (isAdmin) {
      notifications.show({
        title: t("inquiry.adminBlockedTitle"),
        message: t("inquiry.adminBlockedMessage"),
        color: "yellow",
      });
      void router.push("/inbox");
      return;
    }

    void router.push("/inquiries");
  };

  const handleInboxClick = () => {
    closeDrawer();

    if (!authReady) {
      return;
    }

    if (!user) {
      notifications.show({
        title: t("inbox.loginRequiredTitle"),
        message: t("inbox.loginRequiredMessage"),
        color: "yellow",
      });
      void router.push("/inbox");
      return;
    }

    void router.push("/inbox");
  };

  const urlResolver = (url: string): boolean => {
    return router.pathname === url;
  };

  const buttonProps: ButtonProps = {
    variant: "subtle",
    size: "md",
  };

  const links = mockdata.map((item) => (
    <Button
      className={urlResolver(item.link) ? classes.activeLink : classes.link}
      key={item.link}
      component={Link}
      href={item.link}
      {...buttonProps}
    >
      {t(item.labelKey)}
    </Button>
  ));

  // 用户菜单渲染
  const renderUserMenu = () => {
    // 加载中状态：显示占位符，避免 Hydration 错误
    if (!authReady) {
      return (
        <Avatar
          color="gray"
          radius="xl"
          size="md"
          sx={{ cursor: "default", opacity: 0.5 }}
        >
          ...
        </Avatar>
      );
    }

    if (!user) {
      return (
        <Button onClick={openAuthModal} variant="filled" color="violet">
          {t("auth.loginRegister")}
        </Button>
      );
    }

    // 已登录，显示用户头像和菜单
    const initials = user.email
      ? user.email.substring(0, 2).toUpperCase()
      : "U";
    const avatarColor = isAdmin ? "red" : "blue";

    return (
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <UnstyledButton>
            <Avatar
              color={avatarColor}
              radius="xl"
              size="md"
              sx={{ cursor: "pointer" }}
            >
              {initials}
            </Avatar>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            {user.email}
            {isAdmin && (
              <Text size="xs" color="red" weight={600}>
                {t("auth.roleLabel")}: {t("auth.adminRole")}
              </Text>
            )}
          </Menu.Label>
          <Menu.Item onClick={openProfileModal}>{t("auth.profileTitle")}</Menu.Item>
          {isAdmin && (
            <Menu.Item component={Link} href="/admin">
              {t("auth.adminBackend")}
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item 
            color="blue" 
            onClick={() => logout()}
            sx={{
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              },
            }}
          >
            {t("auth.logout")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  };

  return (
    <Box>
      <Header height="100%" px="md" className={classes.header}>
        <Group position="apart" sx={{ height: "100%" }}>
          <UnstyledButton
            component={Link}
            href="/"
            className={classes.brandButton}
            aria-label={t("common.brand")}
          >
            <Box
              component="img"
              src="/eastwood-logo-mark.png"
              alt=""
              className={classes.brandMark}
            />
            <Text component="span" className={classes.brandText}>
              {t("common.brand")}
            </Text>
          </UnstyledButton>

          <Group
            sx={{ height: "100%" }}
            spacing="xs"
            className={classes.hiddenTablet}
          >
            {links}
            {renderUserMenu()}
          </Group>

          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            className={classes.hiddenDesktop}
            title={t("nav.openMenu")}
          />
        </Group>
      </Header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title={t("common.brand")}
        className={classes.hiddenDesktop}
        zIndex={1000000}
        position="right"
        withCloseButton
        transitionProps={{ transition: "slide-left", duration: 300 }}
        overlayProps={{ opacity: 0.6, blur: 4 }}
      >
        <ScrollArea h={`calc(100vh - ${rem(80)})`} mx="-md" type="auto">
          <Stack spacing="lg" px="md" py="md">
            {/* 主要导航链接 - 增大触摸区域 */}
            {links.map((link, index) => (
              <Box key={index}>
                {React.cloneElement(link as React.ReactElement<any>, {
                  size: "lg",
                  fullWidth: true,
                  styles: {
                    root: {
                      minHeight: 56, // 最小触摸高度
                      fontSize: 18,
                      justifyContent: "flex-start",
                      paddingLeft: 16,
                    },
                  },
                })}
              </Box>
            ))}
            
            <Divider
              my="sm"
              color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
            />
            
            {/* 辅助操作按钮 */}
            <Stack spacing="md">
              <Button
                variant="light"
                color="yellow"
                fullWidth
                size="md"
                onClick={handleInquiryClick}
              >
                {t("inquiry.entryButton")}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                size="md"
                onClick={handleInboxClick}
                leftIcon={<IconInbox size={18} />}
              >
                {t("inbox.pageTitle")}
              </Button>
              {/* 语言选择器 */}
              <Box sx={{ marginTop: 8 }}>
                <LanguagePicker mobile />
              </Box>
              
              {/* 用户菜单 */}
              <Box sx={{ marginTop: 8 }}>
                {renderUserMenu()}
              </Box>
            </Stack>
          </Stack>
        </ScrollArea>
      </Drawer>

      {/* 认证模态框 */}
      <AuthModal opened={authModalOpened} onClose={closeAuthModal} />
      
      {/* 个人资料模态框 */}
      <ProfileModal opened={profileModalOpened} onClose={closeProfileModal} />
    </Box>
  );
}
