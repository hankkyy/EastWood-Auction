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
import { primaryActionButtonSx, secondaryActionButtonSx } from "@/components/artworkStyles";
import { useRouter } from "next/router"; // ✅ 导入 useRouter
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  NumberInput,
  Pagination,
  Paper,
  Select,
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
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  const [showManageMode, setShowManageMode] = useState(false);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState<number | ''>('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);
  const ITEMS_PER_PAGE = 15;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page > 1 && gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [page]);
 // ✅ 新增管理模式状态
  
  // ✅ 监听路由变化，当进入主页面时重置所有模式状态
  useEffect(() => {
    // 当路由为 /cases（不包含子路径如 /cases/[id]）时，重置到浏览模式
    if (router.pathname === '/cases') {
      setShowUploadForm(false);
      setShowManageMode(false);
    }
  }, [router.asPath, router.pathname]); // ✅ 改为监听 asPath，这样即使在同一页面重新导航也会触发
  
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
  const [adminCategory, setAdminCategory] = useState("misc");
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
  const [isSaving, setIsSaving] = useState(false);

  const caseCategoryOptions = [
    { value: "calligraphy", label: locale === "zh" ? "字画" : "Paintings & Calligraphy" },
    { value: "misc", label: locale === "zh" ? "杂项" : "Miscellaneous" },
    { value: "porcelain", label: locale === "zh" ? "瓷器" : "Porcelain" },
    { value: "jade", label: locale === "zh" ? "翡翠玉器" : "Jade" },
    { value: "bronze", label: locale === "zh" ? "铜器" : "Bronze" },
  ];

  const getCategoryTextZh = (value: string) => {
    switch (value) {
      case "calligraphy":
        return "字画";
      case "porcelain":
        return "瓷器";
      case "jade":
        return "翡翠玉器";
      case "bronze":
        return "铜器";
      default:
        return "杂项";
    }
  };

  const refreshKnowledgeBase = useCallback(async () => {
    try {
      const data = await fetchKnowledgeBase();
      setItems(data);
    } catch (error) {
      console.error('[Cases] Failed to refresh cloud data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyArtworkChange = useCallback((change?: Artwork | { deletedId: string }) => {
    if (!change) {
      void refreshKnowledgeBase();
      return;
    }

    if ("deletedId" in change) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== change.deletedId));
      return;
    }

    setItems((prevItems) => [
      change,
      ...prevItems.filter((item) => item.id !== change.id),
    ]);
  }, [refreshKnowledgeBase]);
  
  // ✅ 移除主展示页面的编辑功能,编辑只在管理模式中进行

  // 生成唯一的案例编号（统一格式：CASE-MMDDYY-XXXX）
  const generateCaseId = () => buildCaseId();

  // ✅ 云端数据为唯一真源：先显示已有数据，再后台刷新云端
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setItems(initialData);
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

  // ✅ 初始化时自动生成案例编号
  useEffect(() => {
    if (!adminCaseId) {
      setAdminCaseId(generateCaseId());
    }
  }, [adminCaseId]);

  // 根据用户角色过滤回流案例列表
  const cases = useMemo(() => {
    return items.filter((item) => {
      // 只过滤掉没有 caseRecord 的数据
      if (!item.caseRecord) return false;
      return true;
    });
  }, [items]);

  // Pagination
  const totalPages = Math.ceil(cases.length / ITEMS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages || 1));
  const visibleCases = useMemo(
    () => cases.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [cases, safePage]
  );

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      // ✅ 所有用户(包括未登录)都能看到所有回流案例
      return true;
    });
  }, [items]);

  const handleAdminUpload = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
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
      
      // 追加到现有图片数组（而不是替换）
      setAdminImages(prevImages => [...prevImages, ...newUrls]);
      
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
    setAdminCategory("misc");
    setAdminItemDetails("");
    setAdminCaseId(generateCaseId()); // ✅ 重置时重新生成编号
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
    if (isSaving) return;

    if (adminImages.length === 0) {
      setAdminError(t("cases.atLeastOneImage"));
      return;
    }

    if (!user) {
      setAdminError(locale === "zh" ? "请先登录" : "Please login first");
      return;
    }

    try {
      setIsSaving(true);
      // ✅ 验证案例名称必填
      if (!adminCaseName.trim()) {
        setAdminError(t("cases.pleaseEnterCaseName"));
        return;
      }

      // ✅ 自动生成案例编号(如果用户未填写)
      const generatedCaseId = adminCaseId || generateCaseId();
      
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
        category: adminCategory || "misc",
        categoryZh: getCategoryTextZh(adminCategory || "misc"),
        period: "",
        image: coverImage,
        galleryImages: adminImages,
        description: adminItemDetails || "", // ✅ 描述使用详情字段
        listingType: "product",
        caseRecord,
        uploadedBy: user.id, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0],
      };

      const savedArtwork = await saveImportedArtwork(newArtwork);

      setManageMessage(t("cases.importSuccess"));
      setItems(prevItems => [
        savedArtwork,
        ...prevItems.filter((item) => item.id !== savedArtwork.id),
      ]);
      resetForm();
    } catch (error: any) {
      setAdminError(error.message || t("cases.importFailed"));
    } finally {
      setIsSaving(false);
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

  // 数据或认证加载中，显示统一的 Loading 状态
  if (isLoading || authLoading) {
    return (
      <Container fluid pt={80} pb={120}>
        <Text align="center">{t("cases.loading")}</Text>
      </Container>
    );
  }

  return (
    <Container fluid pt={80} pb={120} px={72}> {/* ✅ 增加左右内边距 */}
      <Stack spacing="xl">
        {/* 操作按钮 */}
        <Group position="right">
          <Group spacing="sm">
            {/* ✅ 上传按钮 - 所有登录用户可见(回流案例允许普通用户上传) */}
            {user && !showUploadForm && !showManageMode && (
              <>
                <Button
                  onClick={handleUploadClick}
                  leftIcon={<IconDatabaseImport size={18} />}
                  sx={primaryActionButtonSx}
                >
                  {t("cases.uploadNewCaseButton")}
                </Button>
                
                {/* 管理按钮 - 所有登录用户可见 */}
                <Button
                  variant="default"
                  onClick={handleManageClick}
                  leftIcon={<IconLayoutList size={18} />}
                  sx={secondaryActionButtonSx}
                >
                  {t("cases.manageCasesButton")}
                </Button>

                {/* 导入模拟数据 — 仅管理员 + 仅开发环境 */}
                {isAdmin && process.env.NODE_ENV === "development" && (
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
                )}
              </>
            )}
            {(showUploadForm || showManageMode) && (
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
            )}
          </Group>
        </Group>

        {/* 上传表单 */}
        {showUploadForm && (
          <Paper p="xl">
            <Stack spacing="lg">
              {/* 标题、管理员提示和上传按钮 */}
              <Group position="apart">
                <div>
                  <Title order={2}>{locale === "zh" ? "案例管理" : "Case Management"}</Title>
                  {isAdmin && (
                    <Text size="sm" color="dimmed" mt={4}>
                      {t("cases.adminModeText")}
                    </Text>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    handleAdminUpload(files);
                    // 清空 input 值，允许重复选择相同文件
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<IconDatabaseImport size={18} />}
                >
                  {locale === "zh" ? "上传图片" : "Upload Image"}
                </Button>
              </Group>

              {adminError && (
                <Alert color="red" title={t("cases.error")}>
                  {adminError}
                </Alert>
              )}

              {/* 多图片上传区域 */}
              {adminImages.length > 0 ? (
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
                        <Text size="sm" color="dimmed" mt="xs">
                          {t("cases.addImages")}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </div>
                </Stack>
              ) : (
                <Box sx={{ height: 300, border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34, 39, 47, 0.5)" }}>
                  <Stack spacing="sm" align="center">
                    <IconPhoto size={44} color="#d8b76d" />
                    <Text weight={600}>{t("cases.noPreviewImages")}</Text>
                    <Text size="sm" color="dimmed">{t("cases.uploadCaseImages")}</Text>
                  </Stack>
                </Box>
              )}

              {/* ✅ 案例编号（自动生成，禁用） */}
              <TextInput
                label={t("cases.caseIdLabel")}
                value={adminCaseId}
                disabled
                description={t("cases.autoGenerateCaseId")}
              />

              {/* ✅ 案例名称输入框(必填) */}
              <Box>
                <Text size="sm" weight={500} mb={4}>
                  {t("cases.caseNameRequired")}
                  <Text component="span" color="red" ml={4}>*</Text>
                </Text>
                <TextInput
                  value={adminCaseName}
                  onChange={(event) => setAdminCaseName(event.currentTarget.value)}
                  placeholder={t("cases.enterCaseNameRequired")}
                  required
                />
              </Box>

              <Textarea
                label={t("cases.caseDetails")}
                value={adminItemDetails}
                onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
                placeholder={t("cases.enterCaseDetails")}
                minRows={3}
              />

              <Select
                label={locale === "zh" ? "分类" : "Category"}
                value={adminCategory}
                onChange={(value) => setAdminCategory(value || "misc")}
                data={caseCategoryOptions}
                withinPortal
                zIndex={5000}
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
                  variant="filled"
                  color="violet"
                  size="md"
                  onClick={resetForm}
                  leftIcon={<IconX size={18} />}
                  sx={{
                    fontWeight: 600,
                    padding: '12px 24px',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(59, 130, 246, 0.5)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t("cases.cancel")}
                </Button>
                <Button
                  onClick={handleSaveToKnowledgeBase}
                  loading={isSaving}
                  leftIcon={<IconCheck size={16} />}
                  disabled={isSaving || adminImages.length === 0}
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
              initialItems={items}
              onDataUpdate={applyArtworkChange}
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
          <Box ref={gridRef}>
          <SimpleGrid 
            cols={3}
            spacing={56}
            breakpoints={[
              { maxWidth: "md", cols: 2, spacing: "lg" },
              { maxWidth: "sm", cols: 1, spacing: "md" },
            ]}
            sx={{ 
              paddingLeft: 48,
              paddingRight: 48,
              marginTop: 64,
              marginBottom: totalPages > 1 ? 24 : 64,

              "@media (max-width: 48em)": {
                paddingLeft: 0,
                paddingRight: 0,
                marginTop: 20,
              },
            }}
          >
            {visibleCases.map((item) => {
              const caseRecord = item.caseRecord;

              const itemTitle = locale === "zh" && item.titleZh ? item.titleZh : item.title;

              return (
                <Box
                  key={item.id}
                  component={Link}
                  href={`/cases/${item.id}`}
                  sx={(theme) => ({
                    display: "block",
                    cursor: "pointer",
                    padding: 14,
                    borderRadius: 12,
                    background: "transparent",
                    border: "1px solid transparent",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 280ms ease, box-shadow 320ms ease",
                    boxShadow: "none",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      borderColor: theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.25)" : "rgba(180, 158, 120, 0.25)",
                      boxShadow: theme.colorScheme === "dark"
                        ? "0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.18)"
                        : "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
                    },
                      "& *, & .mantine-Text-root": {
                        color: "inherit",
                      },

                    "@media (max-width: 48em)": {
                      padding: 12,
                      borderRadius: 10,
                    },
                  })}
                >
                  <Box
                    component="img"
                    src={item.image}
                    alt={itemTitle}
                    sx={(theme) => ({
                      width: "100%",
                      height: 320,
                      objectFit: "cover",
                      objectPosition: "center 15%",
                      display: "block",
                      "@media (max-width: 62em)": { height: 260 },
                      "& *, & .mantine-Text-root": {
                        color: "inherit !important" as any,
                      },

                      "@media (max-width: 48em)": { height: 220 },
                    })}
                  />
                  <Box
                    sx={{
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    <Text
                      size="xl"
                      weight={600}
                      align="center"
                      sx={(theme) => ({
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                        letterSpacing: "-0.01em",
                        lineHeight: 1.35,
                      })}
                    >
                      {itemTitle}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </SimpleGrid>
              {totalPages > 1 && (
                <Group position="center" mt={24} mb={64} spacing="sm">
                  <Pagination
                    value={safePage}
                    onChange={setPage}
                    total={totalPages}
                    size="sm"
                    radius="md"
                    styles={(theme) => ({
                      control: {
                        borderColor: theme.colorScheme === "dark" ? "rgba(196,162,85,0.15)" : "rgba(180,158,120,0.2)",
                        color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                        "&[data-active]": { background: "#c4a255", borderColor: "#c4a255", color: "#fff" },
                      },
                    })}
                  />
                  <NumberInput
                    value={jumpValue}
                    onChange={setJumpValue}
                    placeholder={String(safePage)}
                    min={1} max={totalPages}
                    size="sm"
                    styles={{ input: { width: 60, textAlign: "center" } }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= totalPages) {
                        setPage(jumpValue); setJumpValue('');
                      }
                    }}
                    rightSection={
                      <Text size="xs" color="dimmed" sx={{ cursor: "pointer", userSelect: "none" }}
                        onClick={() => {
                          if (typeof jumpValue === "number" && jumpValue >= 1 && jumpValue <= totalPages) {
                            setPage(jumpValue); setJumpValue('');
                          }
                        }}>→</Text>
                    }
                  />
                  <Text size="xs" color="dimmed">/ {totalPages} {locale === "zh" ? "页" : "pages"}</Text>
                </Group>
              )}
          </Box>
        )}
      </Stack>
    </Container>
  );
}
import { generateCaseId as buildCaseId } from "@/lib/artworkIds";
