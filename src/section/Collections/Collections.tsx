import Link from "next/link";
import { Box, Button, Container, createStyles, Group, Overlay, rem, SimpleGrid, Stack, Tabs, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import type { Artwork } from "@/data/artworks";
import { primaryActionButtonSx, secondaryActionButtonSx } from "@/components/artworkStyles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconDatabaseImport, IconLayoutList, IconX } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import CollectionsManagementSection from "./CollectionsManagement";
import { useRouter } from "next/router";

const categories = [
  { value: "all", labelKey: "collections.tabAll" },
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

type CollectionCard = {
  key: string;
  image: string;
  title: string;
  category: string;
  href: string;
};

const useStyles = createStyles((theme, { shopMode }: { shopMode: boolean }) => ({
  wrapper: {
    position: "relative",
  },
  bg: {
    backgroundImage: shopMode 
      ? `url(https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1400&q=80)` // ✅ 古董商店：中式茶室/古董店风格
      : `url(https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=1400&q=80)`, // ✅ 藏品展示：典雅的博物馆背景
    backgroundColor: shopMode ? "#2c1810" : "#f5f5f0", // ✅ 添加备用背景色：古董商店深棕色，藏品展示浅米色
    minHeight: rem(650),
    backgroundAttachment: "scroll", // ✅ 改为 scroll 而不是 fixed，避免移动端兼容性问题
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    position: "relative", // ✅ 确保背景层正确定位

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(420),
    },
  },
  heroContainer: {
    height: rem(650),
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingBottom: `calc(${theme.spacing.xl} * 6)`,
    zIndex: 1,
    position: "relative",

    [theme.fn.smallerThan("sm")]: {
      height: rem(420),
      paddingBottom: `calc(${theme.spacing.xl} * 2.25)`,
      paddingLeft: theme.spacing.xs,
      paddingRight: theme.spacing.xs,
    },
  },
  title: {
    color: theme.white,
    fontSize: rem(60),
    fontWeight: 900,
    lineHeight: 1.1,

    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(34),
      lineHeight: 1.15,
      maxWidth: rem(280),
    },

    [theme.fn.smallerThan("xs")]: {
      fontSize: rem(28),
      lineHeight: 1.2,
    },
  },
  contentWrapper: {
    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.violet[0],
    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
    paddingTop: remValue(72),
    paddingBottom: remValue(96),

    [theme.fn.smallerThan("sm")]: {
      paddingTop: remValue(32),
      paddingBottom: remValue(56),
    },
  },
  tabs: {
    marginBottom: remValue(46),

    ".mantine-Tabs-tabsList": {
      justifyContent: "center",
      borderBottom: `1px solid ${theme.colorScheme === "dark" ? "rgba(246, 239, 227, 0.22)" : "rgba(0,0,0,0.12)"}`,
      gap: remValue(24),

      [theme.fn.smallerThan("sm")]: {
        justifyContent: "flex-start",
        flexWrap: "nowrap",
        overflowX: "auto",
        overflowY: "hidden",
        gap: remValue(16),
        paddingBottom: remValue(8),
        scrollbarWidth: "none",
        msOverflowStyle: "none",

        "&::-webkit-scrollbar": {
          display: "none",
        },
      },
    },

    ".mantine-Tabs-tab": {
      color: theme.colorScheme === "dark" ? "rgba(246, 239, 227, 0.68)" : theme.colors.dark[4],
      fontSize: remValue(22),
      fontWeight: 700,
      paddingLeft: remValue(4),
      paddingRight: remValue(4),
      paddingBottom: remValue(22),
      borderColor: "transparent",
      transition: "color 220ms ease, border-color 220ms ease, transform 180ms ease",

      "&[data-active]": {
        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
        borderBottomColor: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
      },

      "&:hover:not([data-active])": {
        color: "#c4a255",
        borderBottomColor: "rgba(196, 162, 85, 0.35)",
        transform: "translateY(-1px)",
      },

      [theme.fn.smallerThan("sm")]: {
        flex: "0 0 auto",
        fontSize: remValue(16),
        paddingBottom: remValue(14),
      },
    },
  },
  actionsRow: {
    [theme.fn.smallerThan("sm")]: {
      width: "100%",
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  contentContainer: {
    [theme.fn.smallerThan("sm")]: {
      paddingLeft: rem(14),
      paddingRight: rem(14),
    },
  },
  gridPanel: {
    marginTop: 64,
    paddingLeft: 48,
    paddingRight: 48,

    [theme.fn.smallerThan("sm")]: {
      marginTop: 20,
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
  cardLink: {
    display: "block",
    textDecoration: "none",
    cursor: "pointer",
    padding: remValue(14),
    borderRadius: remValue(12),
    background: "transparent",
    border: "1px solid transparent",
    boxShadow: "none",
    transition: "transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 280ms ease, box-shadow 320ms ease",

    "&:hover": {
      transform: "translateY(-4px)",
      borderColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.25)" : "rgba(180, 158, 120, 0.25)",
      boxShadow: theme.colorScheme === "dark"
        ? "0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.18)"
        : "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    },

    [theme.fn.smallerThan("sm")]: {
      padding: remValue(12),
      borderRadius: remValue(10),
    },
  },
  itemBody: {
    padding: theme.spacing.md,
    textAlign: "center",
  },

  cardImage: {
    width: "100%",
    height: remValue(320),
    objectFit: "cover",
    objectPosition: "center 15%",
    display: "block",

    [theme.fn.smallerThan("md")]: {
      height: remValue(260),
    },

    [theme.fn.smallerThan("sm")]: {
      height: remValue(220),
    },
  },

  itemTitle: {
    color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
    fontSize: remValue(20),
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.35,
    textAlign: "center",

    [theme.fn.smallerThan("sm")]: {
      fontSize: remValue(17),
    },
  },

  itemPrice: {
    color: "#c4a255",
    fontSize: remValue(15),
    fontWeight: 600,
    letterSpacing: "0.04em",

    [theme.fn.smallerThan("sm")]: {
      fontSize: remValue(14),
    },
  },
}));

function remValue(value: number) {
  return `${value / 16}rem`;
}

const mapArtworkCategory = (artwork: Artwork): string => {
  if (["calligraphy", "misc", "porcelain", "jade", "bronze"].includes(artwork.category)) {
    return artwork.category;
  }

  const category = `${artwork.category} ${artwork.categoryZh ?? ""}`.toLowerCase();
  if (category.includes("jade") || category.includes("玉")) return "jade";
  if (category.includes("bronze") || category.includes("铜")) return "bronze";
  if (category.includes("porcelain") || category.includes("瓷")) return "porcelain";
  if (category.includes("painting") || category.includes("画") || category.includes("calligraphy") || category.includes("书")) return "calligraphy";
  return "misc";
};

interface CollectionsSectionProps {
  initialData?: Artwork[];
  shopMode?: boolean; // ✅ 商店模式：只显示可售藏品
}

export default function Collections({ initialData = [], shopMode = false }: CollectionsSectionProps) {
  const { classes } = useStyles({ shopMode });
  const { t, locale } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  // ✅ 使用初始数据，避免首次加载时的闪烁
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState<Artwork[]>(initialData);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showManageMode, setShowManageMode] = useState(false); // 管理模式状态

  const refreshKnowledgeBase = useCallback(async () => {
    try {
      const data = await fetchKnowledgeBase();
      setKnowledgeBaseItems(data);
    } catch (error) {
      console.error('[Collections] Failed to refresh cloud data:', error);
    }
  }, []);

  const applyArtworkChange = useCallback((change?: Artwork | { deletedId: string }) => {
    if (!change) {
      void refreshKnowledgeBase();
      return;
    }

    if ("deletedId" in change) {
      setKnowledgeBaseItems((prevItems) =>
        prevItems.filter((item) => item.id !== change.deletedId)
      );
      return;
    }

    setKnowledgeBaseItems((prevItems) => [
      change,
      ...prevItems.filter((item) => item.id !== change.id),
    ]);
  }, [refreshKnowledgeBase]);

  // ✅ 云端数据为唯一真源：先显示已有数据，再后台刷新云端
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setKnowledgeBaseItems(initialData);
    }

    void refreshKnowledgeBase();
  }, [initialData, refreshKnowledgeBase]);

  useEffect(() => {
    const handleFocus = () => {
      if (!showUploadForm && !showManageMode) {
        void refreshKnowledgeBase();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshKnowledgeBase, showManageMode, showUploadForm]);

  // ✅ 监听路由变化，当进入主页面时重置所有模式状态
  useEffect(() => {
    // 当路由为 /collections（不包含子路径如 /collections/[id]）时，重置到浏览模式
    if (router.pathname === '/collections') {
      setShowUploadForm(false);
      setShowManageMode(false);
    }
  }, [router.asPath, router.pathname]); // ✅ 改为监听 asPath，这样即使在同一页面重新导航也会触发

  // 检查登录状态并跳转
  const checkAuthAndRedirect = () => {
    if (!user) {
      // 未登录，跳转到登录页面
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return false;
    }
    return true;
  };

  const handleUploadClick = () => {
    if (!checkAuthAndRedirect()) return;
    if (!isAdmin) {
      // 非管理员不能上传
      return;
    }
    setShowUploadForm(true);
    setShowManageMode(false);
  };

  const handleManageClick = () => {
    if (!checkAuthAndRedirect()) return;
    setShowManageMode(true);
    setShowUploadForm(false);
  };

  const cards = useMemo<CollectionCard[]>(() => {
    let filteredItems = knowledgeBaseItems.filter((item) => !item.caseRecord);
    
    // ✅ 商店模式：只显示可售藏品
    if (shopMode) {
      filteredItems = filteredItems.filter((item) => item.isForSale === true);
    }
    
    return filteredItems.map((item) => ({
      key: item.id,
      image: item.image,
      title: locale === "zh" && item.titleZh ? item.titleZh : item.title,
      category: mapArtworkCategory(item),
      href: shopMode ? `/shop/${item.id}` : `/collections/${item.id}`,
    }));
  }, [knowledgeBaseItems, locale, shopMode]);

  return (
    <>
      {/* Hero Section - 标题浮在背景图片左下角 */}
      <Box className={classes.wrapper}>
        <Box className={classes.bg}>
          <Overlay
            gradient="linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, .65) 70%)"
            opacity={1}
            zIndex={0}
          />
          <Container className={classes.heroContainer}>
            <Title className={classes.title}>
              {shopMode ? (locale === "zh" ? "古董商店" : "Antique Shop") : t("collections.exhibitionTitle")}
            </Title>
          </Container>
        </Box>
      </Box>

      {/* Content Section - 上传按钮和藏品列表在图片下面 */}
      <Box className={classes.contentWrapper}>
        <Container fluid px={smallerThan ? 14 : 72} className={classes.contentContainer}>
          <Stack spacing="xl">
            {/* ✅ 操作按钮区域 - 仅管理员可见(普通用户不需要看到) */}
            {isAdmin && !showUploadForm && !showManageMode && (
              <Group position="right" className={classes.actionsRow}>
                {/* 上传按钮 - 仅管理员可见 */}
                <Button
                  onClick={handleUploadClick}
                  leftIcon={<IconDatabaseImport size={18} />}
                  fullWidth={smallerThan}
                  sx={primaryActionButtonSx}
                >
                  {shopMode 
                    ? (locale === "zh" ? "导入新商品" : "Import New Product")
                    : (locale === "zh" ? "导入新藏品" : "Import New Collection")}
                </Button>
                
                {/* 管理按钮 - 仅管理员可见 */}
                <Button
                  onClick={handleManageClick}
                  variant="default"
                  leftIcon={<IconLayoutList size={18} />}
                  fullWidth={smallerThan}
                  sx={secondaryActionButtonSx}
                >
                  {shopMode 
                    ? (locale === "zh" ? "管理商品" : "Manage Products")
                    : (locale === "zh" ? "管理藏品" : "Manage Collections")}
                </Button>

                {/* 导入模拟数据按钮 */}
                <Button
                  onClick={async () => {
                    if (!confirm(locale === "zh" ? "将导入 15 件古董模拟数据，确认？" : "Import 15 antique mock items?")) return;
                    try {
                      const res = await fetch("/api/seed", { method: "POST" });
                      const data = await res.json();
                      alert(data.results?.join("\n") || "Done");
                      window.location.reload();
                    } catch (e: any) {
                      alert("Failed: " + e.message);
                    }
                  }}
                  variant="light"
                  color="yellow"
                  size="sm"
                >
                  {locale === "zh" ? "导入模拟数据" : "Seed Mock Data"}
                </Button>
              </Group>
            )}

            {/* 上传表单 - 仅管理员可见 */}
            {showUploadForm && isAdmin && (
              <Box sx={{ width: "100%" }}>
                <Stack spacing="xs">
                  <Group position="right">
                    <Button
                      variant="filled"
                      color="violet"
                      size="md"
                      onClick={() => {
                        setShowUploadForm(false);
                        setShowManageMode(false);
                      }}
                      leftIcon={<IconX size={18} />}
                      sx={primaryActionButtonSx}
                    >
                      {t("cases.exitOperation")}
                    </Button>
                  </Group>
                  <CollectionsManagementSection 
                    userId={user?.id} 
                    isAdmin={isAdmin} 
                    embedded={true}
                    shopMode={shopMode} // ✅ 传递 shopMode 参数
                    initialItems={knowledgeBaseItems}
                    onDataUpdate={applyArtworkChange}
                    onSuccess={() => {
                      // ✅ 保存成功后自动关闭上传表单
                      setShowUploadForm(false);
                      console.log('[Collections] Upload form closed after success');
                    }}
                    onCancel={async () => {
                      setShowUploadForm(false);
                      setShowManageMode(false);
                      
                      // ✅ 重新从服务器加载最新数据（取消时也需要确保同步）
                      try {
                        const updated = await fetchKnowledgeBase();
                        setKnowledgeBaseItems(updated);
                      } catch (error) {
                        console.error('[Collections] Failed to refresh data:', error);
                      }
                    }}
                  />
                </Stack>
              </Box>
            )}

            {/* 管理模式 - 显示可编辑的藏品列表 */}
            {showManageMode && (
              <Box sx={{ width: "100%" }}>
                <CollectionsManagementSection 
                  userId={user?.id} 
                  isAdmin={isAdmin} 
                  embedded={true}
                  mode="manage"
                  shopMode={shopMode} // ✅ 传递 shopMode 参数
                  initialItems={knowledgeBaseItems}
                  onDataUpdate={applyArtworkChange}
                  onCancel={async () => {
                    setShowManageMode(false);
                    setShowUploadForm(false);
                    
                    // ✅ 重新从服务器加载最新数据（取消时也需要确保同步）
                    try {
                      const updated = await fetchKnowledgeBase();
                      setKnowledgeBaseItems(updated);
                    } catch (error) {
                      console.error('[Collections] Failed to refresh data:', error);
                    }
                  }}
                />
              </Box>
            )}

            {/* 藏品列表 - 仅在非管理/上传模式下显示 */}
            {!showManageMode && !showUploadForm && (
              <Tabs defaultValue="all" className={classes.tabs} variant="outline">
                <Tabs.List>
                  {categories.map((category) => (
                    <Tabs.Tab key={category.value} value={category.value}>
                      {t(category.labelKey)}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>

                {categories.map((category) => {
                  const visibleItems =
                    category.value === "all"
                      ? cards
                      : cards.filter((item) => item.category === category.value);

                  return (
                    <Tabs.Panel key={category.value} value={category.value} pt="xl">
                      <SimpleGrid
                        cols={3}
                        spacing={56} // ✅ 增加左右间距（从 48 改为 56）
                        breakpoints={[
                          { maxWidth: "md", cols: 2, spacing: "lg" },
                          { maxWidth: "sm", cols: 1, spacing: "md" },
                        ]}
                        className={classes.gridPanel}
                      >
                        {visibleItems.map((item) => {
                          // 获取原始 artwork 数据以检查 galleryImages
                          const artwork = knowledgeBaseItems.find(a => a.id === item.key);
                          return (
                            <Box
                              key={item.key}
                              component={Link}
                              href={item.href}
                              className={classes.cardLink}
                            >
                              <Box
                                component="img"
                                src={item.image}
                                alt={item.title}
                                className={classes.cardImage}
                              />
                              <Box className={classes.itemBody}>
                                <Text className={classes.itemTitle}>{item.title}</Text>
                                {shopMode && artwork?.isForSale && artwork?.price ? (
                                  <Text className={classes.itemPrice} mt={6}>
                                    {artwork.currency === "CNY" ? "¥" : "$"}{artwork.price.toLocaleString()}
                                  </Text>
                                ) : null}
                              </Box>
                            </Box>
                          );
                        })}
                      </SimpleGrid>
                    </Tabs.Panel>
                  );
                })}
              </Tabs>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
