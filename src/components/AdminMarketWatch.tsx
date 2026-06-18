import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  NumberInput,
  MultiSelect,
  Switch,
  Paper,
  Title,
  ActionIcon,
  Modal,
  Divider,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconRefresh } from "@tabler/icons-react";
import { useI18n } from "@/i18n";

interface Rule {
  id: string;
  name: string;
  keywords: string[];
  category_ids: string[];
  price_min: number | null;
  price_max: number | null;
  currency: string;
  conditions: string[];
  listing_types: string[];
  enabled: boolean;
  created_at: string;
}

const conditionOptions = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "NEW_OTHER", label: "New (Other)" },
];

const listingTypeOptions = [
  { value: "AUCTION", label: "Auction" },
  { value: "FIXED_PRICE", label: "Buy It Now" },
];

export default function AdminMarketWatch() {
  const { t, locale } = useI18n();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formCategoryIds, setFormCategoryIds] = useState("");
  const [formPriceMin, setFormPriceMin] = useState<number | "">("");
  const [formPriceMax, setFormPriceMax] = useState<number | "">("");
  const [formConditions, setFormConditions] = useState<string[]>(["USED"]);
  const [formListingTypes, setFormListingTypes] = useState<string[]>(["AUCTION", "FIXED_PRICE"]);

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/external/rules");
    if (!res.ok) return;
    const data = await res.json();
    setRules(data.rules || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setFormName("");
    setFormKeywords("");
    setFormCategoryIds("");
    setFormPriceMin("");
    setFormPriceMax("");
    setFormConditions(["USED"]);
    setFormListingTypes(["AUCTION", "FIXED_PRICE"]);
    setModalOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormKeywords(rule.keywords.join(", "));
    setFormCategoryIds(rule.category_ids?.join(", ") || "");
    setFormPriceMin(rule.price_min ?? "");
    setFormPriceMax(rule.price_max ?? "");
    setFormConditions(rule.conditions || []);
    setFormListingTypes(rule.listing_types || ["AUCTION", "FIXED_PRICE"]);
    setModalOpen(true);
  };

  const saveRule = async () => {
    const keywords = formKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!formName || keywords.length === 0) return;

    const body = {
      name: formName,
      keywords,
      category_ids: formCategoryIds
        ? formCategoryIds.split(",").map((c) => c.trim()).filter(Boolean)
        : [],
      price_min: formPriceMin === "" ? null : Number(formPriceMin),
      price_max: formPriceMax === "" ? null : Number(formPriceMax),
      conditions: formConditions,
      listing_types: formListingTypes,
    };

    const url = editingRule?.id
      ? `/api/external/rules/${editingRule.id}`
      : "/api/external/rules";
    const method = editingRule?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setModalOpen(false);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/external/rules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  const toggleRule = async (rule: Rule) => {
    await fetch(`/api/external/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    fetchRules();
  };

  const triggerSync = async () => {
    setSyncMsg(locale === "zh" ? "同步中..." : "Syncing...");
    const res = await fetch("/api/external/sync", { method: "POST" });
    const data = await res.json();
    setSyncMsg(data.message || "Done");
    setTimeout(() => setSyncMsg(""), 3000);
  };

  if (loading) return <Text color="dimmed">Loading...</Text>;

  return (
    <>
      <Group position="apart" mb="md">
        <Title order={4}>
          {locale === "zh" ? "eBay 规则管理" : "eBay Rule Manager"}
        </Title>
        <Group spacing="xs">
          <Button
            leftIcon={<IconRefresh size={16} />}
            variant="outline"
            size="sm"
            onClick={triggerSync}
          >
            {locale === "zh" ? "立即同步" : "Sync Now"}
          </Button>
          <Button
            leftIcon={<IconPlus size={16} />}
            size="sm"
            onClick={openCreate}
          >
            {locale === "zh" ? "新建规则" : "New Rule"}
          </Button>
        </Group>
      </Group>

      {syncMsg && (
        <Text size="sm" color="dimmed" mb="sm">{syncMsg}</Text>
      )}

      {rules.length === 0 ? (
        <Text color="dimmed" size="sm">
          {locale === "zh"
            ? "暂无规则。点击「新建规则」添加第一条。"
            : "No rules yet. Click 'New Rule' to add one."}
        </Text>
      ) : (
        <Stack spacing="sm">
          {rules.map((rule) => (
            <Paper
              key={rule.id}
              p="sm"
              sx={{
                background: "#fff",
                borderRadius: 2,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Group position="apart">
                <Box>
                  <Group spacing="xs">
                    <Text size="sm" weight={500}>{rule.name}</Text>
                    <Switch
                      size="xs"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule)}
                    />
                  </Group>
                  <Text size="xs" color="dimmed">
                    {rule.keywords.join(", ")}
                    {rule.price_min && ` · $${rule.price_min}`}
                    {rule.price_max && `-$${rule.price_max}`}
                  </Text>
                </Box>
                <Group spacing={4}>
                  <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(rule)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon size="sm" variant="subtle" color="red" onClick={() => deleteRule(rule.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule?.id
          ? (locale === "zh" ? "编辑规则" : "Edit Rule")
          : (locale === "zh" ? "新建规则" : "New Rule")}
        size="md"
      >
        <Stack spacing="sm">
          <TextInput
            label={locale === "zh" ? "规则名称" : "Rule Name"}
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            placeholder="e.g. 清代花瓶监控"
          />
          <TextInput
            label={locale === "zh" ? "搜索关键词（逗号分隔）" : "Keywords (comma-separated)"}
            value={formKeywords}
            onChange={(e) => setFormKeywords(e.currentTarget.value)}
            placeholder="Qing dynasty vase, 清代花瓶"
          />
          <TextInput
            label={locale === "zh" ? "eBay 分类 ID（逗号分隔）" : "eBay Category IDs"}
            value={formCategoryIds}
            onChange={(e) => setFormCategoryIds(e.currentTarget.value)}
            placeholder="37978 (optional)"
          />
          <Group grow>
            <NumberInput
              label={locale === "zh" ? "最低价" : "Min Price"}
              value={formPriceMin}
              onChange={setFormPriceMin}
              placeholder="100"
            />
            <NumberInput
              label={locale === "zh" ? "最高价" : "Max Price"}
              value={formPriceMax}
              onChange={setFormPriceMax}
              placeholder="5000"
            />
          </Group>
          <MultiSelect
            label={locale === "zh" ? "商品状态" : "Condition"}
            data={conditionOptions}
            value={formConditions}
            onChange={setFormConditions}
          />
          <MultiSelect
            label={locale === "zh" ? "上架类型" : "Listing Type"}
            data={listingTypeOptions}
            value={formListingTypes}
            onChange={setFormListingTypes}
          />
          <Button onClick={saveRule} mt="sm">
            {editingRule?.id
              ? (locale === "zh" ? "保存" : "Save")
              : (locale === "zh" ? "创建" : "Create")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
