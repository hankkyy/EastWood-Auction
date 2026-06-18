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
import {
  appFieldLabelColor,
  primaryActionButtonSx,
  secondaryActionButtonSx,
  appSurfaceBackground,
  appSurfaceBorder,
  appTextColor,
} from "@/components/artworkStyles";
import { supabase } from "@/lib/supabase/client";

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
  const [error, setError] = useState("");
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

  const getAuthHeaders = useCallback(async (includeJson = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(locale === "zh" ? "请先登录管理员账号。" : "Please sign in as an admin first.");
    }

    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [locale]);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const headers = await getAuthHeaders();
      const res = await fetch("/api/external/rules", { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load eBay rules.");
      }

      setRules(data.rules || []);
    } catch (err: any) {
      setError(err.message || (locale === "zh" ? "加载 eBay 规则失败。" : "Failed to load eBay rules."));
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, locale]);

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

    const headers = await getAuthHeaders(true);
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to save rule.");
    }

    setModalOpen(false);
    void fetchRules();
  };

  const deleteRule = async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/external/rules/${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to delete rule.");
    }
    void fetchRules();
  };

  const toggleRule = async (rule: Rule) => {
    const headers = await getAuthHeaders(true);
    const res = await fetch(`/api/external/rules/${rule.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to update rule.");
    }
    void fetchRules();
  };

  const triggerSync = async () => {
    try {
      setError("");
      setSyncMsg(locale === "zh" ? "同步中..." : "Syncing...");
      const headers = await getAuthHeaders();
      const res = await fetch("/api/external/sync", { method: "POST", headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed.");
      }

      // Show per-rule errors if any
      const errors = (data.results || []).filter((r: any) => r.error).map((r: any) => `${r.rule_name}: ${r.error}`);
      const msg = errors.length > 0
        ? `${data.message} (${errors.join("; ")})`
        : data.message || "Done";
      setSyncMsg(msg);
      void fetchRules();
    } catch (err: any) {
      setSyncMsg("");
      setError(err.message || (locale === "zh" ? "同步失败。" : "Sync failed."));
    } finally {
      setTimeout(() => setSyncMsg(""), 3000);
    }
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
            sx={(theme) => secondaryActionButtonSx(theme)}
          >
            {locale === "zh" ? "立即同步" : "Sync Now"}
          </Button>
          <Button
            leftIcon={<IconPlus size={16} />}
            size="sm"
            onClick={openCreate}
            sx={primaryActionButtonSx}
          >
            {locale === "zh" ? "新建规则" : "New Rule"}
          </Button>
        </Group>
      </Group>

      {syncMsg && (
        <Text size="sm" color="dimmed" mb="sm">{syncMsg}</Text>
      )}

      {error && (
        <Text size="sm" color="red" mb="sm">{error}</Text>
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
              sx={(theme) => ({
                background: appSurfaceBackground(theme),
                color: appTextColor(theme),
                border: `1px solid ${appSurfaceBorder(theme)}`,
                borderRadius: 2,
                boxShadow: theme.colorScheme === "dark"
                  ? "0 1px 2px rgba(0,0,0,0.20)"
                  : "0 1px 2px rgba(0,0,0,0.04)",
              })}
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
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <TextInput
            label={locale === "zh" ? "搜索关键词（逗号分隔）" : "Keywords (comma-separated)"}
            value={formKeywords}
            onChange={(e) => setFormKeywords(e.currentTarget.value)}
            placeholder="Qing dynasty vase, 清代花瓶"
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <TextInput
            label={locale === "zh" ? "eBay 分类 ID（逗号分隔）" : "eBay Category IDs"}
            value={formCategoryIds}
            onChange={(e) => setFormCategoryIds(e.currentTarget.value)}
            placeholder="37978 (optional)"
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <Group grow>
            <NumberInput
              label={locale === "zh" ? "最低价" : "Min Price"}
              value={formPriceMin}
              onChange={setFormPriceMin}
              placeholder="100"
              styles={(theme) => ({
                label: {
                  color: appFieldLabelColor(theme),
                },
              })}
            />
            <NumberInput
              label={locale === "zh" ? "最高价" : "Max Price"}
              value={formPriceMax}
              onChange={setFormPriceMax}
              placeholder="5000"
              styles={(theme) => ({
                label: {
                  color: appFieldLabelColor(theme),
                },
              })}
            />
          </Group>
          <MultiSelect
            label={locale === "zh" ? "商品状态" : "Condition"}
            data={conditionOptions}
            value={formConditions}
            onChange={setFormConditions}
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <MultiSelect
            label={locale === "zh" ? "上架类型" : "Listing Type"}
            data={listingTypeOptions}
            value={formListingTypes}
            onChange={setFormListingTypes}
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <Button onClick={saveRule} mt="sm" sx={primaryActionButtonSx}>
            {editingRule?.id
              ? (locale === "zh" ? "保存" : "Save")
              : (locale === "zh" ? "创建" : "Create")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
