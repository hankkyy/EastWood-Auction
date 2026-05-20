import Link from "next/link";
import { Box, Button, Container, createStyles, Group, Overlay, rem, SimpleGrid, Stack, Tabs, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { getKnowledgeBase, fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import type { Artwork } from "@/data/artworks";
import { useEffect, useMemo, useState } from "react";
import { IconDatabaseImport, IconEdit, IconX } from "@tabler/icons-react";
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
      ? `url(https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1400&q=80)` // ✅ 古董商店：中式茶室/古董店风格
      : `url(https://images.unsplash.com/photo-1566054719594-bf2e32c769a2?auto=format&fit=crop&w=1400&q=80)`, // ✅ 藏品展示：中式美学博物馆背景（典雅、明亮）
    minHeight: rem(650),
    backgroundAttachment: "fixed",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(500),
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
      height: rem(500),
      paddingBottom: `calc(${theme.spacing.xl} * 3)`,
    },
  },
  title: {
    color: theme.white,
    fontSize: rem(60),
    fontWeight: 900,
    lineHeight: 1.1,

    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(40),
      lineHeight: 1.2,
    },

    [theme.fn.smallerThan("xs")]: {
      fontSize: rem(28),
      lineHeight: 1.3,
    },
  },
  contentWrapper: {
    backgroundColor: "#181a1b",
    color: theme.colors.dark[0],
    paddingTop: remValue(72),
    paddingBottom: remValue(96),
  },
  tabs: {
    marginBottom: remValue(46),

    ".mantine-Tabs-tabsList": {
      justifyContent: "center",
      borderBottom: "1px solid rgba(246, 239, 227, 0.22)",
      gap: remValue(24),
    },

    ".mantine-Tabs-tab": {
      color: "rgba(246, 239, 227, 0.68)",
      fontSize: remValue(22),
      fontWeight: 700,
      paddingLeft: remValue(4),
      paddingRight: remValue(4),
      paddingBottom: remValue(22),
      borderColor: "transparent",

      "&[data-active]": {
        color: theme.colors.dark[0],
        borderBottomColor: theme.colors.dark[0],
      },
    },
  },

  imageWrap: {
    background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.92))",
    overflow: "hidden",
    height: remValue(420),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: remValue(8), // ✅ 减小内边距（从 16 改为 8），减少灰色留白

    [theme.fn.smallerThan("md")]: {
      height: remValue(320),
      padding: remValue(6), // ✅ 响应式调整（从 12 改为 6）
    },
  },

  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
    transition: "transform 220ms ease, filter 220ms ease",

    "&:hover": {
      transform: "scale(1.025)",
      filter: "brightness(1.08)",
    },

  },

  itemTitle: {
    marginTop: remValue(16), // ✅ 减小上边距（从 18 改为 16）
    textAlign: "center",
    color: theme.colors.dark[0],
    fontSize: remValue(20), // ✅ 进一步减小字体（从 22 改为 20），更加精致
    fontWeight: 800,
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

  // ✅ 优化：仅在初始数据为空时才从本地存储加载
  useEffect(() => {
    // 如果已有初始数据（来自 getStaticProps），不需要重新加载
    if (initialData && initialData.length > 0) {
      return;
    }
    
    // 只有在没有初始数据时才从本地存储加载
    setKnowledgeBaseItems(getKnowledgeBase());
  }, [initialData]);

  // ✅ 监听路由变化，当进入主页面时重置所有模式状态
  useEffect(() => {
    // 当路由为 /collections（不包含子路径如 /collections/[id]）时，重置到浏览模式
    if (router.pathname === '/collections') {
      setShowUploadForm(false);
      setShowManageMode(false);
    }
  }, [router.asPath]); // ✅ 改为监听 asPath，这样即使在同一页面重新导航也会触发

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
      href: `/collections/${item.id}`,
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
        <Container fluid px={72}> {/* ✅ 增加左右内边距 */}
          <Stack spacing="xl">
            {/* ✅ 操作按钮区域 - 仅管理员可见(普通用户不需要看到) */}
            {isAdmin && !showUploadForm && !showManageMode && (
              <Group position="right">
                {/* 上传按钮 - 仅管理员可见 */}
                <Button
                  onClick={handleUploadClick}
                  leftIcon={<IconDatabaseImport size={18} />}
                >
                  {locale === "zh" ? "导入新藏品" : "Import New Collection"}
                </Button>
                
                {/* 管理按钮 - 仅管理员可见 */}
                <Button
                  onClick={handleManageClick}
                  variant="default"
                  leftIcon={<IconEdit size={18} />}
                >
                  {locale === "zh" ? "管理藏品" : "Manage Collections"}
                </Button>
              </Group>
            )}

            {/* 上传表单 - 仅管理员可见 */}
            {showUploadForm && isAdmin && (
              <Box sx={{ width: "100%" }}>
                <CollectionsManagementSection 
                  userId={user?.id} 
                  isAdmin={isAdmin} 
                  embedded={true}
                  onDataUpdate={async () => {
                    // ✅ 保存成功后立即刷新父组件数据
                    try {
                      const updated = await fetchKnowledgeBase();
                      setKnowledgeBaseItems(updated);
                      console.log('[Collections] Data refreshed after upload');
                    } catch (error) {
                      console.error('[Collections] Failed to refresh data:', error);
                    }
                  }}
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
                  onDataUpdate={async () => {
                    // ✅ 保存成功后立即刷新父组件数据
                    try {
                      const updated = await fetchKnowledgeBase();
                      setKnowledgeBaseItems(updated);
                      console.log('[Collections] Data refreshed after edit');
                    } catch (error) {
                      console.error('[Collections] Failed to refresh data:', error);
                    }
                  }}
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
                        sx={{ 
                          marginTop: 64, // ✅ 增加上下间距
                          paddingLeft: 48, // ✅ 增加左边距
                          paddingRight: 48 // ✅ 增加右边距
                        }}
                      >
                        {visibleItems.map((item) => {
                          // 获取原始 artwork 数据以检查 galleryImages
                          const artwork = knowledgeBaseItems.find(a => a.id === item.key);
                          const photoCount = artwork?.galleryImages?.length || 0;
                          
                          return (
                            <Box
                              key={item.key}
                              component={Link}
                              href={item.href}
                              sx={{ textDecoration: "none", display: "block" }}
                            >
                              <Box className={classes.imageWrap} sx={{ position: "relative" }}>
                                <Box component="img" src={item.image} alt={item.title} className={classes.image} />
                                
                                {/* 照片数量提示 */}
                                {photoCount > 1 && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      bottom: 12,
                                      right: 12,
                                      backgroundColor: "rgba(0, 0, 0, 0.75)",
                                      color: "#fff",
                                      padding: "6px 10px",
                                      borderRadius: 6,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      backdropFilter: "blur(4px)",
                                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                                      zIndex: 10
                                    }}
                                  >
                                    📷 {photoCount} {t("collections.photosCount")}
                                  </Box>
                                )}
                              </Box>
                              <Text className={classes.itemTitle}>{item.title}</Text>
                              
                              {/* ✅ 商店模式：在标题下方显示价格（简约灰白色设计） */}
                              {shopMode && artwork?.isForSale && artwork?.price && (
                                <Text 
                                  size="md" // ✅ 进一步减小字体（从 lg 改为 md），更加精致
                                  weight={600} // ✅ 降低字重（从 700 改为 600）
                                  sx={{ 
                                    color: "rgba(246, 239, 227, 0.65)", // ✅ 价格使用更灰的颜色（65%透明度），更加低调
                                    marginTop: 8,
                                    lineHeight: 1.2,
                                    textAlign: "center" // ✅ 与标题保持居中对齐
                                  }}
                                >
                                  {artwork.currency === "CNY" ? "¥" : "$"}{artwork.price.toLocaleString()}
                                </Text>
                              )}
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
