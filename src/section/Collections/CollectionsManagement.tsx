import {
  deleteImportedArtwork,
  fetchKnowledgeBase,
  saveImportedArtwork,
  updateImportedArtwork,
} from "@/features/image-search/artworkKnowledgeBase";
import { useI18n } from "@/i18n";
import type { Artwork } from "@/data/artworks";
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
import { Fragment, useEffect, useState, memo, useCallback } from "react";
import { useRouter } from "next/router";

const collectionCategoryOptions = [
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

const currencyOptions = [
  { value: "USD", labelKey: "USD" },
  { value: "CNY", labelKey: "CNY" },
] as const;

type CollectionsManagementProps = {
  userId?: string;
  isAdmin?: boolean;
  embedded?: boolean; // 是否作为嵌入式组件使用（移除外层容器）
  mode?: "upload" | "manage"; // 模式：上传或管理
  shopMode?: boolean; // ✅ 是否为商店模式（强制要求价格，自动设置 isForSale=true）
  onCancel?: () => void; // 取消时的回调函数
  onDataUpdate?: () => void; // 数据更新时的回调函数（用于通知父组件刷新）
  onSuccess?: () => void; // ✅ 保存成功后的回调函数（用于自动关闭表单）
};

// 辅助组件：根据 embedded 属性渲染外层容器（必须在组件外部定义，避免每次渲染重新创建）
const OuterWrapper = ({ children, embedded }: { children: React.ReactNode; embedded?: boolean }) => {
  if (embedded) {
    return <>{children}</>;
  }
  return <Container fluid pt={80} pb={120}>{children}</Container>;
};

const CollectionsManagementSection = memo(function CollectionsManagementSection({ 
  userId, 
  isAdmin, 
  embedded = false, 
  mode = "upload",
  shopMode = false, // ✅ 默认为 false（藏品展示模式）
  onCancel,
  onDataUpdate,
  onSuccess // ✅ 保存成功后的回调
}: CollectionsManagementProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  
  // 多图片上传状态
  const [adminImages, setAdminImages] = useState<string[]>([]); // 所有图片URL数组
  const [adminCoverIndex, setAdminCoverIndex] = useState<number>(0); // 封面照片索引
  
  const [adminCollectionId, setAdminCollectionId] = useState(""); // 藏品编号
  const [adminItemName, setAdminItemName] = useState(""); // 藏品名称
  const [adminItemDetails, setAdminItemDetails] = useState(""); // 藏品介绍
  const [adminCategory, setAdminCategory] = useState("misc");
  
  // 可售相关字段
  const [adminIsForSale, setAdminIsForSale] = useState(shopMode); // ✅ 商店模式默认开启可售
  const [adminPrice, setAdminPrice] = useState<string>(""); // 改为 string 类型以支持小数点输入
  const [adminCurrency, setAdminCurrency] = useState<"USD" | "CNY">("USD");
  
  const [adminError, setAdminError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editCollectionId, setEditCollectionId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemDetails, setEditItemDetails] = useState("");
  const [editCategory, setEditCategory] = useState("misc");
  
  // 编辑时的图片管理状态
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editCoverIndex, setEditCoverIndex] = useState(0);
  const [editNewImageFiles, setEditNewImageFiles] = useState<File[]>([]);
  
  const [editIsForSale, setEditIsForSale] = useState(false);
  const [editPrice, setEditPrice] = useState<string>(""); // 改为 string 类型以支持小数点输入
  const [editCurrency, setEditCurrency] = useState<"USD" | "CNY">("USD");

  // 使用 useCallback 缓存输入处理函数，避免每次渲染创建新函数导致焦点丢失
  const handleCollectionIdChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAdminCollectionId(event.currentTarget.value);
  }, []);

  const handleItemNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAdminItemName(event.currentTarget.value);
  }, []);

  const handleItemDetailsChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdminItemDetails(event.currentTarget.value);
  }, []);

  const handleEditCollectionIdChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEditCollectionId(event.currentTarget.value);
  }, []);

  const handleEditItemNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEditItemName(event.currentTarget.value);
  }, []);

  const handleEditItemDetailsChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditItemDetails(event.currentTarget.value);
  }, []);

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

  // ✅ 初始化时自动生成藏品/商品编号（仅在上传模式下）
  useEffect(() => {
    if (mode === "upload" && !adminCollectionId) {
      setAdminCollectionId(generateCollectionId());
    }
  }, [mode]);

  // 如果未登录，显示提示
  if (!userId) {
    return (
      <OuterWrapper embedded={embedded}>
        <Paper p="xl">
          <Stack spacing="sm" align="center">
            <IconLock size={48} color="red" />
            <Title order={2} color="red">{t("auth.loginRequired")}</Title>
            <Text color="dark.1" align="center">
              {locale === "zh" 
                ? `请先登录后才能${mode === "upload" ? (shopMode ? "上传商品" : "上传藏品") : (shopMode ? "管理商品" : "管理藏品")}。`
                : `Please log in first to ${mode === "upload" ? (shopMode ? "upload products" : "upload collections") : (shopMode ? "manage products" : "manage collections")}.`}
              <br />
              {mode === "upload" 
                ? (shopMode 
                    ? (locale === "zh" ? "仅管理员可以上传新商品。" : "Only administrators can upload new products.")
                    : (locale === "zh" ? "仅管理员可以上传新藏品。" : "Only administrators can upload new collections."))
                : (shopMode
                    ? (locale === "zh" ? "您可以管理自己上传的商品。" : "You can manage your uploaded products.")
                    : (locale === "zh" ? "您可以管理自己上传的藏品。" : "You can manage your uploaded collections."))}
            </Text>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
              color="violet"
            >
              立即登录
            </Button>
          </Stack>
        </Paper>
      </OuterWrapper>
    );
  }

  // 根据用户角色和模式过滤藏品列表
  const collections = items.filter((item) => {
    if (!item.caseRecord) {
      // ✅ 商店模式：仅显示标记为可售的商品
      if (shopMode && !item.isForSale) return false;
      
      // 管理员可以看到所有非案例记录的内容
      if (isAdmin) return true;
      // 普通用户只能看到自己上传的内容
      if (userId && item.uploadedBy === userId) return true;
      // 如果没有 uploadedBy 字段（旧数据），对普通用户隐藏
      return false;
    }
    return false;
  });

  const handleAdminUpload = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
    try {
      // 将文件转换为 Base64 Data URL
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
      setAdminImages(prevImages => {
        const updatedImages = [...prevImages, ...newUrls];
        console.log('[Collections] Updated images count:', updatedImages.length);
        return updatedImages;
      });
      
      // 如果是第一次上传，设置封面索引为 0
      if (adminImages.length === 0) {
        setAdminCoverIndex(0);
      }
      
      setAdminError(null);
    } catch (error) {
      console.error('[Collections] Failed to convert images to base64:', error);
      setAdminError("图片转换失败，请重试");
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

  // 生成唯一的藏品/商品编号（统一格式：COL-日期-随机码）
  const generateCollectionId = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${month}${day}${year}`;
    
    // 生成两个随机字母
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                    String.fromCharCode(65 + Math.floor(Math.random() * 26));
    
    // 生成两个随机数字
    const digits = String(Math.floor(Math.random() * 10)) + 
                   String(Math.floor(Math.random() * 10));
    
    return `COL-${dateStr}-${letters}${digits}`;
  };

  const resetForm = () => {
    setAdminImages([]);
    setAdminCoverIndex(0);
    setAdminCollectionId(generateCollectionId()); // ✅ 自动生成编号
    setAdminItemName("");
    setAdminItemDetails("");
    setAdminCategory("misc");
    setAdminIsForSale(shopMode); // ✅ 商店模式保持 isForSale=true
    setAdminPrice("");
    setAdminCurrency("USD");
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

  const handleViewDetail = (artworkId: string) => {
    router.push(shopMode ? `/shop/${artworkId}` : `/collections/${artworkId}`);
  };

  const handleSaveToKnowledgeBase = async () => {
    if (adminImages.length === 0) {
      setAdminError(t("collections.uploadImagesPrompt"));
      return;
    }

    if (!adminItemName.trim()) {
      setAdminError(t("collections.collectionNamePlaceholder"));
      return;
    }

    // ✅ 商店模式：强制要求填写价格和货币类型
    if (shopMode) {
      if (!adminPrice.trim()) {
        setAdminError(locale === "zh" ? "请填写售价" : "Please enter the price");
        return;
      }
      const parsed = parseFloat(adminPrice);
      if (isNaN(parsed) || parsed <= 0) {
        setAdminError(t("collections.invalidPriceError"));
        return;
      }
    }

    try {
      console.log('[Collections] Starting save process...');
      console.log('[Collections] Admin images count:', adminImages.length);
      console.log('[Collections] First image preview:', adminImages[0]?.substring(0, 100) + '...');
      console.log('[Collections] Is first image a Data URL?', adminImages[0]?.startsWith('data:'));

      // 使用自动生成的藏品编号（用户不能手动输入）
      const collectionId = adminCollectionId.trim();
      
      // 检查藏品编号是否已存在
      const existingArtwork = items.find(item => item.collectionId === collectionId);
      if (existingArtwork) {
        setAdminError(`${t("collections.collectionIdLabel")} "${collectionId}" ${locale === "zh" ? "已存在，请使用其他编号" : "already exists, please use another ID"}`);
        return;
      }

      // 验证价格格式
      let priceValue: number | undefined = undefined;
      
      // ✅ 商店模式：强制使用价格和货币
      if (shopMode) {
        const parsed = parseFloat(adminPrice);
        if (isNaN(parsed) || parsed <= 0) {
           setAdminError(t("collections.invalidPriceError"));
          return;
        }
        priceValue = parsed;
      } else if (adminIsForSale && adminPrice.trim()) {
        // 藏品展示模式：可选填写
        const parsed = parseFloat(adminPrice);
        if (isNaN(parsed) || parsed < 0) {
           setAdminError(t("collections.invalidPriceError"));
          return;
        }
        priceValue = parsed;
      }

      // 封面照片作为 image,所有照片(包括封面)存入 galleryImages
      const newArtwork: Artwork = {
        id: `imported-${Date.now()}`,
        title: adminItemName.trim(),
        category: adminCategory,
        period: "",
        image: adminImages[adminCoverIndex], // 封面照片
        galleryImages: adminImages, // 所有照片
        description: adminItemDetails || "",
        listingType: "collection",
        uploadedBy: userId, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0], // 占位符,8个元素
        collectionId: collectionId, // 藏品编号
        isForSale: shopMode ? true : adminIsForSale, // ✅ 商店模式强制设置为 true
        price: priceValue, // 售价
        currency: priceValue ? adminCurrency : undefined, // 货币单位（有价格时才设置）
      };

      console.log('[Collections] Calling saveImportedArtwork...');
      await saveImportedArtwork(newArtwork);
      console.log('[Collections] Save completed successfully');

      setManageMessage(t("collections.operationSuccess"));
      resetForm();
      
      // ✅ 通知父组件刷新数据
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      // ✅ 保存成功后自动关闭表单（如果提供了 onSuccess 回调）
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // 延迟 1.5 秒，让用户看到成功提示
      }
      
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      console.error('[Collections] Save failed:', error);
      setAdminError(error.message || t("collections.importFailed"));
    }
  };

  const handleStartEdit = (artwork: Artwork) => {
    setEditingArtworkId(artwork.id);
    setEditCollectionId(artwork.collectionId || "");
    setEditItemName(artwork.title || "");
    setEditItemDetails(artwork.description || "");
    setEditCategory(artwork.category || "misc");
    
    // 初始化图片状态 - 使用 galleryImages 字段
    const images = artwork.galleryImages && artwork.galleryImages.length > 0 
      ? artwork.galleryImages 
      : [artwork.image];
    setEditImages(images);
    setEditCoverIndex(0); // 默认封面为第一张
    setEditNewImageFiles([]);
    
    setEditIsForSale(artwork.isForSale || false);
    setEditPrice(artwork.price ? artwork.price.toString() : ""); // 将数字转换为字符串
    setEditCurrency(artwork.currency || "USD");
  };

  const resetEditForm = () => {
    setEditingArtworkId(null);
    setEditCollectionId("");
    setEditItemName("");
    setEditItemDetails("");
    setEditCategory("misc");
    setEditImages([]);
    setEditCoverIndex(0);
    setEditNewImageFiles([]);
    setEditIsForSale(false);
    setEditPrice("");
    setEditCurrency("USD");
  };

  const handleSaveEdit = async (artwork: Artwork) => {
    if (!editItemName.trim()) {
      setAdminError(t("collections.collectionNamePlaceholder"));
      return;
    }

    // ✅ 如果勾选了"可售出"，则价格和货币单位为必填项
    if (editIsForSale) {
      if (!editPrice.trim()) {
        setAdminError(shopMode 
          ? (locale === "zh" ? "商品价格为必填项" : "Product price is required")
          : (locale === "zh" ? "藏品价格为必填项" : "Artwork price is required"));
        return;
      }
      
      if (!editCurrency) {
        setAdminError(shopMode 
          ? (locale === "zh" ? "请选择货币单位" : "Please select currency")
          : (locale === "zh" ? "请选择货币单位" : "Please select currency"));
        return;
      }
      
      // 验证价格格式
      const parsed = parseFloat(editPrice);
      if (isNaN(parsed) || parsed < 0) {
        setAdminError(t("collections.invalidPriceError"));
        return;
      }
    }

    try {
      let finalImages = [...editImages];
      
      // 如果有新上传的图片,需要转换为 Base64 并添加到列表
      if (editNewImageFiles.length > 0) {
        const newBase64Images = await Promise.all(
          editNewImageFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          })
        );
        finalImages = [...finalImages, ...newBase64Images];
      }

      // 将选中的封面移到数组第一位
      if (finalImages.length > 0 && editCoverIndex > 0) {
        const coverImage = finalImages[editCoverIndex];
        finalImages.splice(editCoverIndex, 1); // 删除原位置
        finalImages.unshift(coverImage); // 添加到第一位
      }

      // 计算价格值（此时已经过验证）
      let priceValue: number | undefined = undefined;
      if (editIsForSale) {
        priceValue = parseFloat(editPrice);
      }

      const updatedArtwork: Artwork = {
        ...artwork,
        title: editItemName.trim(),
        description: editItemDetails || artwork.description,
        category: editCategory,
        collectionId: editCollectionId || artwork.collectionId,
        image: finalImages[0] || artwork.image, // 封面照片(数组第一个)
        galleryImages: finalImages.length > 0 ? finalImages : [artwork.image], // 所有照片
        isForSale: editIsForSale,
        price: editIsForSale && priceValue ? priceValue : undefined,
        currency: editIsForSale ? editCurrency : undefined,
      };

      await updateImportedArtwork(updatedArtwork);

      setManageMessage(t("collections.operationSuccess"));
      resetEditForm();
      
      // ✅ 方案1: 直接在本地状态中更新该藏品(立即生效)
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === artwork.id ? updatedArtwork : item
        )
      );
      
      // ✅ 方案2: 通知父组件刷新数据(确保父组件也同步更新)
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      // ✅ 方案3: 同时后台刷新数据(确保与服务器同步)
      setTimeout(async () => {
        try {
          const refreshed = await fetchKnowledgeBase();
          console.log('[Collections] Background refresh completed, items:', refreshed.length);
          setItems(refreshed);
        } catch (error) {
          console.error('[Collections] Background refresh failed:', error);
        }
      }, 500);
    } catch (error: any) {
      console.error('[Collections] Update failed:', error);
      setAdminError(error.message || t("collections.updateFailed"));
    }
  };

  // 编辑模式下的图片管理函数
  const handleEditAddImages = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
    try {
      setEditNewImageFiles(prev => [...prev, ...Array.from(files)]);
      
      // 立即转换为 Base64 用于预览
      const newUrls = await Promise.all(
        Array.from(files).map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      setEditImages(prev => [...prev, ...newUrls]);
    } catch (error) {
      console.error('[Collections] Failed to convert images:', error);
      setAdminError("图片转换失败，请重试");
    }
  };

  const handleEditRemoveImage = (index: number) => {
    const newImages = editImages.filter((_, i) => i !== index);
    setEditImages(newImages);
    
    // 调整封面索引
    if (editCoverIndex >= newImages.length) {
      setEditCoverIndex(Math.max(0, newImages.length - 1));
    } else if (editCoverIndex > index) {
      setEditCoverIndex(editCoverIndex - 1);
    }
  };

  const handleEditSetCoverImage = (index: number) => {
    setEditCoverIndex(index);
  };

  const handleDeleteImportedArtwork = async (id: string) => {
    if (!confirm(t("collections.deleteConfirm"))) return;
    try {
      await deleteImportedArtwork(id);
      setManageMessage(t("cases.deleteSuccess"));
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || t("cases.deleteFailed"));
    }
  };

  // 如果是管理模式，显示可编辑的列表
  if (mode === "manage") {
    return (
      <OuterWrapper embedded={embedded}>
        <Stack spacing="xl">
          <Group position="apart">
            <Title order={3}>
              {shopMode 
                ? (locale === "zh" ? "已上传商品" : "Uploaded Products")
                : t("collections.uploadedCollectionsTitle")}
            </Title>
            <Group>
              {!isLoading && (
                <Badge color="blue" size="lg">
                  {collections.length} {t("collections.itemsCount")}
                </Badge>
              )}
              <Button
                variant="filled"
                color="blue"
                size="md"
                onClick={onCancel || (() => router.back())}
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
                {t("cases.exitOperation")}
              </Button>
            </Group>
          </Group>

          {isLoading ? (
            <Box py="xl" sx={{ textAlign: "center" }}>
              <Loader size="lg" />
              <Text mt="md" color="dark.1">
                {t("cases.loading")}
              </Text>
            </Box>
          ) : collections.length === 0 ? (
            <Text color="dark.1" align="center" py="xl">
              {isAdmin 
                ? t("collections.noCollectionsYet")
                : t("cases.noCasesYetUser")}
            </Text>
          ) : (
            <SimpleGrid cols={3} spacing="lg">
              {collections.map((artwork) => (
                <Paper 
                  key={artwork.id} 
                  p="md" 
                  withBorder
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                  onClick={() => handleViewDetail(artwork.id)}
                >
                  <Stack spacing="md">
                    {/* 非编辑模式下显示静态图片 */}
                    {editingArtworkId !== artwork.id && (
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
                    )}

                    {editingArtworkId === artwork.id ? (
                      <Stack spacing="sm" onClick={(e) => e.stopPropagation()}>
                        {/* 图片管理区域 */}
                        <Box>
                          <Text size="sm" weight={500} mb="xs">
                            {shopMode 
                              ? (locale === "zh" ? "商品图片" : "Product Images")
                              : t("collections.collectionImages")}
                          </Text>
                          
                          {/* 大图预览 - 显示当前选中的封面 */}
                          <Box
                            sx={{
                              height: 240,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(34, 39, 47, 0.5)",
                              borderRadius: 6,
                              marginBottom: "md",
                            }}
                          >
                            <Box
                              component="img"
                              src={editImages[editCoverIndex] || editImages[0] || artwork.image}
                              alt={artwork.title}
                              sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            />
                          </Box>
                          
                          {/* 缩略图网格 */}
                          <SimpleGrid cols={3} spacing="xs">
                            {editImages.map((img, index) => (
                              <Box 
                                key={index}
                                sx={{
                                  position: "relative",
                                  height: 80,
                                  border: editCoverIndex === index ? "2px solid #d8b76d" : "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 4,
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  backgroundColor: "rgba(34, 39, 47, 0.5)",
                                  "&:hover": {
                                    borderColor: "#d8b76d",
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSetCoverImage(index);
                                }}
                              >
                                <Box
                                  component="img"
                                  src={img}
                                  alt={`Image ${index + 1}`}
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                                
                                {/* 封面标记 */}
                                {index === editCoverIndex && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      left: 4,
                                      backgroundColor: "#d8b76d",
                                      borderRadius: 4,
                                      padding: "2px 6px",
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: "#000",
                                    }}
                                  >
                                    {t("collections.coverBadge")}
                                  </Box>
                                )}
                                
                                {/* 删除按钮 */}
                                <Box
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (editImages.length > 1) {
                                      handleEditRemoveImage(index);
                                    }
                                  }}
                                  sx={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    backgroundColor: editImages.length > 1 ? "rgba(255, 0, 0, 0.85)" : "rgba(128, 128, 128, 0.5)",
                                    borderRadius: "50%",
                                    width: 20,
                                    height: 20,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: editImages.length > 1 ? "pointer" : "not-allowed",
                                    zIndex: 10
                                  }}
                                >
                                  <IconX size={12} color="#fff" />
                                </Box>
                              </Box>
                            ))}
                            
                            {/* 添加图片按钮 */}
                            <FileButton
                              onChange={handleEditAddImages}
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              multiple
                            >
                              {(props) => (
                                <Box
                                  {...props}
                                  sx={{
                                    height: 80,
                                    border: "2px dashed rgba(216, 183, 109, 0.4)",
                                    borderRadius: 4,
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
                                  <IconPlus size={24} color="#d8b76d" />
                                  <Text size="xs" color="dark.1" mt="xs">
                                    {shopMode ? (locale === "zh" ? "添加商品图片" : "Add Product") : (locale === "zh" ? "添加" : "Add")}
                                  </Text>
                                </Box>
                              )}
                            </FileButton>
                          </SimpleGrid>
                          <Text size="xs" color="dimmed" mt="xs">
                            {t("collections.clickThumbnailHint")}
                          </Text>
                        </Box>

                        <TextInput
                          label={shopMode 
                            ? (locale === "zh" ? "商品名称" : "Product Name")
                            : t("collections.editCollectionName")}
                          value={editItemName}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleEditItemNameChange(e);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Textarea
                          label={shopMode 
                            ? (locale === "zh" ? "商品介绍" : "Product Description")
                            : t("collections.editCollectionDetails")}
                          value={editItemDetails}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleEditItemDetailsChange(e);
                          }}
                          minRows={2}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Select
                          label={t("collections.editCategory")}
                          value={editCategory}
                          onChange={(value) => setEditCategory(value || "misc")}
                          data={collectionCategoryOptions.map((option) => ({
                            value: option.value,
                            label: t(option.labelKey),
                          }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* 编辑时的可售字段 */}
                        <Checkbox
                          label={t("collections.editForSale")}
                          checked={editIsForSale}
                          onChange={(event) => {
                            event.stopPropagation();
                            setEditIsForSale(event.currentTarget.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {editIsForSale && (
                          <SimpleGrid cols={2} spacing="xs">
                            <Box>
                              <Text size="sm" weight={500} mb={4}>
                                {t("collections.editPrice")}
                                <Text component="span" color="red" ml={4}>*</Text>
                              </Text>
                              <TextInput
                                value={editPrice}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setEditPrice(event.currentTarget.value);
                                }}
                                placeholder={t("collections.pricePlaceholderExample")}
                                onClick={(e) => e.stopPropagation()}
                                required
                              />
                            </Box>
                            <Box>
                              <Text size="sm" weight={500} mb={4}>
                                {t("collections.currencyLabel")}
                                <Text component="span" color="red" ml={4}>*</Text>
                              </Text>
                              <Select
                                value={editCurrency}
                                onChange={(value) => setEditCurrency((value as "USD" | "CNY") || "USD")}
                                data={[
                                  { value: "USD", label: locale === "zh" ? "美元 (USD)" : "USD" },
                                  { value: "CNY", label: locale === "zh" ? "人民币 (CNY)" : "CNY" },
                                ]}
                                onClick={(e) => e.stopPropagation()}
                                required
                              />
                            </Box>
                          </SimpleGrid>
                        )}
                        
                        <Group position="right">
                          <Button
                            variant="filled"
                            color="blue"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetEditForm();
                            }}
                            leftIcon={<IconX size={16} />}
                            sx={{
                              fontWeight: 600,
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {t("collections.cancelEdit")}
                          </Button>
                          <Button
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(artwork);
                            }}
                            leftIcon={<IconCheck size={14} />}
                          >
                            {t("collections.saveButton")}
                          </Button>
                        </Group>
                      </Stack>
                    ) : (
                      <>
                        {/* ✅ 非编辑模式：显示基本信息（名称、编号、价格）和操作按钮 */}
                        <Stack spacing="xs">
                          <Text weight={600} size="lg">{artwork.title}</Text>
                          
                          {artwork.collectionId && (
                            <Badge variant="outline" size="sm">
                              {shopMode 
                                ? (locale === "zh" ? "商品编号" : "Product ID")
                                : t("collections.collectionIdLabel")}: {artwork.collectionId}
                            </Badge>
                          )}
                          
                          {artwork.isForSale && artwork.price && (
                            <Badge color="green" size="md" sx={{ fontWeight: 600, fontSize: 14 }}>
                              {t("collections.forSaleLabel")}: {artwork.currency === 'CNY' ? '¥' : '$'}{artwork.price.toLocaleString()}
                            </Badge>
                          )}
                        </Stack>
                        
                        <Group position="right" spacing="xs">
                          <Button
                            variant="filled"
                            color="blue"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(artwork);
                            }}
                            leftIcon={<IconEdit size={16} />}
                            sx={{
                              fontWeight: 600,
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {t("collections.edit")}
                          </Button>
                          {(isAdmin || artwork.uploadedBy === userId) && (
                            <Button
                              variant="filled"
                              color="red"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImportedArtwork(artwork.id);
                              }}
                              leftIcon={<IconTrash size={16} />}
                              sx={{
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {t("collections.delete")}
                            </Button>
                          )}
                        </Group>
                      </>
                    )}
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </OuterWrapper>
    );
  }

  // 上传模式（默认）
  return (
    <OuterWrapper>
      <Stack spacing="xl">
        <Paper p="xl">
          <Stack spacing="lg">
            <Group position="apart">
              <div>
                <Title order={2}>
                  {shopMode 
                    ? (locale === "zh" ? "商品管理" : "Product Management")
                    : t("collections.managementTitle")}
                </Title>
                <Text color="dark.1">
                  {isAdmin 
                    ? (shopMode 
                        ? (locale === "zh" ? "管理员模式：您可以上传和管理商店商品。" : "Admin mode: You can upload and manage shop products.")
                        : t("collections.adminModeText"))
                    : t("collections.noPermissionText")}
                </Text>
              </div>
              <input
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
                id="collection-upload-input"
              />
              <Button
                onClick={() => document.getElementById('collection-upload-input')?.click()}
                leftIcon={<IconDatabaseImport size={18} />}
              >
                {t("collections.uploadImageButton")}
              </Button>
            </Group>

            {adminError && (
              <Alert color="red" title={t("collections.importFailed")}>
                {adminError}
              </Alert>
            )}

            {/* 多图片上传区域 */}
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
                    {t("collections.coverBadge")}
                  </Badge>
                </Box>

                {/* 所有图片缩略图网格 */}
                <div>
                  <Text weight={600} mb="sm">
                    {t("collections.allPhotos")}（{adminImages.length} {t("cases.photosCount")}）
                  </Text>
                  <SimpleGrid cols={4} spacing="sm" breakpoints={[{ maxWidth: "sm", cols: 2 }]}>
                    {adminImages.map((imgUrl, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          position: "relative",
                          border: adminCoverIndex === index ? "3px solid #d8b76d" : "1px solid rgba(216, 183, 109, 0.18)",
                          borderRadius: 6,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "#d8b76d",
                            transform: "scale(1.02)"
                          }
                        }}
                        onClick={() => handleSetCoverImage(index)}
                      >
                        <Box
                          component="img"
                          src={imgUrl} 
                          alt={`Photo ${index + 1}`}
                          sx={{
                            width: "100%",
                            height: 120,
                            objectFit: "contain",
                            display: "block",
                            backgroundColor: "rgba(34, 39, 47, 0.5)"
                          }}
                        />
                        
                        {/* 封面标记徽章 */}
                        {adminCoverIndex === index && (
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
                            {shopMode ? (locale === "zh" ? "主图" : "Main") : (locale === "zh" ? "封面" : "Cover")}
                          </Badge>
                        )}

                        {/* 删除按钮 */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          sx={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            backgroundColor: "rgba(255, 0, 0, 0.85)",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            "&:hover": {
                              backgroundColor: "rgba(255, 0, 0, 1)",
                              transform: "scale(1.1)"
                            },
                            zIndex: 10
                          }}
                        >
                          <IconX size={14} color="#fff" />
                        </Box>
                      </Box>
                    ))}
                    
                    {/* 添加更多图片按钮 */}
                    <Box
                      onClick={() => document.getElementById('collection-upload-input')?.click()}
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
                        {shopMode ? (locale === "zh" ? "添加商品图片" : "Add Product Image") : (locale === "zh" ? "添加图片" : "Add Image")}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </div>
              </Stack>
            )}

            {adminImages.length === 0 && (
              <Box sx={{ height: 300, border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34, 39, 47, 0.5)" }}>
                <Stack spacing="sm" align="center">
                  <IconPhoto size={44} color="#d8b76d" />
                  <Text weight={600}>{t("collections.noPreviewImages")}</Text>
                  <Text size="sm" color="dark.1">
                    {shopMode 
                      ? (locale === "zh" ? "请上传商品图片（支持多选）" : "Please upload product images (multiple selection supported)")
                      : t("collections.uploadImagesMultiplePrompt")}
                  </Text>
                </Stack>
              </Box>
            )}

            <TextInput
              label={shopMode 
                ? (locale === "zh" ? "商品编号" : "Product ID")
                : t("collections.collectionIdLabel")}
              value={adminCollectionId}
              disabled
              placeholder=""
              description={t("collections.collectionIdDescription")}
            />

            <Box>
              <Text size="sm" weight={500} mb={4}>
                {shopMode 
                  ? (locale === "zh" ? "商品名称" : "Product Name")
                  : t("collections.collectionNameRequired")}
                <Text component="span" color="red" ml={4}>*</Text>
              </Text>
              <TextInput
                value={adminItemName}
                onChange={handleItemNameChange}
                placeholder={shopMode 
                  ? (locale === "zh" ? "输入商品名称" : "Enter product name")
                  : t("collections.collectionNamePlaceholder")}
                required
              />
            </Box>

            <Textarea
              label={shopMode 
                ? (locale === "zh" ? "商品介绍" : "Product Description")
                : t("collections.collectionDescription")}
              value={adminItemDetails}
              onChange={handleItemDetailsChange}
              placeholder={shopMode 
                ? (locale === "zh" ? "描述商品的详细信息、材质、年代等" : "Describe the product details, materials, period, etc.")
                : t("collections.collectionDescriptionPlaceholder")}
              minRows={3}
            />

            <Select
              label={t("collections.categoryLabel")}
              value={adminCategory}
              onChange={(value) => setAdminCategory(value || "misc")}
              data={collectionCategoryOptions.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />

            {/* ✅ 可售相关字段 - 商店模式隐藏 Checkbox（强制为 true） */}
            {!shopMode && (
              <Checkbox
                label={t("collections.forSaleLabel")}
                checked={adminIsForSale}
                onChange={(event) => setAdminIsForSale(event.currentTarget.checked)}
                description={t("collections.forSaleDescription")}
              />
            )}

            {/* ✅ 商店模式始终显示价格和货币输入框，藏品展示模式仅在 isForSale 时显示 */}
            {(shopMode || adminIsForSale) && (
              <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                <Box>
                  <Text size="sm" weight={500} mb={4}>
                    {t("collections.priceLabel")}
                    <Text component="span" color="red" ml={4}>*</Text>
                  </Text>
                  <TextInput
                    value={adminPrice}
                    onChange={(event) => setAdminPrice(event.currentTarget.value)}
                    placeholder={t("collections.pricePlaceholderExample")}
                    required
                  />
                </Box>

                <Box>
                  <Text size="sm" weight={500} mb={4}>
                    {t("collections.currencyLabel")}
                    <Text component="span" color="red" ml={4}>*</Text>
                  </Text>
                  <Select
                    value={adminCurrency}
                    onChange={(value) => setAdminCurrency((value as "USD" | "CNY") || "USD")}
                    data={[
                      { value: "USD", label: locale === "zh" ? "美元 (USD)" : "USD" },
                      { value: "CNY", label: locale === "zh" ? "人民币 (CNY)" : "CNY" },
                    ]}
                    required
                  />
                </Box>
              </SimpleGrid>
            )}

            <Group position="right">
              <Button
                variant="filled"
                color="blue"
                size="md"
                onClick={handleCancel}
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
                {t("collections.cancelButton")}
              </Button>
              <Button
                onClick={handleSaveToKnowledgeBase}
                leftIcon={<IconCheck size={16} />}
                disabled={
                  adminImages.length === 0 || 
                  !adminItemName.trim() || 
                  (shopMode ? !adminPrice.trim() || parseFloat(adminPrice) <= 0 : (adminIsForSale && (!adminPrice.trim() || parseFloat(adminPrice) <= 0)))
                } // ✅ 商店模式强制要求价格，藏品展示模式仅在 isForSale 时要求
              >
                {t("collections.saveButton")}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {manageMessage && (
          <Alert color="green" title={t("cases.success")}>
            {manageMessage}
          </Alert>
        )}
      </Stack>
    </OuterWrapper>
  );
});

export default CollectionsManagementSection;
