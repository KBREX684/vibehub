"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Key,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  API_KEY_SCOPE_READ_PUBLIC,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
} from "@/lib/api-key-scopes";
import { apiFetch } from "@/lib/api-fetch";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { formatLocalizedDate, formatLocalizedDateTime } from "@/lib/formatting";
import type {
  AgentBindingSummary,
  ApiKeyCreated,
  ApiKeySummary,
  ApiKeyUsageSnapshot,
  McpInvokeAuditRow,
} from "@/lib/types";
import type { UpgradeReason } from "@/lib/subscription";
import { ApiKeyUsageSparkline } from "@/components/api-key-usage-sparkline";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Button,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  ErrorBanner,
  FormField,
  LoadingSkeleton,
  SectionCard,
  TagPill,
} from "@/components/ui";

const OPTIONAL_SCOPES = API_KEY_SCOPES.filter((s) => s !== API_KEY_SCOPE_READ_PUBLIC);

type InvocationStatusFilter = "all" | "success" | "error";

interface Props {
  currentUserId: string | null;
}

export function ApiKeysPanel({ currentUserId }: Props) {
  const { language, t } = useLanguage();
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [agentBindings, setAgentBindings] = useState<AgentBindingSummary[]>([]);
  const [usageByKey, setUsageByKey] = useState<Record<string, ApiKeyUsageSnapshot>>({});
  const [loading, setLoading] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | undefined>(undefined);
  const [newLabel, setNewLabel] = useState("");
  const [selectedAgentBindingId, setSelectedAgentBindingId] = useState("");
  const [lastSecret, setLastSecret] = useState<string | null>(null);
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<Record<string, InvocationStatusFilter>>({});
  const [toolFilters, setToolFilters] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const x of DEFAULT_API_KEY_SCOPES) {
      if (x !== API_KEY_SCOPE_READ_PUBLIC) s.add(x);
    }
    return s;
  });
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);

  const loadUsage = useCallback(async (nextKeys: ApiKeySummary[]) => {
    if (nextKeys.length === 0) {
      setUsageByKey({});
      return;
    }
    setLoadingUsage(true);
    try {
      const results = await Promise.all(
        nextKeys.map(async (key) => {
          const res = await apiFetch(`/api/v1/me/api-keys/${encodeURIComponent(key.id)}/usage?days=7&limit=100`, {
            credentials: "include",
          });
          const json = (await res.json()) as {
            data?: { usage?: ApiKeyUsageSnapshot };
            error?: { message?: string };
          };
          if (!res.ok || !json.data?.usage) {
            throw new Error(json.error?.message ?? t("apiKeys.loadUsageFailed"));
          }
          return [key.id, json.data.usage] as const;
        })
      );
      setUsageByKey(Object.fromEntries(results));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
      setUsageByKey({});
    } finally {
      setLoadingUsage(false);
    }
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [keysRes, bindingsRes] = await Promise.all([
        apiFetch("/api/v1/me/api-keys", { credentials: "include" }),
        apiFetch("/api/v1/me/agent-bindings", { credentials: "include" }),
      ]);
      const keysJson = (await keysRes.json()) as {
        data?: { keys?: ApiKeySummary[] };
        error?: { message?: string };
      };
      const bindingsJson = (await bindingsRes.json()) as {
        data?: { bindings?: AgentBindingSummary[] };
        error?: { message?: string };
      };
      if (!keysRes.ok) {
        setMsg(keysJson.error?.message ?? t("apiKeys.loadFailed"));
        setKeys([]);
        setUsageByKey({});
        return;
      }
      const nextKeys = keysJson.data?.keys ?? [];
      setKeys(nextKeys);
      if (!bindingsRes.ok) {
        setMsg(bindingsJson.error?.message ?? t("apiKeys.loadAgentsFailed"));
        setAgentBindings([]);
      } else {
        setAgentBindings(bindingsJson.data?.bindings ?? []);
      }
      await loadUsage(nextKeys);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadUsage, t]);

  useEffect(() => {
    if (currentUserId) {
      void load();
    }
  }, [currentUserId, load]);

  async function createKey(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setUpgradeReason(undefined);
    setLastSecret(null);
    try {
      const res = await apiFetch("/api/v1/me/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          scopes: [API_KEY_SCOPE_READ_PUBLIC, ...Array.from(selectedScopes)],
          agentBindingId: selectedAgentBindingId || undefined,
        }),
      });
      const json = (await res.json()) as {
        data?: { key?: ApiKeyCreated };
        error?: { message?: string; details?: { upgradeReason?: UpgradeReason } };
      };
      if (!res.ok) {
        setMsg(json.error?.message ?? t("apiKeys.createFailed"));
        setUpgradeReason(json.error?.details?.upgradeReason);
        return;
      }
      const k = json.data?.key;
      if (k?.secret) setLastSecret(k.secret);
      setNewLabel("");
      setSelectedAgentBindingId("");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function performRevoke(id: string) {
    setMsg(null);
    try {
      const res = await apiFetch(`/api/v1/me/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? t("apiKeys.revokeFailed"));
        return;
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!currentUserId) {
    return (
      <SectionCard
        icon={Key}
        title={t("apiKeys.authRequiredTitle")}
        description={t("apiKeys.authRequiredDesc")}
      >
        <div className="flex justify-center">
          {isDevDemoAuth() ? (
            <a href="/api/v1/auth/demo-login?role=user&redirect=/settings/api-keys">
              <Button variant="apple" size="md">
                {t("apiKeys.demoLogin")}
              </Button>
            </a>
          ) : (
            <Link href="/login?redirect=%2Fsettings%2Fapi-keys">
              <Button variant="apple" size="md">
                {t("apiKeys.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        icon={Key}
        title={t("apiKeys.pageTitle")}
        description={t("apiKeys.pageDescription")}
      />

      <SectionCard
        icon={Plus}
        title={t("apiKeys.createTitle")}
        description={t("apiKeys.createDescription")}
      >
        <form onSubmit={(ev) => void createKey(ev)} className="space-y-4">
          <FormField label={t("apiKeys.label")} required>
            <input
              className="input-base"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
              maxLength={80}
              placeholder={t("apiKeys.labelPlaceholder")}
            />
          </FormField>

          <FormField
            label={
              <span className="inline-flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                {t("apiKeys.linkedAgent")}
              </span>
            }
            hint={
              <>
                {t("apiKeys.linkedAgentHintPrefix")}{" "}
                <Link href="/settings/agents" className="underline hover:text-[var(--color-text-primary)]">
                  {t("apiKeys.linkedAgentHintLink")}
                </Link>
                {t("apiKeys.linkedAgentHintSuffix")}
              </>
            }
          >
            <select
              className="input-base"
              value={selectedAgentBindingId}
              onChange={(event) => setSelectedAgentBindingId(event.target.value)}
            >
              <option value="">{t("apiKeys.noLinkedAgent")}</option>
              {agentBindings.map((binding) => (
                <option key={binding.id} value={binding.id}>
                  {binding.label} · {binding.agentType}
                  {!binding.active ? ` (${t("apiKeys.paused")})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                {t("apiKeys.scopes")}
              </span>
            }
          >
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <label className="flex items-center gap-2 opacity-80">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="h-3.5 w-3.5 accent-[var(--color-accent-apple)]"
                  aria-label={t("apiKeys.requiredBaseScope")}
                />
                <code className="text-xs font-mono rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-1.5 py-0.5">
                  {API_KEY_SCOPE_READ_PUBLIC}
                </code>
                <span className="text-xs text-[var(--color-text-tertiary)]">({t("apiKeys.requiredBaseScope")})</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                {OPTIONAL_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(scope)}
                      onChange={() => {
                        setSelectedScopes((prev) => {
                          const next = new Set(prev);
                          if (next.has(scope)) next.delete(scope);
                          else next.add(scope);
                          return next;
                        });
                      }}
                      className="h-3.5 w-3.5 accent-[var(--color-accent-apple)]"
                    />
                    <code className="text-xs font-mono rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 group-hover:border-[var(--color-border)]">
                      {scope}
                    </code>
                  </label>
                ))}
              </div>
            </div>
          </FormField>

          <Button variant="primary" size="md" type="submit">
            {t("apiKeys.generate")}
          </Button>
        </form>

        <AnimatePresence>
          {lastSecret ? (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning-subtle)] bg-[var(--color-warning-subtle)] p-4">
                <div className="flex items-center gap-2 mb-2 text-[var(--color-warning)]">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  <h4 className="text-sm font-semibold m-0">{t("apiKeys.saveNow")}</h4>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3 leading-relaxed">
                  {t("apiKeys.secretShownOnce")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] text-[var(--color-accent-cyan)] font-mono text-xs break-all">
                    {lastSecret}
                  </code>
                  <CopyButton value={lastSecret} size="md" />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {msg ? <ErrorBanner className="mt-4">{msg}</ErrorBanner> : null}
        {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} className="mt-4" /> : null}
      </SectionCard>

      <SectionCard
        icon={Key}
        title={t("apiKeys.activeTitle")}
        description={t("apiKeys.activeDescription")}
      >
        {loading && keys.length === 0 ? (
          <LoadingSkeleton preset="list" count={3} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={Key}
            title={t("apiKeys.emptyTitle")}
            description={t("apiKeys.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {keys.map((key) => {
              const usage = usageByKey[key.id];
              const expanded = expandedKeyId === key.id;
              const statusFilter = statusFilters[key.id] ?? "all";
              const toolFilter = (toolFilters[key.id] ?? "").trim().toLowerCase();
              const filteredInvocations = usage
                ? usage.recentInvocations.filter((row) => {
                    if (statusFilter === "success" && row.httpStatus >= 400) return false;
                    if (statusFilter === "error" && row.httpStatus < 400) return false;
                    if (toolFilter && !row.tool.toLowerCase().includes(toolFilter)) return false;
                    return true;
                  })
                : [];

              return (
                <article
                  key={key.id}
                  className={[
                    "rounded-[var(--radius-lg)] border p-4 transition-colors",
                    key.revokedAt
                      ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] opacity-75"
                      : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
                  ].join(" ")}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-semibold text-[var(--color-text-primary)]">{key.label}</strong>
                        {key.revokedAt ? (
                          <TagPill accent="default" size="sm" mono>
                            {t("apiKeys.revoked")}
                          </TagPill>
                        ) : (
                          <TagPill accent="success" size="sm" mono>
                            {t("apiKeys.active")}
                          </TagPill>
                        )}
                        {key.agentBinding ? (
                          <TagPill accent="violet" size="sm">
                            {t("apiKeys.agentLinked")} · {key.agentBinding.label}
                          </TagPill>
                        ) : null}
                      </div>
                      <code className="inline-block text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-1.5 py-0.5">
                        {key.prefix}••••••••••••••••
                      </code>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {t("apiKeys.created")}: {formatLocalizedDate(key.createdAt, language, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {usage?.summary.lastUsedAt && !key.revokedAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            {t("apiKeys.lastUsed")}: {formatLocalizedDateTime(usage.summary.lastUsedAt, language)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpandedKeyId((current) => (current === key.id ? null : key.id))}
                      >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                        {expanded ? t("apiKeys.hideUsage") : t("apiKeys.viewUsage")}
                      </Button>
                      {!key.revokedAt ? (
                        <Button variant="destructive" size="sm" onClick={() => setRevokeTarget(key)}>
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {t("apiKeys.revoke")}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-4 pt-3 border-t border-[var(--color-border-subtle)]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <UsageMetric label={t("apiKeys.metric7d")} value={usage?.summary.last7dCount ?? 0} />
                      <UsageMetric label={t("apiKeys.metric24h")} value={usage?.summary.last24hCount ?? 0} />
                      <UsageMetric label={t("apiKeys.metricErrors")} value={usage?.summary.errorCount ?? 0} />
                      <UsageMetric label={t("apiKeys.metricTools")} value={usage?.summary.uniqueTools ?? 0} />
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{t("apiKeys.last7d")}</span>
                        {loadingUsage && !usage ? <span className="text-[11px] text-[var(--color-text-muted)]">{t("apiKeys.loading")}</span> : null}
                      </div>
                      {usage ? <ApiKeyUsageSparkline daily={usage.daily} /> : <div className="h-10 rounded bg-[var(--color-bg-elevated)]" />}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border-subtle)] mt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {key.scopes.map((scope) => (
                        <TagPill key={scope} accent="default" size="sm" mono>
                          {scope}
                        </TagPill>
                      ))}
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 space-y-4">
                      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("apiKeys.recentInvocationsTitle")}</h4>
                          <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-1">{t("apiKeys.recentInvocationsDescription")}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            className="input-base min-w-[180px]"
                            value={toolFilters[key.id] ?? ""}
                            onChange={(event) => setToolFilters((current) => ({ ...current, [key.id]: event.target.value }))}
                            placeholder={t("apiKeys.filterTool")}
                          />
                          <select
                            className="input-base"
                            value={statusFilter}
                            onChange={(event) =>
                              setStatusFilters((current) => ({
                                ...current,
                                [key.id]: event.target.value as InvocationStatusFilter,
                              }))
                            }
                          >
                            <option value="all">{t("apiKeys.allStatuses")}</option>
                            <option value="success">{t("apiKeys.successOnly")}</option>
                            <option value="error">{t("apiKeys.errorsOnly")}</option>
                          </select>
                        </div>
                      </div>

                      {!usage ? (
                        <LoadingSkeleton preset="list" count={3} />
                      ) : filteredInvocations.length === 0 ? (
                        <EmptyState
                          icon={Sparkles}
                          title={t("apiKeys.noMatchingInvocations")}
                          description={t("apiKeys.noMatchingInvocationsDesc")}
                        />
                      ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                          {filteredInvocations.map((row) => (
                            <InvocationRow key={row.id} row={row} language={language} t={t} />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={revokeTarget !== null}
        title={t("apiKeys.revokeTitle")}
        description={
          revokeTarget
            ? t("apiKeys.revokeDescription").replace("{label}", revokeTarget.label)
            : undefined
        }
        confirmLabel={t("apiKeys.revokeConfirm")}
        cancelLabel={t("apiKeys.revokeCancel")}
        tone="destructive"
        onClose={() => setRevokeTarget(null)}
        onConfirm={async () => {
          if (revokeTarget) await performRevoke(revokeTarget.id);
          setRevokeTarget(null);
        }}
      />
    </div>
  );
}

function UsageMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
      <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1">{label}</div>
      <div className="text-lg font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function InvocationRow({
  row,
  language,
  t,
}: {
  row: McpInvokeAuditRow;
  language: string;
  t: (key: string, fallback?: string) => string;
}) {
  const ok = row.httpStatus < 400;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <TagPill accent={ok ? "success" : "error"} size="sm" mono>
            {row.httpStatus}
          </TagPill>
          <code className="text-xs font-mono text-[var(--color-text-primary)] truncate">{row.tool}</code>
        </div>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">{formatLocalizedDateTime(row.createdAt, language)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
        <span>{t("apiKeys.duration")}: {typeof row.durationMs === "number" ? `${row.durationMs} ms` : t("apiKeys.na")}</span>
        <span>{t("apiKeys.status")}: {ok ? t("apiKeys.success") : row.errorCode ?? t("apiKeys.error")}</span>
        {row.agentBindingId ? <span>{t("apiKeys.agentLinkedShort")}</span> : null}
      </div>
    </div>
  );
}
