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
  Container,
  FileButton,
  Group,
  Image,
  Paper,
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
import { useEffect, useState, useRef } from "react";

type CasesManagementProps = {
  userId?: string;
  isAdmin?: boolean;
};

export default function CasesManagementSection({ userId, isAdmin }: CasesManagementProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<Artwork[]>([]);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 多图片上传状态
  const [adminImages, setAdminImages] = useState<string[]>([]); // 所有图片URL数组
  const [adminCoverIndex, setAdminCoverIndex] = useState<number>(0); // 封面照片索引
  
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

  useEffect(() => {
    void fetchKnowledgeBase().then(setItems);
  }, []);

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

  const handleAdminUpload = (files: File[] | null) => {
    console.log('[CasesManagement] handleAdminUpload called with files:', files);
    if (!files || files.length === 0) {
      console.log('[CasesManagement] No files selected');
      return;
    }
    
    console.log('[CasesManagement] Processing', files.length, 'files');
    // 将选择的文件转换为 URL 数组
    const urls = files.map(file => URL.createObjectURL(file));
    console.log('[CasesManagement] Created URLs:', urls);
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

  const resetForm = () => {
    setAdminImages([]);
    setAdminCoverIndex(0);
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
  };

  const handleSaveToKnowledgeBase = async () => {
    if (adminImages.length === 0) {
      setAdminError("请至少上传一张图片");
      return;
    }

    try {
      const caseRecord: ArtworkCaseRecord = {
        caseId: adminCaseId || "",
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
        title: adminItemDetails || "未命名案例",
        category: "misc",
        period: "",
        image: adminImages[adminCoverIndex], // 封面照片
        galleryImages: adminImages, // 所有照片
        description: adminItemDetails || "",
        listingType: "product",
        caseRecord,
        uploadedBy: userId, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0], // 占位符
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
    setEditItemDetails(artwork.description || "");
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
  };

  const handleSaveEdit = async (artwork: Artwork) => {
    try {
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

      const updatedArtwork: Artwork = {
        ...artwork,
        title: editItemDetails || artwork.title,
        description: editItemDetails || artwork.description,
        caseRecord,
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
    if (!confirm("确定要删除这个案例吗？")) return;
    try {
      await deleteImportedArtwork(id);
      setManageMessage("删除成功");
      const updated = await fetchKnowledgeBase();
      setItems(updated);
    } catch (error: any) {
      setAdminError(error.message || "删除失败");
    }
  };

  // 如果未登录，显示提示
  if (!userId) {
    return (
      <Container fluid pt={80} pb={120}>
        <Paper p="xl">
          <Stack spacing="sm" align="center">
            <IconLock size={48} color="red" />
            <Title order={2} color="red">需要登录</Title>
            <Text color="dark.1" align="center">
              请先登录后才能管理回流案例。<br />
              登录后可上传和管理自己的案例。
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container fluid pt={80} pb={120}>
      <Stack spacing="xl">
        <Paper p="xl">
          <Stack spacing="lg">
            <Group position="apart">
              <div>
                <Title order={2}>回流案例管理</Title>
                <Text color="dark.1">
                  {isAdmin 
                    ? "管理员模式：可以管理所有回流案例" 
                    : "个人用户模式：只能管理您上传的案例"}
                </Text>
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
                onClick={() => {
                  console.log('[CasesManagement] Button clicked');
                  console.log('[CasesManagement] File input ref:', fileInputRef.current);
                  if (fileInputRef.current) {
                    console.log('[CasesManagement] Triggering click via ref');
                    fileInputRef.current.click();
                  } else {
                    console.error('[CasesManagement] File input ref is null!');
                  }
                }}
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
                  <Text size="sm" color="dark.1">请上传案例图片（支持多选）</Text>
                </Stack>
              </Box>
            )}

            <Textarea
              label="案例详情"
              value={adminItemDetails}
              onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
              placeholder="请输入案例的详细介绍、背景信息等"
              minRows={3}
            />

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
              <TextInput
                label="案例编号"
                value={adminCaseId}
                onChange={(event) => setAdminCaseId(event.currentTarget.value)}
                placeholder="可选"
              />
              <TextInput
                label="成交价格"
                value={adminSalePrice}
                onChange={(event) => setAdminSalePrice(event.currentTarget.value)}
                placeholder="例如: ¥50,000"
              />
              <TextInput
                label="成交时间"
                value={adminSaleTime}
                onChange={(event) => setAdminSaleTime(event.currentTarget.value)}
                placeholder="例如: 2024-01-15"
              />
              <TextInput
                label="交易平台"
                value={adminSalePlatform}
                onChange={(event) => setAdminSalePlatform(event.currentTarget.value)}
                placeholder="例如: 苏富比"
              />
              <TextInput
                label="客户地区"
                value={adminClientRegion}
                onChange={(event) => setAdminClientRegion(event.currentTarget.value)}
                placeholder="例如: 北京"
              />
              <TextInput
                label="物流成本"
                value={adminLogisticsCost}
                onChange={(event) => setAdminLogisticsCost(event.currentTarget.value)}
                placeholder="例如: ¥2,000"
              />
              <TextInput
                label="收购渠道"
                value={adminPurchaseChannel}
                onChange={(event) => setAdminPurchaseChannel(event.currentTarget.value)}
                placeholder="例如: 私人收藏"
              />
              <TextInput
                label="收购成本"
                value={adminPurchaseCost}
                onChange={(event) => setAdminPurchaseCost(event.currentTarget.value)}
                placeholder="例如: ¥30,000"
              />
            </SimpleGrid>

            <Textarea
              label="风险提示"
              value={adminRiskAdvice}
              onChange={(event) => setAdminRiskAdvice(event.currentTarget.value)}
              placeholder="请输入相关的风险提示和建议"
              minRows={2}
            />

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
                disabled={adminImages.length === 0}
              >
                保存案例
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
              <Title order={3}>我的回流案例</Title>
              <Badge color="blue" size="lg">
                {cases.length} 个
              </Badge>
            </Group>

            {cases.length === 0 ? (
              <Text color="dark.1" align="center" py="xl">
                暂无案例。{isAdmin ? "请上传新案例或等待其他用户上传。" : "请上传您的回流案例。"}
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

                      {editingArtworkId === artwork.id ? (
                        <Stack spacing="sm">
                          <Textarea
                            label="案例详情"
                            value={editItemDetails}
                            onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                            minRows={2}
                          />
                          <SimpleGrid cols={2} spacing="xs">
                            <TextInput
                              label="案例编号"
                              value={editCaseId}
                              onChange={(event) => setEditCaseId(event.currentTarget.value)}
                            />
                            <TextInput
                              label="成交价格"
                              value={editSalePrice}
                              onChange={(event) => setEditSalePrice(event.currentTarget.value)}
                            />
                            <TextInput
                              label="成交时间"
                              value={editSaleTime}
                              onChange={(event) => setEditSaleTime(event.currentTarget.value)}
                            />
                            <TextInput
                              label="交易平台"
                              value={editSalePlatform}
                              onChange={(event) => setEditSalePlatform(event.currentTarget.value)}
                            />
                          </SimpleGrid>
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
                          {artwork.caseRecord && (
                            <Stack spacing="xs">
                              {artwork.caseRecord.salePrice && (
                                <Text size="sm">
                                  <strong>成交价格:</strong> {artwork.caseRecord.salePrice}
                                </Text>
                              )}
                              {artwork.caseRecord.saleTime && (
                                <Text size="sm">
                                  <strong>成交时间:</strong> {artwork.caseRecord.saleTime}
                                </Text>
                              )}
                              {artwork.caseRecord.salePlatform && (
                                <Text size="sm">
                                  <strong>交易平台:</strong> {artwork.caseRecord.salePlatform}
                                </Text>
                              )}
                            </Stack>
                          )}
                          <Group position="right">
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() => handleStartEdit(artwork)}
                              leftIcon={<IconEdit size={14} />}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="subtle"
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
    </Container>
  );
}
