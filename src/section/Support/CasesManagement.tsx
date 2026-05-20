import {
  deleteImportedArtwork,
  fetchKnowledgeBase,
  saveImportedArtwork,
  updateImportedArtwork,
} from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork, ArtworkCaseRecord } from "@/data/artworks";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  FileButton,
  Group,
  Image,
  Loader,
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
  IconCheck,
  IconDatabaseImport,
  IconEdit,
  IconLock,
  IconPhoto,
  IconPlus,
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Fragment, useEffect, useState, memo, useCallback, useRef } from "react";
import { useRouter } from "next/router";

type CasesManagementProps = {
  userId?: string;
  isAdmin?: boolean;
  embedded?: boolean; // 是否作为嵌入式组件使用（移除外层容器）
  mode?: "upload" | "manage"; // 模式：上传或管理
  onCancel?: () => void; // 取消时的回调函数
  onDataUpdate?: () => void; // 数据更新时的回调函数（用于通知父组件刷新）
};

// 辅助组件：根据 embedded 属性渲染外层容器（必须在组件外部定义，避免每次渲染重新创建）
const OuterWrapper = ({ children, embedded }: { children: React.ReactNode; embedded?: boolean }) => {
  if (embedded) {
    return <>{children}</>;
  }
  return <Container fluid pt={80} pb={120}>{children}</Container>;
};

const CasesManagementSection = memo(function CasesManagementSection({ 
  userId, 
  isAdmin, 
  embedded = false, 
  mode = "upload",
  onCancel,
  onDataUpdate 
}: CasesManagementProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 多图片上传状态
  const [adminImages, setAdminImages] = useState<string[]>([]); // 所有图片URL数组
  const [adminCoverIndex, setAdminCoverIndex] = useState<number>(0); // 封面照片索引
  
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
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editCaseName, setEditCaseName] = useState(""); // ✅ 编辑时的案例名称
  const [editItemDetails, setEditItemDetails] = useState("");
  const [editCaseId, setEditCaseId] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editSaleTime, setEditSaleTime] = useState("");
  const [editSalePlatform, setEditSalePlatform] = useState("");
  const [editClientRegion, setEditClientRegion] = useState("");
  const [editLogisticsCost, setEditLogisticsCost] = useState("");
  const [editPurchaseChannel, setEditPurchaseChannel] = useState("");
  const [editPurchaseCost, setEditPurchaseCost] = useState("");
  const [editRiskAdvice, setEditRiskAdvice] = useState("");
  
  // ✅ 编辑模式的图片管理状态
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editCoverIndex, setEditCoverIndex] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    void fetchKnowledgeBase()
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // 如果未登录，自动触发登录模态框
  useEffect(() => {
    if (!userId) {
      // 触发打开登录模态框
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  }, [userId]);

  // 如果未登录，显示提示
  if (!userId) {
    return (
      <OuterWrapper embedded={embedded}>
        <Paper p="xl">
          <Stack spacing="sm" align="center">
            <IconLock size={48} color="red" />
            <Title order={2} color="red">{t("cases.loginRequired")}</Title>
            <Text color="dark.1" align="center">
              {locale === "zh" 
                ? `请先登录后才能${mode === "upload" ? "上传案例" : "管理案例"}。`
                : `Please login first to ${mode === "upload" ? "upload" : "manage"} cases.`}
              <br />
              {mode === "upload" 
                ? t("cases.uploadYourOwnCases")
                : t("cases.manageYourOwnCases")}
            </Text>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
              color="violet"
            >
              {t("cases.loginNow")}
            </Button>
          </Stack>
        </Paper>
      </OuterWrapper>
    );
  }

  // 根据用户角色过滤回流案例列表
  const cases = items.filter((item) => {
    if (item.caseRecord) {
      // 管理员可以看到所有内容
      if (isAdmin) return true;
      // 普通用户只能看到自己上传的内容
      if (userId && item.uploadedBy === userId) return true;
      // 如果没有 uploadedBy 字段（旧数据），对普通用户隐藏
      return false;
    }
    return false;
  });

  const handleAdminUpload = async (files: File[] | null) => {
    console.log('[CasesManagement] handleAdminUpload called with files:', files);
    if (!files || files.length === 0) {
      console.log('[CasesManagement] No files selected');
      return;
    }
    
    console.log('[CasesManagement] Processing', files.length, 'files');
    
    try {
      // 将文件转换为 Base64 Data URL
      const urls = await Promise.all(
        files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      console.log('[CasesManagement] Created Base64 URLs:', urls.length, 'images');
      setAdminImages(urls);
      setAdminCoverIndex(0); // 默认第一张为封面
      setAdminError(null);
    } catch (error) {
      console.error('[CasesManagement] Failed to convert images to base64:', error);
      setAdminError(t("cases.imageConversionFailed"));
    }
  };

  const handleSetCoverImage = (index: number) => {
    setAdminCoverIndex(index);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = adminImages.filter((_, i) => i !== index);
    setAdminImages(newImages);
    
    // 调整封面索引
    if (adminCoverIndex >= newImages.length) {
      setAdminCoverIndex(Math.max(0, newImages.length - 1));
    } else if (adminCoverIndex > index) {
      setAdminCoverIndex(adminCoverIndex - 1);
    }
  };

  const resetForm = () => {
    setAdminImages([]);
    setAdminCoverIndex(0);
    setAdminCaseName("");
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
    setAdminError(null);
    setManageMessage(null);
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      // 如果提供了 onCancel 回调，使用它（嵌入式模式）
      onCancel();
    } else {
      // 否则使用浏览器后退（独立页面模式）
      router.back();
    }
  };

  const handleSaveToKnowledgeBase = async () => {
    if (adminImages.length === 0) {
      setAdminError(t("cases.atLeastOneImage"));
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

      // 封面照片作为 image，所有照片（包括封面）存入 galleryImages
      const newArtwork: Artwork = {
        id: `imported-${Date.now()}`,
        title: adminCaseName, // ✅ 使用独立的案例名称字段
        category: "misc",
        period: "",
        image: adminImages[adminCoverIndex], // 封面照片
        galleryImages: adminImages, // 所有照片
        description: adminItemDetails || "", // ✅ 描述使用详情字段
        listingType: "product",
        caseRecord,
        uploadedBy: userId, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0], // 占位符
      };

      await saveImportedArtwork(newArtwork);

      setManageMessage(t("cases.importSuccess"));
      resetForm();
      
      // ✅ 通知父组件刷新数据
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || t("cases.importFailed"));
    }
  };

  const handleStartEdit = (artwork: Artwork) => {
    console.log('[CasesManagement] Starting edit for artwork:', artwork.id);
    console.log('[CasesManagement] Gallery images:', artwork.galleryImages);
    console.log('[CasesManagement] Case record:', artwork.caseRecord);
    
    setEditingArtworkId(artwork.id);
    setEditCaseName(artwork.title || ""); // ✅ 初始化案例名称
    setEditItemDetails(artwork.description || "");
    
    // ✅ 初始化图片数组 - 优先使用 galleryImages,否则使用 image
    const images = artwork.galleryImages && artwork.galleryImages.length > 0
      ? [...artwork.galleryImages]
      : [artwork.image];
    console.log('[CasesManagement] Edit images initialized:', images.length, 'images');
    setEditImages(images);
    setEditCoverIndex(0); // 默认第一张为封面
    
    const cr = artwork.caseRecord;
    setEditCaseId(cr?.caseId || "");
    setEditSalePrice(cr?.salePrice || "");
    setEditSaleTime(cr?.saleTime || "");
    setEditSalePlatform(cr?.salePlatform || "");
    setEditClientRegion(cr?.clientRegion || "");
    setEditLogisticsCost(cr?.logisticsCost || "");
    setEditPurchaseChannel(cr?.purchaseChannel || "");
    setEditPurchaseCost(cr?.purchaseCost || "");
    setEditRiskAdvice(cr?.riskAdvice || "");
  };

  const resetEditForm = () => {
    setEditingArtworkId(null);
    setEditCaseName(""); // ✅ 重置案例名称
    setEditItemDetails("");
    setEditCaseId("");
    setEditSalePrice("");
    setEditSaleTime("");
    setEditSalePlatform("");
    setEditClientRegion("");
    setEditLogisticsCost("");
    setEditPurchaseChannel("");
    setEditPurchaseCost("");
    setEditRiskAdvice("");
    // ✅ 重置图片状态
    setEditImages([]);
    setEditCoverIndex(0);
  };

  const handleSaveEdit = async (artwork: Artwork) => {
    if (editImages.length === 0) {
      setAdminError(t("cases.atLeastKeepOneImage"));
      return;
    }

    try {
      // ✅ 验证案例名称必填
      if (!editCaseName.trim()) {
        setAdminError(t("cases.pleaseEnterCaseName"));
        return;
      }

      const caseRecord: ArtworkCaseRecord = {
        caseId: editCaseId || "",
        salePrice: editSalePrice || "",
        saleTime: editSaleTime || "",
        salePlatform: editSalePlatform || "",
        clientRegion: editClientRegion || "",
        logisticsCost: editLogisticsCost || "",
        purchaseChannel: editPurchaseChannel || "",
        purchaseCost: editPurchaseCost || "",
        riskAdvice: editRiskAdvice || "",
      };

      // ✅ 使用编辑后的图片数据
      const updatedArtwork: Artwork = {
        ...artwork,
        title: editCaseName, // ✅ 使用编辑后的案例名称
        description: editItemDetails || artwork.description,
        image: editImages[editCoverIndex], // 封面照片
        galleryImages: editImages, // 所有照片
        caseRecord,
      };

      await updateImportedArtwork(updatedArtwork);

      setManageMessage(t("cases.updateSuccess"));
      resetEditForm();
      
      // ✅ 方案1: 直接在本地状态中更新该案例（立即生效）
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === artwork.id ? updatedArtwork : item
        )
      );
      
      // ✅ 方案2: 通知父组件刷新数据（确保父组件也同步更新）
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      // ✅ 方案3: 同时后台刷新数据（确保与服务器同步）
      setTimeout(async () => {
        try {
          const refreshed = await fetchKnowledgeBase();
          console.log('[Cases] Background refresh completed, items:', refreshed.length);
          setItems(refreshed);
        } catch (error) {
          console.error('[Cases] Background refresh failed:', error);
        }
      }, 500);
    } catch (error: any) {
      console.error('[Cases] Update failed:', error);
      setAdminError(error.message || t("cases.updateFailed"));
    }
  };

  const handleDeleteImportedArtwork = async (id: string) => {
    if (!confirm(t("cases.deleteConfirm"))) return;
    try {
      await deleteImportedArtwork(id);
      setManageMessage(t("cases.deleteSuccess"));
      
      // ✅ 立即从本地状态中移除（立即生效）
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      
      // ✅ 通知父组件刷新数据
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      // ✅ 后台刷新数据确保同步
      setTimeout(async () => {
        try {
          const refreshed = await fetchKnowledgeBase();
          setItems(refreshed);
        } catch (error) {
          console.error('[Cases] Background refresh failed:', error);
        }
      }, 500);
    } catch (error: any) {
      setAdminError(error.message || "删除失败");
    }
  };

  // ✅ 编辑模式的图片管理函数
  const handleEditSetCoverImage = (index: number) => {
    setEditCoverIndex(index);
  };

  const handleEditRemoveImage = (index: number) => {
    setEditImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // 如果删除的是封面,重置封面索引
      if (index === editCoverIndex) {
        setEditCoverIndex(0);
      } else if (index < editCoverIndex) {
        // 如果删除的图片在封面前面,调整封面索引
        setEditCoverIndex(editCoverIndex - 1);
      }
      return newImages;
    });
  };

  const handleEditUploadImages = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
    try {
      // 将文件转换为 Base64 Data URL
      const urls = await Promise.all(
        files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      setEditImages(prev => [...prev, ...urls]);
    } catch (error) {
      console.error('[Cases] Failed to upload images:', error);
      setAdminError(t("cases.imageUploadFailed"));
    }
  };

  // 如果是管理模式，显示可编辑的列表
  if (mode === "manage") {
    return (
      <OuterWrapper embedded={embedded}>
        <Stack spacing="xl">
          {/* ✅ 编辑模式下显示单个案例编辑表单 */}
          {editingArtworkId ? (
            <Paper p="xl" withBorder>
              <Stack spacing="lg">
                <Group position="apart">
                  <Title order={3}>
                    {locale === "zh" ? "编辑案例" : "Edit Case"}
                  </Title>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={resetEditForm}
                    leftIcon={<IconX size={16} />}
                  >
                    {locale === "zh" ? "返回列表" : "Back to List"}
                  </Button>
                </Group>

                {/* ✅ 图片管理区域 */}
                <Box>
                  <Text weight={600} mb="sm">案例图片</Text>
                  
                  {/* 封面大图预览 */}
                  {editImages.length > 0 && (
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
                        overflow: "hidden",
                        mb: "sm"
                      }}
                    >
                      <Box
                        component="img"
                        src={editImages[editCoverIndex]} 
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
                          padding: "6px 12px",
                          fontWeight: 600
                        }}
                      >
                        {t("cases.coverPhoto")}
                      </Badge>
                    </Box>
                  )}

                  {/* 图片缩略图网格 */}
                  {editImages.length > 0 && (
                    <SimpleGrid cols={4} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                      {editImages.map((imgUrl, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            position: "relative",
                            border: editCoverIndex === index ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                            borderRadius: 6,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            "&:hover": {
                              borderColor: "#d8b76d",
                              transform: "scale(1.02)"
                            }
                          }}
                        >
                          <Box
                            component="img"
                            src={imgUrl} 
                            alt={`Photo ${index + 1}`}
                            onClick={() => handleEditSetCoverImage(index)}
                            sx={{
                              width: "100%",
                              height: 120,
                              objectFit: "contain",
                              display: "block",
                              backgroundColor: "rgba(34, 39, 47, 0.5)"
                            }}
                          />
                          
                          {/* 封面标记 */}
                          {editCoverIndex === index && (
                            <Badge 
                              variant="filled" 
                              color="yellow"
                              sx={{ 
                                position: "absolute",
                                top: 6,
                                left: 6,
                                fontSize: 11,
                                padding: "2px 8px",
                                fontWeight: 600
                              }}
                            >
                              {t("cases.cover")}
                            </Badge>
                          )}

                          {/* 删除按钮 */}
                          <Box
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRemoveImage(index);
                            }}
                            sx={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              backgroundColor: "rgba(255, 0, 0, 0.8)",
                              borderRadius: "50%",
                              width: 24,
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: "rgba(255, 0, 0, 1)"
                              }
                            }}
                          >
                            <IconX size={14} color="#fff" />
                          </Box>
                        </Box>
                      ))}
                      
                      {/* 添加更多图片按钮 */}
                      <input
                        id="edit-image-upload-full"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          handleEditUploadImages(files);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      <Box
                        onClick={() => document.getElementById('edit-image-upload-full')?.click()}
                        sx={{
                          height: 120,
                          border: "2px dashed rgba(216, 183, 109, 0.4)",
                          borderRadius: 6,
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
                          {locale === "zh" ? "添加图片" : "Add Images"}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  )}
                </Box>

                {/* 案例详情 */}
                <TextInput
                  label={t("cases.caseNameRequired")}
                  value={editCaseName}
                  onChange={(event) => setEditCaseName(event.currentTarget.value)}
                  placeholder={t("cases.enterCaseNameRequired")}
                  required
                />

                <Textarea
                  label={t("cases.caseDetails")}
                  value={editItemDetails}
                  onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                  minRows={3}
                />

                {/* 基本信息 */}
                <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                  <TextInput
                    label={t("cases.caseIdLabel")}
                    value={editCaseId}
                    onChange={(event) => setEditCaseId(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.salePriceLabel")}
                    value={editSalePrice}
                    onChange={(event) => setEditSalePrice(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.saleTimeLabel")}
                    value={editSaleTime}
                    onChange={(event) => setEditSaleTime(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.platformLabel")}
                    value={editSalePlatform}
                    onChange={(event) => setEditSalePlatform(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.clientRegionLabel")}
                    value={editClientRegion}
                    onChange={(event) => setEditClientRegion(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.logisticsCostLabel")}
                    value={editLogisticsCost}
                    onChange={(event) => setEditLogisticsCost(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.purchaseChannelLabel")}
                    value={editPurchaseChannel}
                    onChange={(event) => setEditPurchaseChannel(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t("cases.purchaseCostLabel")}
                    value={editPurchaseCost}
                    onChange={(event) => setEditPurchaseCost(event.currentTarget.value)}
                  />
                </SimpleGrid>

                {/* 避坑建议 */}
                <Textarea
                  label={t("cases.riskAdviceLabel")}
                  value={editRiskAdvice}
                  onChange={(event) => setEditRiskAdvice(event.currentTarget.value)}
                  minRows={2}
                />

                {/* 操作按钮 */}
                <Group position="right">
                  <Button
                    variant="light"
                    color="yellow"
                    onClick={resetEditForm}
                    leftIcon={<IconX size={16} />}
                    sx={{
                      fontWeight: 600,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        transition: "all 0.2s ease"
                      }
                    }}
                  >
                    {locale === "zh" ? "取消" : "Cancel"}
                  </Button>
                  <Button
                    color="yellow"
                    onClick={() => {
                      const artwork = cases.find(item => item.id === editingArtworkId);
                      if (artwork) {
                        handleSaveEdit(artwork);
                      }
                    }}
                    leftIcon={<IconCheck size={16} />}
                    sx={{
                      fontWeight: 600,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        transition: "all 0.2s ease"
                      }
                    }}
                  >
                    {locale === "zh" ? "保存" : "Save"}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : (
            /* ✅ 非编辑模式下显示案例列表 */
            <>
              <Group position="apart">
                <Title order={3}>
                  {locale === "zh" ? "管理案例" : "Manage Cases"}
                </Title>
                {!isLoading && (
                  <Badge color="blue" size="lg">
                    {cases.length} {t("cases.casesCount")}
                  </Badge>
                )}
              </Group>

              {isLoading ? (
                <Box py="xl" sx={{ textAlign: "center" }}>
                  <Loader size="lg" />
                  <Text mt="md" color="dark.1">
                    {locale === "zh" ? "加载中..." : "Loading..."}
                  </Text>
                </Box>
              ) : cases.length === 0 ? (
                <Text color="dark.1" align="center" py="xl">
                  {isAdmin 
                    ? t("cases.noCasesYetAdmin")
                    : t("cases.noCasesYetUser")}
                </Text>
              ) : (
                <SimpleGrid cols={2} spacing="lg">
                  {cases.map((artwork) => (
                    <Paper key={artwork.id} p="md" withBorder>
                      <Stack spacing="md">
                        <Box
                          sx={{
                            height: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(34, 39, 47, 0.5)",
                            borderRadius: 6,
                          }}
                        >
                          <Box
                            component="img"
                            src={artwork.image}
                            alt={artwork.title}
                            sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          />
                        </Box>

                        <Text weight={600}>{artwork.title}</Text>
                        <Text size="sm" color="dark.1" lineClamp={2}>
                          {artwork.description}
                        </Text>
                        {artwork.caseRecord && (
                          <Stack spacing="xs">
                            {artwork.caseRecord.salePrice && (
                              <Text size="sm">
                                <strong>{t("cases.salePrice")}</strong> {artwork.caseRecord.salePrice}
                              </Text>
                            )}
                            {artwork.caseRecord.saleTime && (
                              <Text size="sm">
                                <strong>{t("cases.saleTime")}</strong> {artwork.caseRecord.saleTime}
                              </Text>
                            )}
                            {artwork.caseRecord.salePlatform && (
                              <Text size="sm">
                                <strong>{t("cases.platform")}</strong> {artwork.caseRecord.salePlatform}
                              </Text>
                            )}
                          </Stack>
                        )}
                        <Group position="right">
                          <Button
                            variant="light"
                            color="blue"
                            size="xs"
                            onClick={() => handleStartEdit(artwork)}
                            leftIcon={<IconEdit size={14} />}
                            sx={{
                              fontWeight: 600,
                              "&:hover": {
                                transform: "translateY(-2px)",
                                transition: "all 0.2s ease"
                              }
                            }}
                          >
                            {t("cases.edit")}
                          </Button>
                          <Button
                            variant="light"
                            color="red"
                            size="xs"
                            onClick={() => handleDeleteImportedArtwork(artwork.id)}
                            leftIcon={<IconTrash size={14} />}
                            sx={{
                              fontWeight: 600,
                              "&:hover": {
                                transform: "translateY(-2px)",
                                transition: "all 0.2s ease"
                              }
                            }}
                          >
                            {t("cases.delete")}
                          </Button>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </>
          )}
        </Stack>
      </OuterWrapper>
    );
  }

  // 上传模式（默认）
  return (
    <OuterWrapper embedded={embedded}>
      <Stack spacing="xl">
        <Paper p="xl">
          <Stack spacing="lg">
            <Group position="apart">
              <div>
                <Title order={2}>{t("cases.returnCaseManagement")}</Title>
                <Text color="dark.1">
                  {isAdmin 
                    ? t("cases.adminModeDescription")
                    : t("cases.userModeDescription")}
                </Text>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  console.log('[CasesManagement] Input onChange triggered');
                  const files = Array.from(e.target.files || []);
                  console.log('[CasesManagement] Files selected:', files.length, files);
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
                  console.log('[CasesManagement] Native button clicked');
                  console.log('[CasesManagement] File input ref:', fileInputRef.current);
                  if (fileInputRef.current) {
                    console.log('[CasesManagement] Triggering click via ref');
                    fileInputRef.current.click();
                  } else {
                    console.error('[CasesManagement] File input ref is null!');
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
                {t("cases.uploadImagesMultiple")}
              </button>
            </Group>

            {adminError && (
              <Alert color="red" title={t("cases.error")}>
                {adminError}
              </Alert>
            )}

            {/* ✅ 案例名称输入框(必填) */}
            <TextInput
              label={t("cases.caseNameRequired")}
              value={adminCaseName}
              onChange={(event) => setAdminCaseName(event.currentTarget.value)}
              placeholder={t("cases.enterCaseNameRequired")}
              required
            />

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
                  <Text weight={600} mb="sm">{t("cases.allPhotosClickStar")}</Text>
                  <SimpleGrid cols={4} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                    {adminImages.map((imgUrl, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          position: "relative",
                          border: adminCoverIndex === index ? "2px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                          borderRadius: 6,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "#d8b76d",
                            transform: "scale(1.02)"
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src={imgUrl} 
                          alt={`Photo ${index + 1}`}
                          onClick={() => handleSetCoverImage(index)}
                          sx={{
                            width: "100%",
                            height: 120,
                            objectFit: "contain",
                            display: "block",
                            backgroundColor: "rgba(34, 39, 47, 0.5)"
                          }}
                        />
                        
                        {/* 封面标记 */}
                        {adminCoverIndex === index && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 4,
                              left: 4,
                              backgroundColor: "#d8b76d",
                              borderRadius: "50%",
                              width: 24,
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <IconStar size={14} color="#fff" />
                          </Box>
                        )}

                        {/* 删除按钮 */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            backgroundColor: "rgba(255, 0, 0, 0.8)",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "rgba(255, 0, 0, 1)"
                            }
                          }}
                        >
                          <IconX size={14} color="#fff" />
                        </Box>
                      </Box>
                    ))}
                  </SimpleGrid>
                </div>
              </Stack>
            ) : (
              <Box sx={{ height: 300, border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34, 39, 47, 0.5)" }}>
                <Stack spacing="sm" align="center">
                  <IconPhoto size={44} color="#d8b76d" />
                  <Text weight={600}>{t("cases.noPreviewImages")}</Text>
                  <Text size="sm" color="dark.1">{t("cases.uploadCaseImages")}</Text>
                </Stack>
              </Box>
            )}

            <Textarea
              label={t("cases.caseDetails")}
              value={adminItemDetails}
              onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
              placeholder={t("cases.enterCaseDetails")}
              minRows={3}
            />

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
              <TextInput
                label={t("cases.caseIdLabel")}
                value={adminCaseId}
                onChange={(event) => setAdminCaseId(event.currentTarget.value)}
                placeholder={t("cases.optional")}
              />
              <TextInput
                label={t("cases.salePriceLabel")}
                value={adminSalePrice}
                onChange={(event) => setAdminSalePrice(event.currentTarget.value)}
                placeholder="例如: ¥50,000"
              />
              <TextInput
                label={t("cases.saleTimeLabel")}
                value={adminSaleTime}
                onChange={(event) => setAdminSaleTime(event.currentTarget.value)}
                placeholder="例如: 2024-01-15"
              />
              <TextInput
                label={t("cases.platformLabel")}
                value={adminSalePlatform}
                onChange={(event) => setAdminSalePlatform(event.currentTarget.value)}
                placeholder="例如: 苏富比"
              />
              <TextInput
                label={t("cases.clientRegionLabel")}
                value={adminClientRegion}
                onChange={(event) => setAdminClientRegion(event.currentTarget.value)}
                placeholder="例如: 北京"
              />
              <TextInput
                label={t("cases.logisticsCostLabel")}
                value={adminLogisticsCost}
                onChange={(event) => setAdminLogisticsCost(event.currentTarget.value)}
                placeholder="例如: ¥2,000"
              />
              <TextInput
                label={t("cases.purchaseChannelLabel")}
                value={adminPurchaseChannel}
                onChange={(event) => setAdminPurchaseChannel(event.currentTarget.value)}
                placeholder="例如: 私人收藏"
              />
              <TextInput
                label={t("cases.purchaseCostLabel")}
                value={adminPurchaseCost}
                onChange={(event) => setAdminPurchaseCost(event.currentTarget.value)}
                placeholder="例如: ¥30,000"
              />
            </SimpleGrid>

            <Textarea
              label={t("cases.riskAdviceLabel")}
              value={adminRiskAdvice}
              onChange={(event) => setAdminRiskAdvice(event.currentTarget.value)}
              placeholder={t("cases.enterRiskAdvice")}
              minRows={2}
            />

            <Group position="right">
              <Button
                variant="light"
                color="yellow"
                onClick={onCancel || (() => router.back())}
                leftIcon={<IconX size={16} />}
                sx={{
                  fontWeight: 600,
                  fontSize: 15,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    transition: "all 0.2s ease"
                  }
                }}
              >
                {t("cases.back")}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </OuterWrapper>
  );
});

export default CasesManagementSection;
