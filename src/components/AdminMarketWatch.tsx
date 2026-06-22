import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  NumberInput,
  MultiSelect,
  Select,
  Switch,
  Paper,
  Title,
  ActionIcon,
  Modal,
  Badge,
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
import { EBAY_ANTIQUE_CATEGORIES } from "@/lib/ebay";

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
  returns_accepted_only: boolean;
  item_location_countries: string[];
  item_location_regions: string[];
  min_feedback_score: number | null;
  exclude_sellers: string[];
  enabled: boolean;
  created_at: string;
}

const conditionValues = ["NEW", "USED", "NEW_OTHER"] as const;
const listingTypeValues = ["AUCTION", "FIXED_PRICE"] as const;

// Reverse lookup: category name -> ID
const categoryNameToId = Object.fromEntries(
  Object.entries(EBAY_ANTIQUE_CATEGORIES).map(([name, id]) => [name, id])
);

// Map category ID back to name for display
const categoryIdToName = Object.fromEntries(
  Object.entries(EBAY_ANTIQUE_CATEGORIES).map(([name, id]) => [id, name])
);

export default function AdminMarketWatch() {
  const { t, locale } = useI18n();

  const conditionOptions = useMemo(() => [
    { value: "NEW", label: locale === "zh" ? "全新" : "New" },
    { value: "USED", label: locale === "zh" ? "二手" : "Used" },
    { value: "NEW_OTHER", label: locale === "zh" ? "全新（其他）" : "New (Other)" },
    { value: "SELLER_REFURBISHED", label: locale === "zh" ? "翻新" : "Refurbished" },
  ], [locale]);

  const listingTypeOptions = useMemo(() => [
    { value: "AUCTION", label: locale === "zh" ? "拍卖" : "Auction" },
    { value: "FIXED_PRICE", label: locale === "zh" ? "一口价" : "Buy It Now" },
    { value: "BEST_OFFER", label: locale === "zh" ? "议价" : "Best Offer" },
  ], [locale]);

  const categoryOptions = useMemo(() => [
    ...Object.entries(EBAY_ANTIQUE_CATEGORIES).map(([name, id]) => ({
      value: id,
      label: `${name} (${id})`,
    })),
  ], []);

  const countryOptions = useMemo(() => [
    { value: "US", label: "🇺🇸 United States" },
    { value: "CN", label: "🇨🇳 China" },
    { value: "JP", label: "🇯🇵 Japan" },
    { value: "HK", label: "🇭🇰 Hong Kong" },
    { value: "GB", label: "🇬🇧 United Kingdom" },
    { value: "FR", label: "🇫🇷 France" },
    { value: "DE", label: "🇩🇪 Germany" },
    { value: "IT", label: "🇮🇹 Italy" },
    { value: "CA", label: "🇨🇦 Canada" },
    { value: "AU", label: "🇦🇺 Australia" },
    { value: "KR", label: "🇰🇷 South Korea" },
    { value: "TW", label: "🇹🇼 Taiwan" },
  ], []);

  const regionOptions = useMemo(() => [
    { value: "CA", label: "California" },
    { value: "NY", label: "New York" },
    { value: "TX", label: "Texas" },
    { value: "FL", label: "Florida" },
    { value: "IL", label: "Illinois" },
    { value: "PA", label: "Pennsylvania" },
    { value: "OH", label: "Ohio" },
    { value: "GA", label: "Georgia" },
    { value: "NC", label: "North Carolina" },
    { value: "MI", label: "Michigan" },
    { value: "NJ", label: "New Jersey" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "MA", label: "Massachusetts" },
    { value: "AZ", label: "Arizona" },
  ], []);

  // Labels for display
  const conditionLabel = (c: string) => {
    const map: Record<string, string> = {
      NEW: locale === "zh" ? "全新" : "New",
      USED: locale === "zh" ? "二手" : "Used",
      NEW_OTHER: locale === "zh" ? "全新(其他)" : "New Other",
      SELLER_REFURBISHED: locale === "zh" ? "翻新" : "Refurbished",
    };
    return map[c] || c;
  };
  const listingTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      AUCTION: locale === "zh" ? "拍卖" : "Auction",
      FIXED_PRICE: locale === "zh" ? "直购" : "Buy Now",
      BEST_OFFER: locale === "zh" ? "议价" : "Best Offer",
    };
    return map[t] || t;
  };

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([]);
  const [formPriceMin, setFormPriceMin] = useState<number | "">("");
  const [formPriceMax, setFormPriceMax] = useState<number | "">("");
  const [formConditions, setFormConditions] = useState<string[]>([]);
  const [formListingTypes, setFormListingTypes] = useState<string[]>([]);
  const [formReturnsAccepted, setFormReturnsAccepted] = useState(false);
  const [formItemLocationCountries, setFormItemLocationCountries] = useState<string[]>([]);
  const [formItemLocationRegions, setFormItemLocationRegions] = useState<string[]>([]);
  const [formMinFeedbackScore, setFormMinFeedbackScore] = useState<number | "">("");
  const [formExcludeSellers, setFormExcludeSellers] = useState("");

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
    setFormError("");
    setFormName("");
    setFormKeywords("");
    setFormCategoryIds([]);
    setFormPriceMin("");
    setFormPriceMax("");
    setFormConditions([]);
    setFormListingTypes([]);
    setFormReturnsAccepted(false);
    setFormItemLocationCountries([]);
    setFormItemLocationRegions([]);
    setFormMinFeedbackScore("");
    setFormExcludeSellers("");
    setModalOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormError("");
    setFormName(rule.name);
    setFormKeywords(rule.keywords.join(", "));
    setFormCategoryIds(rule.category_ids || []);
    setFormPriceMin(rule.price_min ?? "");
    setFormPriceMax(rule.price_max ?? "");
    setFormConditions(rule.conditions || []);
    setFormListingTypes(rule.listing_types || []);
    setFormReturnsAccepted(rule.returns_accepted_only || false);
    setFormItemLocationCountries(rule.item_location_countries || []);
    setFormItemLocationRegions(rule.item_location_regions || []);
    setFormMinFeedbackScore(rule.min_feedback_score ?? "");
    setFormExcludeSellers((rule.exclude_sellers || []).join(", "));
    setModalOpen(true);
  };

  const saveRule = async () => {
    setFormError("");

    const keywords = formKeywords.split(",").map((k) => k.trim()).filter(Boolean);

    // Validation
    if (!formName.trim()) {
      setFormError(locale === "zh" ? "请输入规则名称" : "Rule name is required");
      return;
    }
    if (keywords.length === 0) {
      setFormError(locale === "zh" ? "请输入至少一个搜索关键词" : "At least one keyword is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName,
        keywords,
        category_ids: formCategoryIds,
        price_min: formPriceMin === "" ? null : Number(formPriceMin),
        price_max: formPriceMax === "" ? null : Number(formPriceMax),
        conditions: formConditions,
        listing_types: formListingTypes,
        returns_accepted_only: formReturnsAccepted,
        item_location_countries: formItemLocationCountries,
        item_location_regions: formItemLocationRegions,
        min_feedback_score: formMinFeedbackScore === "" ? null : Number(formMinFeedbackScore),
        exclude_sellers: formExcludeSellers
          ? formExcludeSellers.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
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
        throw new Error(payload.error || (locale === "zh" ? "保存失败，请重试" : "Save failed, please retry"));
      }

      setModalOpen(false);
      void fetchRules();
    } catch (err: any) {
      setFormError(err.message || (locale === "zh" ? "保存失败" : "Save failed"));
    } finally {
      setSaving(false);
    }
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
                  <Text size="xs" color="dimmed" mb={4}>
                    {rule.keywords.join(", ")}
                  </Text>
                  {/* Badge row: conditions, listing types, category */}
                  <Group spacing={4}>
                    {rule.conditions?.length > 0 && rule.conditions.map((c) => (
                      <Badge key={c} size="xs" variant="light" color="yellow">
                        {conditionLabel(c)}
                      </Badge>
                    ))}
                    {rule.listing_types?.length > 0 && rule.listing_types.map((t) => (
                      <Badge key={t} size="xs" variant="light" color="violet.5">
                        {listingTypeLabel(t)}
                      </Badge>
                    ))}
                    {rule.category_ids?.length > 0 && rule.category_ids.map((cid) => (
                      <Badge key={cid} size="xs" variant="light" color="dark.3">
                        {categoryIdToName[cid] || cid}
                      </Badge>
                    ))}
                    {rule.price_min && (
                      <Text size="xs" color="dimmed">· ${rule.price_min}</Text>
                    )}
                    {rule.price_max && (
                      <Text size="xs" color="dimmed">-${rule.price_max}</Text>
                    )}
                    {rule.returns_accepted_only && (
                      <Text size="xs" color="dimmed">· {locale === "zh" ? "可退货" : "returns OK"}</Text>
                    )}
                    {rule.item_location_countries?.length > 0 && (
                      <Text size="xs" color="dimmed">· 📍{rule.item_location_countries.join(",")}</Text>
                    )}
                    {rule.min_feedback_score && (
                      <Text size="xs" color="dimmed">· ★≥{rule.min_feedback_score}</Text>
                    )}
                    {rule.exclude_sellers?.length > 0 && (
                      <Text size="xs" color="dimmed">· 🚫{rule.exclude_sellers.join(",")}</Text>
                    )}
                  </Group>
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
          <MultiSelect
            label={locale === "zh" ? "eBay 分类（可选）" : "eBay Categories (optional)"}
            description={locale === "zh" ? "不选即不限分类" : "Leave empty to search all categories"}
            data={categoryOptions}
            value={formCategoryIds}
            onChange={setFormCategoryIds}
            placeholder={locale === "zh" ? "选择分类..." : "Select categories..."}
            clearable
            searchable
            nothingFound={locale === "zh" ? "无匹配分类" : "No matching category"}
            styles={(theme) => ({
              label: { color: appFieldLabelColor(theme) },
            })}
          />
          <Group grow>
            <NumberInput
              label={locale === "zh" ? "最低价" : "Min Price"}
              description={locale === "zh" ? "不填即不限" : "No limit if empty"}
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
              description={locale === "zh" ? "不填即不限" : "No limit if empty"}
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
            description={locale === "zh" ? "不选即不限" : "All conditions if empty"}
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
            description={locale === "zh" ? "不选即不限" : "All types if empty"}
            data={listingTypeOptions}
            value={formListingTypes}
            onChange={setFormListingTypes}
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <Switch
            label={locale === "zh" ? "只显示接受退货的商品" : "Returns accepted only"}
            checked={formReturnsAccepted}
            onChange={(e) => setFormReturnsAccepted(e.currentTarget.checked)}
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <MultiSelect
            label={locale === "zh" ? "物品所在地区" : "Item Location"}
            description={locale === "zh" ? "不选即不限" : "All locations if empty"}
            data={countryOptions}
            value={formItemLocationCountries}
            onChange={(v) => {
              setFormItemLocationCountries(v);
              if (!v.includes("US")) setFormItemLocationRegions([]);
            }}
            placeholder={locale === "zh" ? "选择国家..." : "Select countries..."}
            clearable
            searchable
            styles={(theme) => ({
              label: { color: appFieldLabelColor(theme) },
            })}
          />
          {formItemLocationCountries.includes("US") && (
            <MultiSelect
              label={locale === "zh" ? "物品所在地州/省" : "Item Location States"}
              description={locale === "zh" ? "不选即不限" : "All states if empty"}
              data={regionOptions}
              value={formItemLocationRegions}
              onChange={setFormItemLocationRegions}
              placeholder={locale === "zh" ? "选择州/省..." : "Select states..."}
              clearable
              searchable
              styles={(theme) => ({
                label: { color: appFieldLabelColor(theme) },
              })}
            />
          )}
          <NumberInput
            label={locale === "zh" ? "卖家最低信用分" : "Min Seller Feedback Score"}
            description={locale === "zh" ? "不填即不限" : "No limit if empty"}
            value={formMinFeedbackScore}
            onChange={setFormMinFeedbackScore}
            placeholder="100"
            min={0}
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          <TextInput
            label={locale === "zh" ? "排除卖家（逗号分隔）" : "Exclude Sellers (comma-separated)"}
            description={locale === "zh" ? "不填即不限" : "No exclusions if empty"}
            value={formExcludeSellers}
            onChange={(e) => setFormExcludeSellers(e.currentTarget.value)}
            placeholder="seller1, seller2"
            styles={(theme) => ({
              label: {
                color: appFieldLabelColor(theme),
              },
            })}
          />
          {formError && (
            <Text size="sm" color="red">{formError}</Text>
          )}
          <Button onClick={saveRule} mt="sm" sx={primaryActionButtonSx} loading={saving}>
            {editingRule?.id
              ? (locale === "zh" ? "保存" : "Save")
              : (locale === "zh" ? "创建" : "Create")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
