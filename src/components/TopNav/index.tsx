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
import React, { useCallback, useEffect } from "react";
import LanguagePicker from "@/components/LanguagePicker";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { notifications } from "@mantine/notifications";
import { IconInbox, IconMessageCircle } from "@tabler/icons-react";
import AuthModal from "@/components/AuthModal";
import ProfileModal from "@/components/ProfileModal";

const useStyles = createStyles((theme) => ({
  header: {
    border: "none",
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: "transparent",
    color: theme.colors.dark[9],
  },
  link: {
    color: theme.colors.dark[7],
    [theme.fn.smallerThan("sm")]: {},

    ...theme.fn.hover({
      backgroundColor: theme.colors.dark[0],
      color: theme.colors.violet[7],
    }),
  },
  activeLink: {
    color: theme.colors.violet[7],
    backgroundColor: "transparent",
    borderBottom: `1px solid ${theme.colors.violet[7]}`,

    ...theme.fn.hover({
      borderRadius: 2,
      backgroundColor: "rgba(180,150,100,0.06)",
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
  mobileHeaderActions: {
    gap: theme.spacing.xs,
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
  drawerBody: {
    paddingBottom: `calc(${theme.spacing.xl} * 2 + env(safe-area-inset-bottom, 0px))`,
  },
}));

const mockdata = [
  // Auctions hidden — not ready for launch
  // { labelKey: "nav.exhibitions", link: "/exhibitions" },
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
  const openAuthModal = useCallback(() => {
    closeDrawer(); // 先关闭移动端菜单
    openAuthModalRaw(); // 再打开登录模态框
  }, [closeDrawer, openAuthModalRaw]);
  
  // 自定义的 openProfileModal 函数：打开模态框时自动关闭 Drawer
  const openProfileModal = useCallback(() => {
    closeDrawer(); // 先关闭移动端菜单
    openProfileModalRaw(); // 再打开个人资料模态框
  }, [closeDrawer, openProfileModalRaw]);
  
  const { classes, cx, theme } = useStyles();
  const router = useRouter();
  const { t, locale } = useI18n();
  
  // 直接使用 useAuth hook
  const { user, loading, roleLoading, logout, isAdmin } = useAuth();
  const authReady = !loading && !roleLoading;

  useEffect(() => {
    const handleOpenAuthModal = () => {
      openAuthModal();
    };

    window.addEventListener("open-auth-modal", handleOpenAuthModal as EventListener);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuthModal as EventListener);
  }, [openAuthModal]);

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

  const handleAdminClick = () => {
    closeDrawer();

    if (!authReady || !user || !isAdmin) {
      return;
    }

    void router.push("/admin");
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
  const renderUserMenu = (mobile = false) => {
    // 加载中状态：显示占位符，避免 Hydration 错误
    if (!authReady) {
      return (
        <Avatar
          color="gray"
          radius="xl"
          size={mobile ? "sm" : "md"}
          sx={{ cursor: "default", opacity: 0.5 }}
        >
          ...
        </Avatar>
      );
    }

    if (!user) {
      return (
        <Button
          onClick={openAuthModal}
          variant="filled"
          color="violet"
          fullWidth={mobile}
          size={mobile ? "sm" : "md"}
        >
          {mobile ? (locale === "zh" ? "登录" : "Sign in") : t("auth.loginRegister")}
        </Button>
      );
    }

    // 已登录，显示用户头像和菜单
    const initials = user.email
      ? user.email.substring(0, 2).toUpperCase()
      : "U";
    const avatarColor = isAdmin ? "red" : "blue";

    if (mobile) {
      return (
        <Stack spacing="sm" align="center">
          <Group noWrap align="center" spacing="sm" position="center">
            <Avatar
              color={avatarColor}
              radius="xl"
              size="md"
              sx={{ flex: "0 0 auto" }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, textAlign: "left" }}>
              <Text
                size="sm"
                weight={600}
                sx={{ wordBreak: "break-word", lineHeight: 1.35 }}
              >
                {user.email}
              </Text>
              {isAdmin && (
                <Text size="xs" color="red" weight={600} mt={4} sx={{ lineHeight: 1.3 }}>
                  {t("auth.roleLabel")}: {t("auth.adminRole")}
                </Text>
              )}
            </Box>
          </Group>
          <Button
            variant="filled"
            color="yellow"
            fullWidth
            onClick={openProfileModal}
            sx={{
              color: "#1b1f24",
              fontWeight: 700,
              boxShadow: "0 8px 18px rgba(216, 183, 109, 0.28)",
              "&:hover": {
                backgroundColor: "#e3c989",
                boxShadow: "0 10px 22px rgba(216, 183, 109, 0.36)",
              },
            }}
          >
            {t("auth.profileTitle")}
          </Button>
          {isAdmin && (
            <Button
              variant="light"
              color="red"
              fullWidth
              onClick={handleAdminClick}
            >
              {t("auth.adminBackend")}
            </Button>
          )}
          <Button
            color="blue"
            variant="filled"
            fullWidth
            onClick={() => void logout()}
            sx={{
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
              },
            }}
          >
            {t("auth.logout")}
          </Button>
        </Stack>
      );
    }

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
            <Menu.Item onClick={handleAdminClick}>
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

          <Group noWrap className={cx(classes.hiddenDesktop, classes.mobileHeaderActions)}>
            {authReady && user ? (
              <UnstyledButton
                onClick={openProfileModal}
                aria-label={t("auth.profileTitle")}
              >
                <Avatar color={isAdmin ? "red" : "blue"} radius="xl" size="sm">
                  {user.email ? user.email.substring(0, 2).toUpperCase() : "U"}
                </Avatar>
              </UnstyledButton>
            ) : (
              renderUserMenu(true)
            )}
            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              title={t("nav.openMenu")}
            />
          </Group>
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
        styles={{
          body: {
            paddingBottom: `calc(${rem(24)} + env(safe-area-inset-bottom, 0px))`,
          },
        }}
      >
        <ScrollArea h={`calc(100vh - ${rem(80)})`} mx="-md" type="auto" className={classes.drawerBody}>
          <Stack spacing="lg" px="md" py="md">
            {authReady && user && (
              <>
                <Box sx={{ paddingTop: 4, paddingBottom: 4 }}>
                  {renderUserMenu(true)}
                </Box>
                <Divider
                  my="xs"
                  color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
                />
              </>
            )}

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
                leftIcon={<IconMessageCircle size={18} />}
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
            </Stack>
          </Stack>
        </ScrollArea>
      </Drawer>

      {/* 认证模态框 */}
      <AuthModal opened={authModalOpened} onClose={closeAuthModal} />
      
      {/* 个人资料模态框 */}
      <ProfileModal
        opened={profileModalOpened}
        onClose={closeProfileModal}
        userOverride={user}
        isAdminOverride={isAdmin}
        roleLoadingOverride={roleLoading}
        logoutOverride={logout}
      />
    </Box>
  );
}
