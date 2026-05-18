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
  NumberInput,
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
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Fragment, useEffect, useState } from "react";

const collectionCategoryOptions = [
  { value: "calligraphy", labelKey: "collections.tabCalligraphy" },
  { value: "misc", labelKey: "collections.tabMisc" },
  { value: "porcelain", labelKey: "collections.tabPorcelain" },
  { value: "jade", labelKey: "collections.tabJade" },
  { value: "bronze", labelKey: "collections.tabBronze" },
] as const;

const currencyOptions = [
  { value: "USD", label: "美元 (USD)" },
  { value: "CNY", label: "人民币 (CNY)" },
] as const;

type CollectionsManagementProps = {
  userId?: string;
  isAdmin?: boolean;
  embedded?: boolean; // 是否作为嵌入式组件使用（移除外层容器）
};

export default function CollectionsManagementSection({ userId, isAdmin, embedded = false }: CollectionsManagementProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);
  
  // 多图片上传状态
  const [adminImages, setAdminImages] = useState<string[]>([]); // 所有图片URL数组
  const [adminCoverIndex, setAdminCoverIndex] = useState<number>(0); // 封面照片索引
  
  const [adminCollectionId, setAdminCollectionId] = useState(""); // 藏品编号
  const [adminItemName, setAdminItemName] = useState(""); // 藏品名称
  const [adminItemDetails, setAdminItemDetails] = useState(""); // 藏品介绍
  const [adminCategory, setAdminCategory] = useState("misc");
  
  // 可售相关字段
  const [adminIsForSale, setAdminIsForSale] = useState(false);
  const [adminPrice, setAdminPrice] = useState<number | "">("");
  const [adminCurrency, setAdminCurrency] = useState<"USD" | "CNY">("USD");
  
  const [adminError, setAdminError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editCollectionId, setEditCollectionId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemDetails, setEditItemDetails] = useState("");
  const [editCategory, setEditCategory] = useState("misc");
  
  // 编辑时的可售字段
  const [editIsForSale, setEditIsForSale] = useState(false);
  const [editPrice, setEditPrice] = useState<number | "">("");
  const [editCurrency, setEditCurrency] = useState<"USD" | "CNY">("USD");

  useEffect(() => {
    void fetchKnowledgeBase().then(setItems);
  }, []);

  // 根据用户角色过滤藏品列表
  const collections = items.filter((item) => {
    if (!item.caseRecord) {
      // 管理员可以看到所有内容
      if (isAdmin) return true;
      // 普通用户只能看到自己上传的内容
      if (userId && item.uploadedBy === userId) return true;
      // 如果没有 uploadedBy 字段（旧数据），对普通用户隐藏
      return false;
    }
    return false;
  });

  const handleAdminUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
    // 将选择的文件转换为 URL 数组
    const urls = files.map(file => URL.createObjectURL(file));
    setAdminImages(urls);
    setAdminCoverIndex(0); // 默认第一张为封面
    setAdminError(null);
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

  // 生成唯一的藏品编号
  const generateCollectionId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `COL-${timestamp}-${random}`;
  };

  const resetForm = () => {
    setAdminImages([]);
    setAdminCoverIndex(0);
    setAdminCollectionId("");
    setAdminItemName("");
    setAdminItemDetails("");
    setAdminCategory("misc");
    setAdminIsForSale(false);
    setAdminPrice("");
    setAdminCurrency("USD");
  };

  const handleSaveToKnowledgeBase = async () => {
    if (adminImages.length === 0) {
      setAdminError("请至少上传一张图片");
      return;
    }

    if (!adminItemName.trim()) {
      setAdminError("请输入藏品名称");
      return;
    }

    try {
      // 生成或使用手动输入的藏品编号
      const collectionId = adminCollectionId.trim() || generateCollectionId();
      
      // 检查藏品编号是否已存在
      const existingArtwork = items.find(item => item.collectionId === collectionId);
      if (existingArtwork) {
        setAdminError(`藏品编号 "${collectionId}" 已存在，请使用其他编号`);
        return;
      }

      // 封面照片作为 image，所有照片（包括封面）存入 galleryImages
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
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0], // 占位符，8个元素
        collectionId: collectionId, // 藏品编号
        isForSale: adminIsForSale, // 是否可售
        price: adminIsForSale && adminPrice !== "" ? Number(adminPrice) : undefined, // 售价
        currency: adminIsForSale ? adminCurrency : undefined, // 货币单位
      };

      await saveImportedArtwork(newArtwork);

      setManageMessage("导入成功");
      resetForm();
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || "导入失败");
    }
  };

  const handleStartEdit = (artwork: Artwork) => {
    setEditingArtworkId(artwork.id);
    setEditCollectionId(artwork.collectionId || "");
    setEditItemName(artwork.title || "");
    setEditItemDetails(artwork.description || "");
    setEditCategory(artwork.category || "misc");
    setEditIsForSale(artwork.isForSale || false);
    setEditPrice(artwork.price || "");
    setEditCurrency(artwork.currency || "USD");
  };

  const resetEditForm = () => {
    setEditingArtworkId(null);
    setEditCollectionId("");
    setEditItemName("");
    setEditItemDetails("");
    setEditCategory("misc");
    setEditIsForSale(false);
    setEditPrice("");
    setEditCurrency("USD");
  };

  const handleSaveEdit = async (artwork: Artwork) => {
    if (!editItemName.trim()) {
      setAdminError("请输入藏品名称");
      return;
    }

    try {
      const updatedArtwork: Artwork = {
        ...artwork,
        title: editItemName.trim(),
        description: editItemDetails || artwork.description,
        category: editCategory,
        collectionId: editCollectionId || artwork.collectionId,
        isForSale: editIsForSale,
        price: editIsForSale && editPrice !== "" ? Number(editPrice) : undefined,
        currency: editIsForSale ? editCurrency : undefined,
      };

      await updateImportedArtwork(updatedArtwork);

      setManageMessage("更新成功");
      resetEditForm();
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || "更新失败");
    }
  };

  const handleDeleteImportedArtwork = async (id: string) => {
    if (!confirm("确定要删除这个藏品吗？")) return;
    try {
      await deleteImportedArtwork(id);
      setManageMessage("删除成功");
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || "删除失败");
    }
  };

  // 辅助组件：根据 embedded 属性渲染外层容器
  const OuterWrapper = ({ children }: { children: React.ReactNode }) => {
    if (embedded) {
      return <>{children}</>;
    }
    return <Container fluid pt={80} pb={120}>{children}</Container>;
  };

  // 如果未登录，显示提示
  if (!userId) {
    return (
      <OuterWrapper>
        <Paper p="xl">
          <Stack spacing="sm" align="center">
            <IconLock size={48} color="red" />
            <Title order={2} color="red">需要登录</Title>
            <Text color="dark.1" align="center">
              请先登录后才能查看藏品信息。<br />
              仅管理员可以上传和管理藏品。
            </Text>
          </Stack>
        </Paper>
      </OuterWrapper>
    );
  }

  // 如果不是管理员，只显示浏览功能（不显示上传表单）
  if (!isAdmin) {
    return (
      <OuterWrapper>
        <Paper p="xl">
          <Stack spacing="md">
            <Group position="apart">
              <Title order={3}>藏品展示</Title>
              <Badge color="blue" size="lg">
                {collections.length} 件
              </Badge>
            </Group>

            {collections.length === 0 ? (
              <Text color="dark.1" align="center" py="xl">
                暂无藏品展示。
              </Text>
            ) : (
              <SimpleGrid cols={3} spacing="lg">
                {collections.map((artwork) => (
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
                      {artwork.collectionId && (
                        <Badge variant="outline" size="sm">
                          编号: {artwork.collectionId}
                        </Badge>
                      )}
                      {artwork.isForSale && artwork.price && (
                        <Badge color="green" size="sm">
                          可售: {artwork.currency === 'CNY' ? '¥' : '$'}{artwork.price.toLocaleString()}
                        </Badge>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Paper>
      </OuterWrapper>
    );
  }

  // 管理员模式：显示上传和管理功能
  return (
    <OuterWrapper>
      <Stack spacing="xl">
        <Paper p="xl">
          <Stack spacing="lg">
            <Group position="apart">
              <div>
                <Title order={2}>藏品管理</Title>
                <Text color="dark.1">
                  {isAdmin 
                    ? "管理员模式：可以管理所有藏品" 
                    : "个人用户模式：只能浏览藏品，无上传权限"}
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
                上传多张图片
              </Button>
            </Group>

            {adminError && (
              <Alert color="red" title="导入失败">
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
                    封面照片
                  </Badge>
                </Box>

                {/* 所有图片缩略图网格 */}
                <div>
                  <Text weight={600} mb="sm">所有照片（点击星号设为封面）</Text>
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
                  <Text weight={600}>暂无预览图片</Text>
                  <Text size="sm" color="dark.1">请上传藏品图片（支持多选）</Text>
                </Stack>
              </Box>
            )}

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
              <TextInput
                label="藏品编号"
                value={adminCollectionId}
                onChange={(event) => setAdminCollectionId(event.currentTarget.value)}
                placeholder="留空则自动生成（格式：COL-XXXXX-XXXX）"
              />

              <TextInput
                label="藏品名称 *"
                value={adminItemName}
                onChange={(event) => setAdminItemName(event.currentTarget.value)}
                placeholder="请输入藏品名称（必填）"
                required
              />
            </SimpleGrid>

            <Textarea
              label="藏品介绍"
              value={adminItemDetails}
              onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
              placeholder="请输入藏品的详细介绍、历史背景、工艺特点等"
              minRows={3}
            />

            <Select
              label="藏品分类"
              value={adminCategory}
              onChange={(value) => setAdminCategory(value || "misc")}
              data={collectionCategoryOptions.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />

            {/* 可售相关字段 - 使用 Checkbox */}
            <Checkbox
              label="是否可售"
              checked={adminIsForSale}
              onChange={(event) => setAdminIsForSale(event.currentTarget.checked)}
              description="勾选后需填写价格和货币单位"
            />

            {adminIsForSale && (
              <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                <NumberInput
                  label="售价 *"
                  value={adminPrice}
                  onChange={(value) => setAdminPrice(value === "" ? "" : Number(value))}
                  placeholder="请输入售价"
                  min={0}
                  precision={2}
                  required
                />

                <Select
                  label="货币单位 *"
                  value={adminCurrency}
                  onChange={(value) => setAdminCurrency((value as "USD" | "CNY") || "USD")}
                  data={currencyOptions}
                  required
                />
              </SimpleGrid>
            )}

            <Group position="right">
              <Button
                variant="default"
                onClick={resetForm}
                leftIcon={<IconX size={16} />}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveToKnowledgeBase}
                leftIcon={<IconCheck size={16} />}
                disabled={adminImages.length === 0 || !adminItemName.trim() || (adminIsForSale && (adminPrice === "" || adminPrice === 0))}
              >
                保存藏品
              </Button>
            </Group>
          </Stack>
        </Paper>

        {manageMessage && (
          <Alert color="green" title="操作成功">
            {manageMessage}
          </Alert>
        )}

        <Paper p="xl">
          <Stack spacing="md">
            <Group position="apart">
              <Title order={3}>已上传的藏品</Title>
              <Badge color="blue" size="lg">
                {collections.length} 件
              </Badge>
            </Group>

            {collections.length === 0 ? (
              <Text color="dark.1" align="center" py="xl">
                暂无藏品。请上传新藏品。
              </Text>
            ) : (
              <SimpleGrid cols={3} spacing="lg">
                {collections.map((artwork) => (
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

                      {editingArtworkId === artwork.id ? (
                        <Stack spacing="sm">
                          <SimpleGrid cols={2} spacing="xs">
                            <TextInput
                              label="藏品编号"
                              value={editCollectionId}
                              onChange={(event) => setEditCollectionId(event.currentTarget.value)}
                            />
                            <TextInput
                              label="藏品名称"
                              value={editItemName}
                              onChange={(event) => setEditItemName(event.currentTarget.value)}
                            />
                          </SimpleGrid>
                          <Textarea
                            label="藏品详情"
                            value={editItemDetails}
                            onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                            minRows={2}
                          />
                          <Select
                            label="藏品分类"
                            value={editCategory}
                            onChange={(value) => setEditCategory(value || "misc")}
                            data={collectionCategoryOptions.map((option) => ({
                              value: option.value,
                              label: t(option.labelKey),
                            }))}
                          />
                          
                          {/* 编辑时的可售字段 - 使用 Checkbox */}
                          <Checkbox
                            label="是否可售"
                            checked={editIsForSale}
                            onChange={(event) => setEditIsForSale(event.currentTarget.checked)}
                          />

                          {editIsForSale && (
                            <SimpleGrid cols={2} spacing="xs">
                              <NumberInput
                                label="售价"
                                value={editPrice}
                                onChange={(value) => setEditPrice(value === "" ? "" : Number(value))}
                                min={0}
                                precision={2}
                              />

                              <Select
                                label="货币单位"
                                value={editCurrency}
                                onChange={(value) => setEditCurrency((value as "USD" | "CNY") || "USD")}
                                data={currencyOptions}
                              />
                            </SimpleGrid>
                          )}
                          
                          <Group position="right">
                            <Button
                              variant="default"
                              size="xs"
                              onClick={resetEditForm}
                              leftIcon={<IconX size={14} />}
                            >
                              取消
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleSaveEdit(artwork)}
                              leftIcon={<IconCheck size={14} />}
                            >
                              保存
                            </Button>
                          </Group>
                        </Stack>
                      ) : (
                        <>
                          <Text weight={600}>{artwork.title}</Text>
                          <Text size="sm" color="dark.1" lineClamp={2}>
                            {artwork.description}
                          </Text>
                          {artwork.collectionId && (
                            <Badge variant="outline" size="sm">
                              编号: {artwork.collectionId}
                            </Badge>
                          )}
                          {artwork.isForSale && artwork.price && (
                            <Badge color="green" size="sm">
                              可售: {artwork.currency === 'CNY' ? '¥' : '$'}{artwork.price.toLocaleString()}
                            </Badge>
                          )}
                          <Group position="right">
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() => handleStartEdit(artwork)}
                              leftIcon={<IconEdit size={14} />}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="light"
                              color="red"
                              size="xs"
                              onClick={() => handleDeleteImportedArtwork(artwork.id)}
                              leftIcon={<IconTrash size={14} />}
                            >
                              删除
                            </Button>
                          </Group>
                        </>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Paper>
      </Stack>
    </OuterWrapper>
  );
}