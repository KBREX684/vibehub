"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  AgentActionAuditRow,
  AgentBindingSummary,
  AgentConfirmationRequest,
  TeamAgentMembershipSummary,
} from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { Bot, Plus, Trash2, RefreshCw, Check, X, ShieldCheck, Clock3, Users } from "lucide-react";

const TEAM_MEMBERSHIP_CHIP_CLASS =
  "inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] rounded-[var(--radius-pill)] px-2 py-0.5 border border-[var(--color-border-subtle)]";

interface ApiResponse {
  data?: {
    bindings?: AgentBindingSummary[];
    binding?: AgentBindingSummary;
    items?: AgentConfirmationRequest[] | AgentActionAuditRow[];
    memberships?: TeamAgentMembershipSummary[];
  };
  error?: { message?: string };
}

export function AgentsClient() {
  const [bindings, setBindings] = useState<AgentBindingSummary[]>([]);
  const [teamsByBinding, setTeamsByBinding] = useState<
    Record<string, TeamAgentMembershipSummary[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<AgentConfirmationRequest[]>([]);
  const [audits, setAudits] = useState<AgentActionAuditRow[]>([]);
  const [label, setLabel] = useState("");
  const [agentType, setAgentType] = useState("openai");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch("/api/v1/me/agent-bindings", { credentials: "include" });
      const json = (await response.json()) as ApiResponse;
      const [confirmationsResponse, auditsResponse] = await Promise.all([
        apiFetch("/api/v1/me/agent-confirmations?status=pending&limit=20", { credentials: "include" }),
        apiFetch("/api/v1/me/agent-audits?limit=20", { credentials: "include" }),
      ]);
      const confirmationsJson = (await confirmationsResponse.json()) as ApiResponse;
      const auditsJson = (await auditsResponse.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to load agents");
        setBindings([]);
        return;
      }
      const loadedBindings = json.data?.bindings ?? [];
      setBindings(loadedBindings);
      setConfirmations((confirmationsJson.data?.items as AgentConfirmationRequest[] | undefined) ?? []);
      setAudits((auditsJson.data?.items as AgentActionAuditRow[] | undefined) ?? []);

      // Fetch team memberships per binding (fire-and-forget per row).
      const teamsMap: Record<string, TeamAgentMembershipSummary[]> = {};
      await Promise.all(
        loadedBindings.map(async (binding) => {
          try {
            const r = await apiFetch(
              `/api/v1/me/agent-bindings/${encodeURIComponent(binding.id)}/teams`,
              { credentials: "include" }
            );
            if (!r.ok) {
              teamsMap[binding.id] = [];
              return;
            }
            const j = (await r.json()) as ApiResponse;
            teamsMap[binding.id] = j.data?.memberships ?? [];
          } catch {
            teamsMap[binding.id] = [];
          }
        })
      );
      setTeamsByBinding(teamsMap);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBindings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBinding(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch("/api/v1/me/agent-bindings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          agentType: agentType.trim(),
          description: description.trim() || undefined,
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to create agent binding");
        return;
      }
      setLabel("");
      setAgentType("openai");
      setDescription("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBinding(binding: AgentBindingSummary) {
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/me/agent-bindings/${encodeURIComponent(binding.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !binding.active }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to update agent binding");
        return;
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function removeBinding(bindingId: string) {
    if (!confirm("Delete this agent binding? Linked API keys will be detached.")) return;
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/me/agent-bindings/${encodeURIComponent(bindingId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to delete agent binding");
        return;
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function decideConfirmation(requestId: string, decision: "approved" | "rejected") {
    setMessage(null);
    try {
      const response = await apiFetch("/api/v1/me/agent-confirmations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to update confirmation request");
        return;
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Register agent identity</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-0">
            Use a stable label for each external agent or workflow. API keys can then be linked to one agent binding for audit and MCP attribution.
          </p>
        </div>
        <form onSubmit={(event) => void createBinding(event)} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Label</span>
            <input
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              placeholder="Support triage agent"
              required
            />
          </label>
          <label className="space-y-2 md:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Agent type</span>
            <input
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
              value={agentType}
              onChange={(event) => setAgentType(event.target.value)}
              maxLength={40}
              placeholder="openai"
              required
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Description</span>
            <textarea
              className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={280}
              placeholder="Handles backlog triage, report summarization, and MCP read tools."
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-60">
              <Plus className="w-4 h-4" />
              {saving ? "Creating..." : "Create binding"}
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </form>
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Bound agents</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-0">
            Active bindings can be attached to API keys. Deleting a binding detaches existing keys but does not revoke them.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)] m-0">Loading agents...</p>
        ) : bindings.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
            No agent bindings yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bindings.map((binding) => {
              const teamMemberships = teamsByBinding[binding.id] ?? [];
              return (
                <article key={binding.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-featured)]">
                          <Bot className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{binding.label}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] m-0">{binding.agentType}</p>
                        </div>
                        <span className={`badge ${binding.active ? "badge-green" : "badge-neutral"}`}>{binding.active ? "Active" : "Paused"}</span>
                      </div>
                      {binding.description ? <p className="text-sm text-[var(--color-text-secondary)] mb-0">{binding.description}</p> : null}
                      <p className="text-xs text-[var(--color-text-muted)] mb-0">Updated {new Date(binding.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button type="button" onClick={() => void toggleBinding(binding)} className="btn btn-secondary text-xs px-3 py-1.5">
                        {binding.active ? "Pause" : "Resume"}
                      </button>
                      <button type="button" onClick={() => void removeBinding(binding.id)} className="btn btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-[var(--color-danger)]">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                  {teamMemberships.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <Users className="w-3 h-3" aria-hidden="true" />
                        In teams:
                      </span>
                      {teamMemberships.map((m) => (
                        <Link
                          key={m.id}
                          href={m.teamSlug ? `/teams/${m.teamSlug}/agents` : "#"}
                          className={TEAM_MEMBERSHIP_CHIP_CLASS}
                        >
                          <span className="font-medium">{m.teamName ?? m.teamSlug ?? m.teamId}</span>
                          <span className="font-mono text-[var(--color-text-tertiary)]">· {m.role}</span>
                          {!m.active ? (
                            <span className="text-[var(--color-text-muted)]">(paused)</span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Pending confirmations</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-0">
            High-risk or final review actions requested by agent-bound API keys stop here until a human confirms them.
          </p>
        </div>
        {confirmations.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
            No pending confirmation requests.
          </div>
        ) : (
          <div className="space-y-3">
            {confirmations.map((item) => (
              <article key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.action}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] m-0">
                      {item.teamSlug ? `/${item.teamSlug}` : "No team"}{item.taskTitle ? ` · ${item.taskTitle}` : ""}
                    </p>
                  </div>
                  <span className="badge badge-yellow inline-flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />
                    {item.status}
                  </span>
                </div>
                {item.reason ? <p className="text-sm text-[var(--color-text-secondary)] m-0">{item.reason}</p> : null}
                <p className="text-xs text-[var(--color-text-muted)] m-0">
                  Requested {new Date(item.createdAt).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void decideConfirmation(item.id, "approved")} className="btn btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button type="button" onClick={() => void decideConfirmation(item.id, "rejected")} className="btn btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-[var(--color-danger)]">
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Recent agent audit</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-0">
            Every bound agent action is logged independently from the main audit log.
          </p>
        </div>
        {audits.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
            No recorded agent actions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((item) => (
              <article key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-primary-hover)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.action}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] m-0">
                        Outcome: {item.outcome}{item.taskId ? ` · Task ${item.taskId}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {message ? <p className="text-sm text-[var(--color-danger)] m-0">{message}</p> : null}
    </div>
  );
}
