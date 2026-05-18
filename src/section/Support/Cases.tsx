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
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  FileButton,
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
  IconEdit,
  IconLock,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

export default function CasesSection() {
  const { locale, t } = useI18n();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Artwork[]>([]);
  
  // 管理状态
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [adminPreviewUrl, setAdminPreviewUrl] = useState<string | null>(null);
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
  
  // 编辑状态
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
  const cases = useMemo(() => {
    return items.filter((item) => {
      if (!item.caseRecord) return false;
      
      // 管理员可以看到所有内容
      if (isAdmin) return true;
      
      // 普通用户只能看到自己上传的内容或平台案例（没有 uploadedBy 的旧数据）
      if (user && (item.uploadedBy === user.id || !item.uploadedBy)) return true;
      
      // 未登录用户只能看到平台案例
      return !item.uploadedBy;
    });
  }, [items, user, isAdmin]);

  const handleUpload = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAdminPreviewUrl(url);
    setAdminError(null);
  };

  const resetForm = () => {
    setAdminPreviewUrl(null);
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
    setShowUploadForm(false);
  };

  const handleSaveToKnowledgeBase = async () => {
    if (!adminPreviewUrl) {
      setAdminError("请上传图片");
      return;
    }

    if (!user) {
      setAdminError("请先登录");
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

      const newArtwork: Artwork = {
        id: `imported-${Date.now()}`,
        title: adminItemDetails || "未命名案例",
        category: "misc",
        period: "",
        image: adminPreviewUrl,
        description: adminItemDetails || "",
        listingType: "product",
        caseRecord,
        uploadedBy: user.id, // 记录上传者
        featureVector: [0, 0, 0, 0, 0, 0, 0, 0],
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
    if (!artwork.uploadedBy) return null;
    
    // 只有管理员可以看到具体用户信息
    if (isAdmin) {
      return artwork.uploadedBy === user?.id 
        ? (locale === "zh" ? "我（管理员）" : "Me (Admin)")
        : (locale === "zh" ? "其他用户" : "Other User");
    }
    
    // 普通用户和未登录用户只能看到通用提示
    return locale === "zh" ? "个人用户上传" : "Uploaded by Personal User";
  };

  return (
    <Container fluid pt={80} pb={120}>
      <Stack spacing="xl">
        {/* 标题和上传按钮 */}
        <Group position="apart">
          <Box>
            <Title order={2}>{t("support.caseTitle")}</Title>
            {user && !isAdmin && (
              <Text size="sm" color="dimmed" mt={4}>
                {locale === "zh" ? "个人用户模式：您可以上传和管理自己的回流案例" : "Personal User Mode: You can upload and manage your own cases"}
              </Text>
            )}
            {isAdmin && (
              <Text size="sm" color="dimmed" mt={4}>
                {locale === "zh" ? "管理员模式：您可以管理所有用户的回流案例" : "Admin Mode: You can manage all users' cases"}
              </Text>
            )}
          </Box>
          {user && !showUploadForm && (
            <Button
              onClick={() => setShowUploadForm(true)}
              leftIcon={<IconDatabaseImport size={18} />}
            >
              {locale === "zh" ? "上传新案例" : "Upload New Case"}
            </Button>
          )}
        </Group>

        {/* 上传表单 */}
        {showUploadForm && (
          <Paper p="xl">
            <Stack spacing="lg">
              <Group position="apart">
                <Title order={3}>{locale === "zh" ? "上传回流案例" : "Upload Return Case"}</Title>
                <Button
                  variant="subtle"
                  onClick={() => setShowUploadForm(false)}
                  leftIcon={<IconX size={16} />}
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </Button>
              </Group>

              {adminError && (
                <Alert color="red" title={locale === "zh" ? "错误" : "Error"}>
                  {adminError}
                </Alert>
              )}

              <FileButton onChange={handleUpload} accept="image/*">
                {(props) => (
                  <Button {...props} leftIcon={<IconDatabaseImport size={18} />}>
                    {locale === "zh" ? "选择图片" : "Select Image"}
                  </Button>
                )}
              </FileButton>

              {adminPreviewUrl && (
                <Box sx={{ height: 300, border: "1px solid rgba(216, 183, 109, 0.18)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34, 39, 47, 0.5)" }}>
                  <Box component="img" src={adminPreviewUrl} alt="Preview" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </Box>
              )}

              <Textarea
                label={locale === "zh" ? "案例详情" : "Case Details"}
                value={adminItemDetails}
                onChange={(event) => setAdminItemDetails(event.currentTarget.value)}
                placeholder={locale === "zh" ? "请输入案例的详细介绍、背景信息等" : "Enter case details and background information"}
                minRows={3}
              />

              <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
                <TextInput
                  label={locale === "zh" ? "回流编号" : "Case ID"}
                  value={adminCaseId}
                  onChange={(event) => setAdminCaseId(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "留空则自动生成（格式：CASE-XXXXX-XXXX）" : "Leave empty for auto-generation (Format: CASE-XXXXX-XXXX)"}
                />
                <TextInput
                  label={locale === "zh" ? "成交价格" : "Sale Price"}
                  value={adminSalePrice}
                  onChange={(event) => setAdminSalePrice(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: ¥50,000" : "e.g., ¥50,000"}
                />
                <TextInput
                  label={locale === "zh" ? "成交时间" : "Sale Time"}
                  value={adminSaleTime}
                  onChange={(event) => setAdminSaleTime(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: 2024-01-15" : "e.g., 2024-01-15"}
                />
                <TextInput
                  label={locale === "zh" ? "交易平台" : "Platform"}
                  value={adminSalePlatform}
                  onChange={(event) => setAdminSalePlatform(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: 苏富比" : "e.g., Sotheby's"}
                />
                <TextInput
                  label={locale === "zh" ? "客户地区" : "Client Region"}
                  value={adminClientRegion}
                  onChange={(event) => setAdminClientRegion(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: 北京" : "e.g., Beijing"}
                />
                <TextInput
                  label={locale === "zh" ? "物流成本" : "Logistics Cost"}
                  value={adminLogisticsCost}
                  onChange={(event) => setAdminLogisticsCost(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: ¥2,000" : "e.g., ¥2,000"}
                />
                <TextInput
                  label={locale === "zh" ? "收购渠道" : "Purchase Channel"}
                  value={adminPurchaseChannel}
                  onChange={(event) => setAdminPurchaseChannel(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: 私人收藏" : "e.g., Private Collection"}
                />
                <TextInput
                  label={locale === "zh" ? "收购成本" : "Purchase Cost"}
                  value={adminPurchaseCost}
                  onChange={(event) => setAdminPurchaseCost(event.currentTarget.value)}
                  placeholder={locale === "zh" ? "例如: ¥30,000" : "e.g., ¥30,000"}
                />
              </SimpleGrid>

              <Textarea
                label={locale === "zh" ? "避坑建议" : "Risk Advice"}
                value={adminRiskAdvice}
                onChange={(event) => setAdminRiskAdvice(event.currentTarget.value)}
                placeholder={locale === "zh" ? "请输入相关的避坑建议和经验分享" : "Enter risk advice and experience sharing"}
                minRows={2}
              />

              <Group position="right">
                <Button
                  variant="default"
                  onClick={resetForm}
                  leftIcon={<IconX size={16} />}
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </Button>
                <Button
                  onClick={handleSaveToKnowledgeBase}
                  leftIcon={<IconCheck size={16} />}
                  disabled={!adminPreviewUrl}
                >
                  {locale === "zh" ? "保存案例" : "Save Case"}
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* 操作消息提示 */}
        {manageMessage && (
          <Alert color="green" title={locale === "zh" ? "操作成功" : "Success"}>
            {manageMessage}
          </Alert>
        )}

        {/* 案例列表 */}
        {cases.length === 0 ? (
          <Alert color="blue">
            {!user 
              ? (locale === "zh" ? "暂无公开的回流案例。登录后可以上传个人案例。" : "No public return cases yet. Login to upload your own cases.")
              : (locale === "zh" ? "暂无回流案例。点击上方的\"上传新案例\"按钮开始上传。" : "No return cases yet. Click \"Upload New Case\" above to start uploading.")
            }
          </Alert>
        ) : (
          <SimpleGrid cols={3} spacing="xl" breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "sm", cols: 1 }]}>
            {cases.map((item) => {
              const caseRecord = item.caseRecord;
              if (!caseRecord) return null;

              const itemTitle = locale === "zh" && item.titleZh ? item.titleZh : item.title;
              const itemDescription = locale === "zh" && item.descriptionZh ? item.descriptionZh : item.description;

              // 判断案例类型
              // 如果是管理员上传的（当前用户是管理员且上传者是当前用户），或者没有 uploadedBy（旧数据），则显示"平台上传"
              const isPlatformCase = !item.uploadedBy || (isAdmin && item.uploadedBy === user?.id);
              const caseTypeLabel = isPlatformCase 
                ? (locale === "zh" ? "平台上传" : "Platform Upload")
                : (locale === "zh" ? "个人用户上传" : "Personal User Upload");

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
                          📷 {item.galleryImages.length} 张照片
                        </Badge>
                      )}
                    </Box>
                  </Card.Section>
                  
                  <Stack spacing="sm" mt="md">
                    <Group spacing="xs">
                      <Badge color="yellow" variant="filled" sx={{ alignSelf: "flex-start" }}>
                        {t("support.caseCardBadge")}
                      </Badge>
                      <Badge 
                        color={isPlatformCase ? "blue" : "green"} 
                        variant="outline"
                        sx={{ alignSelf: "flex-start" }}
                      >
                        {caseTypeLabel}
                      </Badge>
                      {/* 上传者信息 - 仅对非平台案例显示 */}
                      {!isPlatformCase && uploaderInfo && (
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
                    
                    <Group spacing={8} color="dark.1">
                      <IconCalendarEvent size={16} />
                      <Text size="sm" color="dark.1">{caseRecord.saleTime}</Text>
                    </Group>
                    
                    <Text size="sm" color="dark.1" lineClamp={3}>
                      {itemDescription}
                    </Text>

                    {/* 编辑表单 */}
                    {editingArtworkId === item.id ? (
                      <Stack spacing="sm">
                        <Textarea
                          label={locale === "zh" ? "案例详情" : "Case Details"}
                          value={editItemDetails}
                          onChange={(event) => setEditItemDetails(event.currentTarget.value)}
                          minRows={2}
                        />
                        <SimpleGrid cols={2} spacing="xs">
                          <TextInput
                            label={locale === "zh" ? "回流编号" : "Case ID"}
                            value={editCaseId}
                            onChange={(event) => setEditCaseId(event.currentTarget.value)}
                          />
                          <TextInput
                            label={locale === "zh" ? "成交价格" : "Sale Price"}
                            value={editSalePrice}
                            onChange={(event) => setEditSalePrice(event.currentTarget.value)}
                          />
                          <TextInput
                            label={locale === "zh" ? "成交时间" : "Sale Time"}
                            value={editSaleTime}
                            onChange={(event) => setEditSaleTime(event.currentTarget.value)}
                          />
                          <TextInput
                            label={locale === "zh" ? "交易平台" : "Platform"}
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
                            {locale === "zh" ? "取消" : "Cancel"}
                          </Button>
                          <Button
                            size="xs"
                            onClick={() => handleSaveEdit(item)}
                            leftIcon={<IconCheck size={14} />}
                          >
                            {locale === "zh" ? "保存" : "Save"}
                          </Button>
                        </Group>
                      </Stack>
                    ) : (
                      <>
                        <Button component={Link} href={`/cases/${item.id}`} variant="subtle" px={0} sx={{ alignSelf: "flex-start" }}>
                          {t("image.caseOpen")}
                        </Button>
                        
                        {/* 编辑和删除按钮 - 仅对可编辑的案例显示 */}
                        {canEdit(item) && (
                          <Group spacing="xs">
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() => handleStartEdit(item)}
                              leftIcon={<IconEdit size={14} />}
                            >
                              {locale === "zh" ? "编辑" : "Edit"}
                            </Button>
                            <Button
                              variant="subtle"
                              color="red"
                              size="xs"
                              onClick={() => handleDeleteImportedArtwork(item.id)}
                              leftIcon={<IconTrash size={14} />}
                            >
                              {locale === "zh" ? "删除" : "Delete"}
                            </Button>
                          </Group>
                        )}
                      </>
                    )}
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