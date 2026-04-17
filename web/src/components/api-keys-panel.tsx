"use client";

/**
 * v8 W2 — migrated off the legacy "Apple liquid-glass" palette.
 *
 * All `rgba(255,255,255,0.85)` / `text-white` / `bg-[#2d2d30]` /
 * `bg-[#007aff]` / `bg-[#e11d48]` literals removed in favor of:
 *   - globals.css tokens (`--color-bg-surface`, `--color-accent-apple`, etc.)
 *   - v8 primitives: SectionCard, EmptyState, Button, CopyButton, TagPill,
 *     ConfirmDialog, LoadingSkeleton, FormField
 *
 * Functional contract preserved:
 *   - loads /api/v1/me/api-keys and /api/v1/me/agent-bindings
 *   - creates new key with label + scopes + optional agentBindingId
 *   - reveals the one-time plaintext secret with CopyButton
 *   - revokes (with confirm dialog instead of window.confirm)
 *   - surfaces upgrade gating via UpgradePlanCallout
 */

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { AnimatePresence, motion } from "framer-motion";
import {
  API_KEY_SCOPE_READ_PUBLIC,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
} from "@/lib/api-key-scopes";
import type { AgentBindingSummary, ApiKeyCreated, ApiKeySummary } from "@/lib/types";
import type { UpgradeReason } from "@/lib/subscription";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import {
  Key,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Shield,
  Sparkles,
  Bot,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Button,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  FormField,
  LoadingSkeleton,
  SectionCard,
  TagPill,
} from "@/components/ui";

const OPTIONAL_SCOPES = API_KEY_SCOPES.filter((s) => s !== API_KEY_SCOPE_READ_PUBLIC);

interface Props {
  currentUserId: string | null;
}

export function ApiKeysPanel({ currentUserId }: Props) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [agentBindings, setAgentBindings] = useState<AgentBindingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | undefined>(undefined);
  const [newLabel, setNewLabel] = useState("");
  const [selectedAgentBindingId, setSelectedAgentBindingId] = useState("");
  const [lastSecret, setLastSecret] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const x of DEFAULT_API_KEY_SCOPES) {
      if (x !== API_KEY_SCOPE_READ_PUBLIC) s.add(x);
    }
    return s;
  });
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);

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
        setMsg(keysJson.error?.message ?? "Failed to load keys");
        setKeys([]);
        return;
      }
      if (!bindingsRes.ok) {
        setMsg(bindingsJson.error?.message ?? "Failed to load agents");
        setAgentBindings([]);
      } else {
        setAgentBindings(bindingsJson.data?.bindings ?? []);
      }
      setKeys(keysJson.data?.keys ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
        setMsg(json.error?.message ?? "Create failed");
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
        setMsg(json.error?.message ?? "Revoke failed");
        return;
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!currentUserId) {
    return (
      <SectionCard icon={Key} title="Authentication required" description="Please sign in to manage your API keys and access tokens.">
        <div className="flex justify-center">
          {isDevDemoAuth() ? (
            <a href="/api/v1/auth/demo-login?role=user&redirect=/settings/api-keys">
              <Button variant="apple" size="md">
                Demo login
              </Button>
            </a>
          ) : (
            <Link href="/login?redirect=%2Fsettings%2Fapi-keys">
              <Button variant="apple" size="md">
                Sign in
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
        title="API keys"
        description="Use these keys to authenticate scripts, integrations, or AI agents. Each key is scoped. Bearer access is subject to per-key rate limits."
      />

      {/* Create key */}
      <SectionCard
        icon={Plus}
        title="Create new key"
        description="Label the key, choose scopes, and optionally link it to one of your agent bindings for attribution."
      >
        <form onSubmit={(ev) => void createKey(ev)} className="space-y-4">
          <FormField label="Key label" required>
            <input
              className="input-base"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g., Production Agent, CI/CD Pipeline"
            />
          </FormField>

          <FormField
            label={
              <span className="inline-flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                Linked agent
              </span>
            }
            hint={
              <>
                Link the key to a named agent so MCP and API audits stay attributable. Manage agents in{" "}
                <Link href="/settings/agents" className="underline hover:text-[var(--color-text-primary)]">
                  Settings
                </Link>
                .
              </>
            }
          >
            <select
              className="input-base"
              value={selectedAgentBindingId}
              onChange={(event) => setSelectedAgentBindingId(event.target.value)}
            >
              <option value="">No linked agent</option>
              {agentBindings.map((binding) => (
                <option key={binding.id} value={binding.id}>
                  {binding.label} · {binding.agentType}
                  {!binding.active ? " (paused)" : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                Scopes & permissions
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
                  aria-label="Required base scope"
                />
                <code className="text-xs font-mono rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-1.5 py-0.5">
                  {API_KEY_SCOPE_READ_PUBLIC}
                </code>
                <span className="text-xs text-[var(--color-text-tertiary)]">(required base scope)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                {OPTIONAL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(s)}
                      onChange={() => {
                        setSelectedScopes((prev) => {
                          const n = new Set(prev);
                          if (n.has(s)) n.delete(s);
                          else n.add(s);
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 accent-[var(--color-accent-apple)]"
                    />
                    <code className="text-xs font-mono rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 group-hover:border-[var(--color-border)]">
                      {s}
                    </code>
                  </label>
                ))}
              </div>
            </div>
          </FormField>

          <Button variant="primary" size="md" type="submit">
            Generate secret key
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
                  <h4 className="text-sm font-semibold m-0">Save this key now</h4>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] m-0 mb-3 leading-relaxed">
                  For your security, this secret key will only be shown once. You will not be able to see it
                  again after leaving this page.
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

        {msg ? (
          <p className="mt-4 text-xs text-[var(--color-error)] bg-[var(--color-error-subtle)] rounded-[var(--radius-md)] px-3 py-2 inline-flex items-center gap-2 m-0">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {msg}
          </p>
        ) : null}
        {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} className="mt-4" /> : null}
      </SectionCard>

      {/* Keys list */}
      <SectionCard icon={Key} title="Active keys" description="All keys issued to this account. Revoke any key to invalidate it immediately.">
        {loading && keys.length === 0 ? (
          <LoadingSkeleton preset="list" count={3} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={Key}
            title="No API keys yet"
            description="Create one above to start calling the platform via MCP or OpenAPI."
          />
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <article
                key={k.id}
                className={[
                  "rounded-[var(--radius-lg)] border p-4 transition-colors",
                  k.revokedAt
                    ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] opacity-75"
                    : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
                ].join(" ")}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <strong className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {k.label}
                      </strong>
                      {k.revokedAt ? (
                        <TagPill accent="default" size="sm" mono>
                          revoked
                        </TagPill>
                      ) : (
                        <TagPill accent="success" size="sm" mono>
                          active
                        </TagPill>
                      )}
                    </div>
                    <code className="inline-block text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-1.5 py-0.5">
                      {k.prefix}••••••••••••••••
                    </code>
                  </div>

                  {!k.revokedAt ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRevokeTarget(k)}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Revoke
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--color-text-tertiary)] mb-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Created: {formatDate(k.createdAt)}
                  </span>
                  {k.agentBinding ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Bot className="w-3 h-3" aria-hidden="true" />
                      Agent: {k.agentBinding.label}
                    </span>
                  ) : null}
                  {k.lastUsedAt && !k.revokedAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Last used: {formatDate(k.lastUsedAt)}
                    </span>
                  ) : null}
                  {k.revokedAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      Revoked: {formatDate(k.revokedAt)}
                    </span>
                  ) : null}
                </div>

                <div className="pt-3 border-t border-[var(--color-border-subtle)]">
                  <div className="flex flex-wrap gap-1.5">
                    {k.scopes.map((scope) => (
                      <TagPill key={scope} accent="default" size="sm" mono>
                        {scope}
                      </TagPill>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke API key?"
        description={
          revokeTarget
            ? `This will immediately invalidate "${revokeTarget.label}". Any integrations using it will stop working. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Revoke"
        cancelLabel="Cancel"
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
