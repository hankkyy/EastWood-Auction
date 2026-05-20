import Link from "next/link";
import {
  deleteImportedArtwork,
  fetchKnowledgeBase,
  saveImportedArtwork,
  updateImportedArtwork,
} from "@/features/image-search/artworkKnowledgeBase";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import type { Artwork, ArtworkCaseRecord } from "@/data/artworks";
import { useRouter } from "next/router"; // ✅ 导入 useRouter
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconCheck,
  IconDatabaseImport,
  IconLayoutList,
  IconLock,
  IconPhoto,
  IconPlus,
  IconStar,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, useRef } from "react";
import CasesManagementSection from "./CasesManagement"; // 导入管理组件

interface CasesSectionProps {
  initialData?: Artwork[];
}

export default function CasesSection({ initialData = [] }: CasesSectionProps) {
  const { locale, t } = useI18n();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter(); // ✅ 获取 router 实例
  // ✅ 使用初始数据，避免首次加载时的闪烁
  const [items, setItems] = useState<Artwork[]>(initialData);
  const [isLoading, setIsLoading] = useState(false); // ✅ 初始为 false，因为已有数据
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 多图片上传状态
  const [adminImages, setAdminImages] = useState<string[]>([]); // 所有图片URL数组
  const [adminCoverIndex, setAdminCoverIndex] = useState<number>(0); // 封面照片索引
  
  // 管理状态
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showManageMode, setShowManageMode] = useState(false); // ✅ 新增管理模式状态
  
  // ✅ 监听路由变化，当进入主页面时重置所有模式状态
  useEffect(() => {
    // 当路由为 /cases（不包含子路径如 /cases/[id]）时，重置到浏览模式
    if (router.pathname === '/cases') {
      setShowUploadForm(false);
      setShowManageMode(false);
    }
  }, [router.asPath]); // ✅ 改为监听 asPath，这样即使在同一页面重新导航也会触发
  
  // 辅助函数：检查权限并处理重定向（如果需要）
  // 注意：如果项目中 checkAuthAndRedirect 是全局或 hook 的一部分，请替换为实际调用
  // 这里我们基于现有的 useAuth 简单实现逻辑判断
  const checkAuthAndRedirect = () => {
    if (!user) {
      // 可以根据需要添加重定向逻辑，例如 router.push('/login')
      // 目前仅依靠 UI 状态控制，因为原代码也是通过 user 状态控制显示
      return false;
    }
    return true;
  };

  const handleUploadClick = () => {
    if (!checkAuthAndRedirect()) return;
    setShowUploadForm(true);
    setShowManageMode(false); // ✅ 关闭管理模式
  };

  const handleManageClick = () => {
    if (!checkAuthAndRedirect()) return;
    setShowManageMode(true); // ✅ 开启管理模式
    setShowUploadForm(false); // ✅ 关闭上传模式
  };

  const [adminCaseName, setAdminCaseName] = useState(""); // ✅ 案例名称(必填)
  const [adminItemDetails, setAdminItemDetails] = useState("");
  const [adminCaseId, setAdminCaseId] = useState("");
  const [adminSalePrice, setAdminSalePrice] = useState("");
  const [adminSaleTime, setAdminSaleTime] = useState("");
  const [adminSalePlatform, setAdminSalePlatform] = useState("");
  const [adminClientRegion, setAdminClientRegion] = useState("");
  const [adminLogisticsCost, setAdminLogisticsCost] = useState("");
  const [adminPurchaseChannel, setAdminPurchaseChannel] = useState("");
  const [adminPurchaseCost, setAdminPurchaseCost] = useState("");
  const [adminRiskAdvice, setAdminRiskAdvice] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  
  // ✅ 移除主展示页面的编辑功能,编辑只在管理模式中进行

  // ✅ 优化：仅在初始数据为空时才从 API 加载，避免不必要的网络请求
  useEffect(() => {
    // 如果已有初始数据（来自 getStaticProps），不需要重新加载
    if (initialData && initialData.length > 0) {
      setIsLoading(false);
      return;
    }
    
    // 只有在没有初始数据时才从 API 加载
    void fetchKnowledgeBase().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [initialData]);

  // 根据用户角色过滤回流案例列表
  const cases = useMemo(() => {
    return items.filter((item) => {
      // 只过滤掉没有 caseRecord 的数据
      if (!item.caseRecord) return false;
      return true;
    });
  }, [items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      // ✅ 所有用户(包括未登录)都能看到所有回流案例
      return true;
    });
  }, [items]);

  const handleAdminUpload = async (files: File[] | null) => {
    console.log('[Cases] handleAdminUpload called with files:', files);
    if (!files || files.length === 0) {
      console.log('[Cases] No files selected');
      return;
    }
    
    console.log('[Cases] Processing', files.length, 'files');
    
    try {
      // ✅ 将文件转换为 Base64 Data URL (而不是 Blob URL)
      const newUrls = await Promise.all(
        files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      console.log('[Cases] Created Base64 URLs:', newUrls.length, 'images');
      
      // 追加到现有图片数组（而不是替换）
      setAdminImages(prevImages => {
        const updatedImages = [...prevImages, ...newUrls];
        console.log('[Cases] Updated images count:', updatedImages.length);
        return updatedImages;
      });
      
      // 如果是第一次上传，设置封面索引为 0
      if (adminImages.length === 0) {
        setAdminCoverIndex(0);
      }
      
      setAdminError(null);
    } catch (error) {
      console.error('[Cases] Failed to convert images to base64:', error);
      setAdminError(t("cases.imageConversionFailed"));
    }
  };

  const handleSetCoverImage = (index: number) => {
    setAdminCoverIndex(index);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = adminImages.filter((_, i) => i !== index);
    setAdminImages(newImages);
    // 如果删除的是封面，重置封面索引
    if (index === adminCoverIndex) {
      setAdminCoverIndex(0);
    } else if (index < adminCoverIndex) {
      setAdminCoverIndex(adminCoverIndex - 1);
    }
  };

  const resetForm = () => {
    // 释放 URL 对象
    adminImages.forEach(url => URL.revokeObjectURL(url));
    setAdminImages([]);
    setAdminCoverIndex(0);
    setAdminCaseName(""); // ✅ 重置案例名称
    setAdminItemDetails("");
    setAdminCaseId("");
    setAdminSalePrice("");
    setAdminSaleTime("");
    setAdminSalePlatform("");
    setAdminClientRegion("");
    setAdminLogisticsCost("");
    setAdminPurchaseChannel("");
    setAdminPurchaseCost("");
    setAdminRiskAdvice("");
    setManageMessage(null); // 清除成功消息
    setShowUploadForm(false);
  };

  const handleSaveToKnowledgeBase = async () => {
    if (adminImages.length === 0) {
      setAdminError(t("cases.atLeastOneImage"));
      return;
    }

    if (!user) {
      setAdminError(locale === "zh" ? "请先登录" : "Please login first");
      return;
    }

    try {
      // ✅ 验证案例名称必填
      if (!adminCaseName.trim()) {
        setAdminError(t("cases.pleaseEnterCaseName"));
        return;
      }

      // ✅ 自动生成案例编号(如果用户未填写)
      const generatedCaseId = adminCaseId || `CASE-${Date.now()}`;
      
      const caseRecord: ArtworkCaseRecord = {
        caseId: generatedCaseId,
        salePrice: adminSalePrice || "",
        saleTime: adminSaleTime || "",
        salePlatform: adminSalePlatform || "",
        clientRegion: adminClientRegion || "",
        logisticsCost: adminLogisticsCost || "",
        purchaseChannel: adminPurchaseChannel || "",
        purchaseCost: adminPurchaseCost || "",
        riskAdvice: adminRiskAdvice || "",
      };

      // 使用选定的封面作为主图，所有图片放入 galleryImages
      const coverImage = adminImages[adminCoverIndex];
      
      const newArtwork: Artwork = {
        id: `imported-${Date.now()}`,
        title: adminCaseName, // ✅ 使用独立的案例名称字段
        category: "misc",
        period: "",
        image: coverImage,
        galleryImages: adminImages,
        description: adminItemDetails || "", // ✅ 描述使用详情字段
        listingType: "product",
        caseRecord,
        uploadedBy: user.id, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0],
      };

      await saveImportedArtwork(newArtwork);

      setManageMessage(t("cases.importSuccess"));
      resetForm();
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || t("cases.importFailed"));
    }
  };

  const handleDeleteImportedArtwork = async (id: string) => {
    if (!confirm(t("cases.deleteConfirm"))) return;
    try {
      await deleteImportedArtwork(id);
      setManageMessage(t("cases.deleteSuccess"));
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || t("cases.deleteFailed"));
    }
  };

  // 检查当前用户是否可以编辑该案例
  const canEdit = (artwork: Artwork) => {
    if (!user) return false;
    // 管理员可以编辑所有案例
    if (isAdmin) return true;
    // 普通用户只能编辑自己的案例
    return artwork.uploadedBy === user.id;
  };

  // 获取上传者显示名称
  const getUploaderInfo = (artwork: Artwork) => {
    // 如果没有上传者信息，返回 null
    if (!artwork.uploadedBy) return null;
    
    // 只有管理员可以看到具体用户信息
    if (isAdmin) {
      // 如果是自己上传的
      if (artwork.uploadedBy === user?.id) {
        return t("cases.meAdmin");
      }
      
      // 如果有 uploaderName（user_id），显示它；否则显示"其他用户"
      if ((artwork as any).uploaderName) {
        return (artwork as any).uploaderName;
      }
      
      return t("cases.otherUser");
    }
    
    // 普通用户和未登录用户只能看到通用提示
    return locale === "zh" ? "个人上传" : "Personal Upload";
  };

  // 数据或认证加载中，显示统一的 Loading 状态
  if (isLoading || authLoading) {
    return (
      <Container fluid pt={80} pb={120}>
        <Text align="center">{t("cases.loading")}</Text>
      </Container>
    );
  }

  return (
    <Container fluid pt={80} pb={120}>
      <Stack spacing="xl">
        {/* 标题和操作按钮 */}
        <Group position="apart">
          <Box>
            <Title order={2}>{t("support.caseTitle")}</Title>
            {user && !isAdmin && (
              <Text size="sm" color="dimmed" mt={4}>
                {t("cases.personalUserModeText")}
              </Text>
            )}
            {isAdmin && (
              <Text size="sm" color="dimmed" mt={4}>
                {t("cases.adminModeText")}
              </Text>
            )}
          </Box>
          <Group spacing="sm">
            {/* ✅ 上传按钮 - 所有登录用户可见(回流案例允许普通用户上传) */}
            {user && !showUploadForm && !showManageMode && (
              <>
                <Button
                  onClick={handleUploadClick}
                  leftIcon={<IconDatabaseImport size={18} />}
                >
                  {t("cases.uploadNewCaseButton")}
                </Button>
                
                {/* 管理按钮 - 所有登录用户可见 */}
                <Button
                  variant={isAdmin ? "default" : "filled"}
                  color={isAdmin ? undefined : "violet"}
                  onClick={handleManageClick}
                  leftIcon={<IconLayoutList size={18} />}
                >
                  {t("cases.manageCasesButton")}
                </Button>
              </>
            )}
            {(showUploadForm || showManageMode) && (
              <Button
                variant="subtle"
                onClick={() => {
                  setShowUploadForm(false);
                  setShowManageMode(false);
                }}
                leftIcon={<IconX size={16} />}
              >
                {t("cases.exitOperation")}
              </Button>
            )}
          </Group>
        </Group>

        {/* 上传表单 */}
        {showUploadForm && (
          <Paper p="xl">
            <Stack spacing="lg">
              <Group position="apart">
                <Title order={3}>{t("cases.uploadReturnCaseTitle")}</Title>
                <Button
                  variant="subtle"
                  onClick={() => {
                    setShowUploadForm(false);
                    resetForm();
                  }}
                  leftIcon={<IconX size={16} />}
                >
                  {t("cases.cancelButton")}
                </Button>
              </Group>

              {adminError && (
                <Alert color="red" title={t("cases.error")}>
                  {adminError}
                </Alert>
              )}

              <TextInput
                label={t("cases.caseNameRequired")}
                value={adminCaseName}
                onChange={(event) => setAdminCaseName(event.currentTarget.value)}
                placeholder={t("cases.enterCaseNameRequired")}
                required
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  console.log('[Cases] Input onChange triggered');
                  const files = Array.from(e.target.files || []);
                  console.log('[Cases] Files selected:', files.length, files);
                  handleAdminUpload(files);
                  // 清空 input 值，允许重复选择相同文件
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[Cases] Native button clicked');
                  console.log('[Cases] File input ref:', fileInputRef.current);
                  if (fileInputRef.current) {
                    console.log('[Cases] Triggering click via ref');
                    fileInputRef.current.click();
                  } else {
                    console.error('[Cases] File input ref is null!');
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#d8b76d',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                <IconDatabaseImport size={18} />
                {locale === "zh" ? "可上传多张图片" : t("cases.uploadImagesMultiple")}
              </button>

              {adminImages.length > 0 && (
                <Stack spacing="md">
                  {/* 封面照片大图预览 */}
                  <Box 
                    sx={{ 
                      height: 300, 
                      border: "2px solid rgba(216, 183, 109, 0.4)", 
                      borderRadius: 8, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      background: "rgba(34, 39, 47, 0.5)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <Box
                      component="img"
                      src={adminImages[adminCoverIndex]} 
                      alt="Cover Preview" 
                      sx={{ 
                        maxWidth: "100%", 
                        maxHeight: "100%", 
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block"
                      }}
                    />
                    <Badge 
                      color="yellow" 
                      variant="filled"
                      sx={{ 
                        position: "absolute", 
                        top: 10, 
                        right: 10,
                        fontSize: 14,
                        padding: "6px 12px"
                      }}
                    >
                      <IconStar size={14} style={{ marginRight: 4 }} />
                      {t("cases.coverPhoto")}
                    </Badge>
                  </Box>

                  {/* 所有图片缩略图网格 */}
                  <div>
                    <Text weight={600} mb="sm">
                      {t("cases.allPhotos")} ({adminImages.length} {t("cases.photosCount")})
                    </Text>
                    <SimpleGrid cols={4} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                      {adminImages.map((url, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            position: "relative",
                            border: adminCoverIndex === index ? "2px solid #D8B76D" : "1px solid rgba(216, 183, 109, 0.18)",
                            borderRadius: 8, 
                            height: 120, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            background: "rgba(34, 39, 47, 0.5)",
                            cursor: "pointer"
                          }}
                          onClick={() => handleSetCoverImage(index)}
                        >
                          <Box component="img" src={url} alt={`Preview ${index}`} sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                          {adminCoverIndex === index && (
                            <Badge 
                              variant="filled" 
                              color="yellow" 
                              sx={{ position: "absolute", top: -8, right: -8, zIndex: 2 }}
                            >
                              {t("cases.cover")}
                            </Badge>
                          )}
                          <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            sx={{ position: "absolute", bottom: 4, right: 4, opacity: 0.8 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                          >
                            <IconTrash size={14} />
                          </Button>
                        </Box>
                      ))}
                      
                      {/* 添加更多图片按钮 */}
                      <Box
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          height: 120,
                          border: "2px dashed rgba(216, 183, 109, 0.4)",
                          borderRadius: 8,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(34, 39, 47, 0.3)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "#d8b76d",
                            background: "rgba(216, 183, 109, 0.1)"
                          }
                        }}
                      >
                        <IconPlus size={32} color="#d8b76d" />
                        <Text size="sm" color="dark.1" mt="xs">
                          {t("cases.addImages")}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </div>
                </Stack>
              )}

              <Textarea
                label={t("cases.caseDetails")}
                value={adminItemDetails}
                onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
                placeholder={t("cases.enterCaseDetails")}
                minRows={3}
              />

              <TextInput
                label={t("cases.caseIdLabel")}
                value={adminCaseId}
                onChange={(event) => setAdminCaseId(event.currentTarget.value)}
                placeholder={t("cases.autoGenerateCaseId")}
              />

              <TextInput
                label={t("cases.salePriceLabel")}
                value={adminSalePrice}
                onChange={(event) => setAdminSalePrice(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：¥50,000" : "e.g., ¥50,000"}
              />

              <TextInput
                label={t("cases.saleTimeLabel")}
                value={adminSaleTime}
                onChange={(event) => setAdminSaleTime(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：2024-01-15" : "e.g., 2024-01-15"}
              />

              <TextInput
                label={t("cases.platformLabel")}
                value={adminSalePlatform}
                onChange={(event) => setAdminSalePlatform(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：苏富比" : "e.g., Sotheby's"}
              />

              <TextInput
                label={t("cases.clientRegionLabel")}
                value={adminClientRegion}
                onChange={(event) => setAdminClientRegion(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：北京" : "e.g., Beijing"}
              />

              <TextInput
                label={t("cases.logisticsCostLabel")}
                value={adminLogisticsCost}
                onChange={(event) => setAdminLogisticsCost(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：¥2,000" : "e.g., ¥2,000"}
              />

              <TextInput
                label={t("cases.purchaseChannelLabel")}
                value={adminPurchaseChannel}
                onChange={(event) => setAdminPurchaseChannel(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：私人收藏" : "e.g., Private Collection"}
              />

              <TextInput
                label={t("cases.purchaseCostLabel")}
                value={adminPurchaseCost}
                onChange={(event) => setAdminPurchaseCost(event.currentTarget.value)}
                placeholder={locale === "zh" ? "例如：¥30,000" : "e.g., ¥30,000"}
              />

              <Textarea
                label={t("cases.riskAdviceLabel")}
                value={adminRiskAdvice}
                onChange={(event) => setAdminRiskAdvice(event.currentTarget.value)}
                placeholder={t("cases.enterRiskAdvice")}
                minRows={2}
              />

              <Group position="right">
                <Button
                  variant="default"
                  onClick={resetForm}
                  leftIcon={<IconX size={16} />}
                >
                  {t("cases.cancel")}
                </Button>
                <Button
                  onClick={handleSaveToKnowledgeBase}
                  leftIcon={<IconCheck size={16} />}
                  disabled={adminImages.length === 0}
                >
                  {t("cases.saveCase")}
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* 操作消息提示 */}
        {manageMessage && (
          <Alert color="green" title={t("cases.success")}>
            {manageMessage}
          </Alert>
        )}

        {/* ✅ 管理模式 - 显示可编辑的案例列表 */}
        {showManageMode && (
          <Box sx={{ width: "100%" }}>
            <CasesManagementSection 
              userId={user?.id} 
              isAdmin={isAdmin} 
              embedded={true}
              mode="manage"
              onDataUpdate={async () => {
                // ✅ 保存成功后立即刷新父组件数据
                try {
                  const updated = await fetchKnowledgeBase();
                  setItems(updated);
                  console.log('[Cases] Data refreshed after edit');
                } catch (error) {
                  console.error('[Cases] Failed to refresh data:', error);
                }
              }}
              onCancel={async () => {
                setShowManageMode(false);
                setShowUploadForm(false);
                
                // ✅ 重新从服务器加载最新数据（取消时也需要确保同步）
                try {
                  const updated = await fetchKnowledgeBase();
                  setItems(updated);
                } catch (error) {
                  console.error('[Cases] Failed to refresh data:', error);
                }
              }}
            />
          </Box>
        )}

        {/* 案例列表 - 仅在非管理/上传模式下显示 */}
        {!showManageMode && !showUploadForm && cases.length === 0 ? (
          <Alert color="blue">
            {!user 
              ? t("cases.noPublicCasesLogin")
              : t("cases.noCasesUploadPrompt")
            }
          </Alert>
        ) : !showManageMode && !showUploadForm && (
          <SimpleGrid cols={3} spacing="xl" breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "sm", cols: 1 }]}>
            {cases.map((item) => {
              const caseRecord = item.caseRecord;
              if (!caseRecord) return null;

              const itemTitle = locale === "zh" && item.titleZh ? item.titleZh : item.title;
              const itemDescription = locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;

              // 判断案例类型
              // ✅ isOfficial=true → "平台上传"(管理员上传)
              // ✅ isOfficial=false 或 undefined → "个人用户上传"
              const isPlatformCase = item.isOfficial === true;
              const caseTypeLabel = isPlatformCase 
                ? t("cases.platformUpload")
                : t("cases.personalUserUpload");

              const uploaderInfo = getUploaderInfo(item);

              return (
                <Card key={item.id} padding="md" radius="sm" sx={{ backgroundColor: "rgba(34, 39, 47, 0.96)", border: "1px solid rgba(216, 183, 109, 0.16)" }}>
                  <Card.Section>
                    <Box sx={{ height: 220, background: "linear-gradient(180deg, rgba(58, 46, 36, 0.45), rgba(23, 27, 34, 0.9))", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, position: "relative" }}>
                      <Box component="img" src={item.image} alt={itemTitle} sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      
                      {/* 照片数量提示 */}
                      {item.galleryImages && item.galleryImages.length > 1 && (
                        <Badge 
                          variant="filled"
                          sx={{ 
                            position: "absolute", 
                            bottom: 12, 
                            right: 12,
                            fontSize: 13,
                            padding: "6px 10px",
                            backgroundColor: "rgba(0, 0, 0, 0.75)",
                            color: "#fff",
                            fontWeight: 600,
                            backdropFilter: "blur(4px)",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                            zIndex: 10
                          }}
                        >
                          📷 {item.galleryImages.length}{t("cases.photosCountBadge")}
                        </Badge>
                      )}
                    </Box>
                  </Card.Section>
                  
                  <Stack spacing="sm" mt="md">
                    <Group spacing="xs">
                      {/* ✅ 案例类型徽章 - 区分平台上传和个人上传 */}
                      <Badge 
                        color={isPlatformCase ? "blue" : "green"} 
                        variant="outline"
                        sx={{ alignSelf: "flex-start" }}
                      >
                        {caseTypeLabel}
                      </Badge>
                      {/* ✅ 管理员可见的详细上传者信息 */}
                      {isAdmin && !isPlatformCase && uploaderInfo && (
                        <Badge 
                          color="gray" 
                          variant="light"
                          sx={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <IconUser size={12} />
                          {uploaderInfo}
                        </Badge>
                      )}
                    </Group>
                    
                    <Title order={3} size="h3">{itemTitle}</Title>
                    
                    {caseRecord.saleTime && (
                      <Group spacing={8} color="dark.1">
                        <Text size="sm" color="dark.1">{caseRecord.saleTime}</Text>
                      </Group>
                    )}

                    {/* ✅ 移除编辑功能,只保留查看链接 */}
                    <Button component={Link} href={`/cases/${item.id}`} variant="subtle" px={0} sx={{ alignSelf: "flex-start" }}>
                      {t("image.caseOpen")}
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
