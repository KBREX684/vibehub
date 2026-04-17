"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type {
  AgentBindingSummary,
  TeamAgentMembershipSummary,
  TeamAgentRole,
} from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  FormField,
  LoadingSkeleton,
  TagPill,
} from "@/components/ui";

interface Props {
  teamSlug: string;
  initialMemberships: TeamAgentMembershipSummary[];
  canManage: boolean;
}

interface AgentsListResponse {
  data?: { bindings?: AgentBindingSummary[] };
  error?: { message?: string };
}

interface MembershipResponse {
  data?: {
    membership?: TeamAgentMembershipSummary;
    memberships?: TeamAgentMembershipSummary[];
  };
  error?: { code?: string; message?: string };
}

const ROLE_OPTIONS: Array<{ value: TeamAgentRole; label: string; desc: string; accent: "default" | "apple" | "violet" | "cyan" | "success" | "warning" }> = [
  { value: "reader", label: "Reader", desc: "Read-only access", accent: "default" },
  { value: "commenter", label: "Commenter", desc: "Read + inline comments", accent: "cyan" },
  { value: "executor", label: "Executor", desc: "Claim + complete tasks (via Confirmation)", accent: "violet" },
  { value: "reviewer", label: "Reviewer", desc: "Advisory reviews on tasks", accent: "warning" },
  { value: "coordinator", label: "Coordinator", desc: "Create & assign tasks (owner/admin only)", accent: "success" },
];

function roleAccent(role: TeamAgentRole) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.accent ?? "default";
}

const ROSTER_ROW_CLASS =
  "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center";

const ROSTER_ICON_CLASS =
  "w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent-violet)] shrink-0";

export function TeamAgentsClient({ teamSlug, initialMemberships, canManage }: Props) {
  const router = useRouter();
  const [memberships, setMemberships] = React.useState(initialMemberships);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [availableBindings, setAvailableBindings] = React.useState<AgentBindingSummary[] | null>(null);
  const [loadingBindings, setLoadingBindings] = React.useState(false);
  const [selectedBindingId, setSelectedBindingId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<TeamAgentRole>("reader");
  const [removeTarget, setRemoveTarget] = React.useState<TeamAgentMembershipSummary | null>(null);

  async function refetch() {
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/agents`,
        { credentials: "include" }
      );
      const json = (await res.json()) as MembershipResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to reload agents");
        return;
      }
      setMemberships(json.data?.memberships ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadAvailableBindings() {
    setLoadingBindings(true);
    try {
      const res = await apiFetch("/api/v1/me/agent-bindings", {
        credentials: "include",
      });
      const json = (await res.json()) as AgentsListResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to load your agent bindings");
        setAvailableBindings([]);
        return;
      }
      setAvailableBindings(json.data?.bindings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAvailableBindings([]);
    } finally {
      setLoadingBindings(false);
    }
  }

  React.useEffect(() => {
    if (addOpen && availableBindings === null) {
      void loadAvailableBindings();
    }
  }, [addOpen, availableBindings]);

  async function handleAdd() {
    if (!selectedBindingId) {
      setError("Pick an agent binding to add");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/agents`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentBindingId: selectedBindingId,
            role: selectedRole,
          }),
        }
      );
      const json = (await res.json()) as MembershipResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to add agent");
        return;
      }
      setAddOpen(false);
      setSelectedBindingId("");
      setSelectedRole("reader");
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  async function patchMembership(
    membership: TeamAgentMembershipSummary,
    body: { role?: TeamAgentRole; active?: boolean }
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/agents/${encodeURIComponent(membership.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as MembershipResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to update agent");
        return;
      }
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(membership: TeamAgentMembershipSummary) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/agents/${encodeURIComponent(membership.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const json = (await res.json()) as MembershipResponse;
        setError(json.error?.message ?? "Failed to remove agent");
        return;
      }
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  const availableForThisTeam = React.useMemo(() => {
    if (!availableBindings) return [];
    const alreadyIn = new Set(memberships.map((m) => m.agentBindingId));
    return availableBindings.filter((b) => !alreadyIn.has(b.id));
  }, [availableBindings, memberships]);

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {canManage ? (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add agent
          </Button>
        </div>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="space-y-2">
          {memberships.map((m) => (
            <li key={m.id} className={ROSTER_ROW_CLASS}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={ROSTER_ICON_CLASS}>
                  <Bot className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 truncate">
                    {m.agentLabel ?? m.agentBindingId}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-0.5 truncate">
                    <span className="font-mono">{m.agentType ?? "agent"}</span>
                    {" · owner: "}
                    <span className="text-[var(--color-text-secondary)]">
                      {m.ownerName ?? m.ownerUserId}
                    </span>
                    {m.grantedByName ? (
                      <>
                        {" · granted by "}
                        <span className="text-[var(--color-text-secondary)]">
                          {m.grantedByName}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {m.lastActionAt ? (
                    <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-0.5">
                      Last action {new Date(m.lastActionAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                      No activity yet
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <TagPill accent={roleAccent(m.role)} size="sm" mono>
                  {m.role}
                </TagPill>
                <TagPill accent={m.active ? "success" : "default"} size="sm">
                  {m.active ? "active" : "paused"}
                </TagPill>
                {canManage ? (
                  <>
                    <select
                      className="input-base py-1 pr-6 text-xs max-w-[160px]"
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        void patchMembership(m, {
                          role: e.target.value as TeamAgentRole,
                        })
                      }
                      aria-label={`Change role for ${m.agentLabel ?? m.agentBindingId}`}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant={m.active ? "ghost" : "secondary"}
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void patchMembership(m, { active: !m.active })
                      }
                    >
                      {m.active ? "Pause" : "Resume"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(m)}
                      disabled={busy}
                      aria-label="Remove agent from team"
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Add dialog */}
      <ConfirmDialog
        open={addOpen}
        title="Add agent to team"
        description="Pick one of your agent bindings and choose the role card you want to grant."
        confirmLabel="Add"
        cancelLabel="Cancel"
        onClose={() => {
          if (!busy) setAddOpen(false);
        }}
        onConfirm={handleAdd}
      >
        <div className="space-y-3">
          <FormField
            label="Agent binding"
            hint="Only bindings you own are listed. Agents already in this team are hidden."
            required
          >
            {loadingBindings ? (
              <LoadingSkeleton preset="list" count={2} />
            ) : availableForThisTeam.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No eligible agent bindings"
                description="Create an agent binding under Settings → My Agents first, or remove an existing membership."
              />
            ) : (
              <select
                className="input-base"
                value={selectedBindingId}
                onChange={(e) => setSelectedBindingId(e.target.value)}
              >
                <option value="">Pick an agent…</option>
                {availableForThisTeam.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} · {b.agentType}
                    {!b.active ? " (paused)" : ""}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Role card" hint="Can be changed later.">
            <select
              className="input-base"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as TeamAgentRole)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </FormField>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            <ShieldCheck
              className="inline w-3 h-3 mr-1 -mt-0.5 text-[var(--color-accent-violet)]"
              aria-hidden="true"
            />
            Agents never act without human approval for risky writes. All
            high-risk actions still route through the confirmation queue.
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove agent from team?"
        description={
          removeTarget
            ? `This revokes "${removeTarget.agentLabel ?? removeTarget.agentBindingId}" from the team immediately. Audit history is preserved.`
            : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        tone="destructive"
        onClose={() => {
          if (!busy) setRemoveTarget(null);
        }}
        onConfirm={async () => {
          if (removeTarget) await handleRemove(removeTarget);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
