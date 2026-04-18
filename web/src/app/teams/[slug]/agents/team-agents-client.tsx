"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import { formatLocalizedDateTime } from "@/lib/formatting";
import type {
  AgentBindingSummary,
  TeamAgentMembershipSummary,
  TeamAgentRole,
} from "@/lib/types";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  FormField,
  LoadingSkeleton,
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

const ROLE_OPTIONS: Array<{
  value: TeamAgentRole;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
  accent: "default" | "apple" | "violet" | "cyan" | "success" | "warning";
}> = [
  {
    value: "reader",
    labelKey: "team.agents.roles.reader",
    defaultLabel: "Reader",
    descKey: "team.agents.roles.reader_description",
    defaultDesc: "Read-only access",
    accent: "default",
  },
  {
    value: "commenter",
    labelKey: "team.agents.roles.commenter",
    defaultLabel: "Commenter",
    descKey: "team.agents.roles.commenter_description",
    defaultDesc: "Read + inline comments",
    accent: "cyan",
  },
  {
    value: "executor",
    labelKey: "team.agents.roles.executor",
    defaultLabel: "Executor",
    descKey: "team.agents.roles.executor_description",
    defaultDesc: "Claim + complete tasks (via confirmation)",
    accent: "violet",
  },
  {
    value: "reviewer",
    labelKey: "team.agents.roles.reviewer",
    defaultLabel: "Reviewer",
    descKey: "team.agents.roles.reviewer_description",
    defaultDesc: "Advisory reviews on tasks",
    accent: "warning",
  },
  {
    value: "coordinator",
    labelKey: "team.agents.roles.coordinator",
    defaultLabel: "Coordinator",
    descKey: "team.agents.roles.coordinator_description",
    defaultDesc: "Create and assign tasks (owner/admin only)",
    accent: "success",
  },
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
  const { language, t } = useLanguage();
  const [memberships, setMemberships] = React.useState(initialMemberships);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [availableBindings, setAvailableBindings] = React.useState<AgentBindingSummary[] | null>(null);
  const [loadingBindings, setLoadingBindings] = React.useState(false);
  const [selectedBindingId, setSelectedBindingId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<TeamAgentRole>("reader");
  const [removeTarget, setRemoveTarget] = React.useState<TeamAgentMembershipSummary | null>(null);

  const roleOptions = React.useMemo(
    () =>
      ROLE_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey, option.defaultLabel),
        desc: t(option.descKey, option.defaultDesc),
      })),
    [t]
  );

  async function refetch() {
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/agents`, {
        credentials: "include",
      });
      const json = (await res.json()) as MembershipResponse;
      if (!res.ok) {
        setError(json.error?.message ?? t("team.agents.errors.reload", "Failed to reload agents"));
        return;
      }
      setMemberships(json.data?.memberships ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const loadAvailableBindings = React.useCallback(async () => {
    setLoadingBindings(true);
    try {
      const res = await apiFetch("/api/v1/me/agent-bindings", {
        credentials: "include",
      });
      const json = (await res.json()) as AgentsListResponse;
      if (!res.ok) {
        setError(
          json.error?.message ??
            t("team.agents.errors.load_bindings", "Failed to load your agent bindings")
        );
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
  }, [t]);

  React.useEffect(() => {
    if (addOpen && availableBindings === null) {
      void loadAvailableBindings();
    }
  }, [addOpen, availableBindings, loadAvailableBindings]);

  async function handleAdd() {
    if (!selectedBindingId) {
      setError(t("team.agents.errors.select_binding", "Pick an agent binding to add"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/agents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentBindingId: selectedBindingId,
          role: selectedRole,
        }),
      });
      const json = (await res.json()) as MembershipResponse;
      if (!res.ok) {
        setError(json.error?.message ?? t("team.agents.errors.add", "Failed to add agent"));
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
        setError(json.error?.message ?? t("team.agents.errors.update", "Failed to update agent"));
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
        setError(json.error?.message ?? t("team.agents.errors.remove", "Failed to remove agent"));
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
    return availableBindings.filter((binding) => !alreadyIn.has(binding.id));
  }, [availableBindings, memberships]);

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {canManage ? (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {t("team.agents.add_agent", "Add agent")}
          </Button>
        </div>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="space-y-2">
          {memberships.map((membership) => (
            <li key={membership.id} className={ROSTER_ROW_CLASS}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={ROSTER_ICON_CLASS}>
                  <Bot className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0 truncate">
                    {membership.agentLabel ?? membership.agentBindingId}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-0.5 truncate">
                    <span className="font-mono">{membership.agentType ?? "agent"}</span>
                    {" · "}
                    {t("team.agents.owner_label", "owner")}{" "}
                    <span className="text-[var(--color-text-secondary)]">
                      {membership.ownerName ?? membership.ownerUserId}
                    </span>
                    {membership.grantedByName ? (
                      <>
                        {" · "}
                        {t("team.agents.granted_by", "granted by")}{" "}
                        <span className="text-[var(--color-text-secondary)]">
                          {membership.grantedByName}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {membership.lastActionAt ? (
                    <p className="text-xs text-[var(--color-text-tertiary)] m-0 mt-0.5">
                      {t("team.agents.last_action", "Last action")}{" "}
                      {formatLocalizedDateTime(membership.lastActionAt, language)}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                      {t("team.agents.no_activity", "No activity yet")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Badge variant={roleAccent(membership.role)} pill mono size="sm">
                  {roleOptions.find((option) => option.value === membership.role)?.label ?? membership.role}
                </Badge>
                <Badge variant={membership.active ? "success" : "default"} pill size="sm">
                  {membership.active
                    ? t("team.agents.status_active", "Active")
                    : t("team.agents.status_paused", "Paused")}
                </Badge>
                {canManage ? (
                  <>
                    <select
                      className="input-base py-1 pr-6 text-xs max-w-[160px]"
                      value={membership.role}
                      disabled={busy}
                      onChange={(event) =>
                        void patchMembership(membership, {
                          role: event.target.value as TeamAgentRole,
                        })
                      }
                      aria-label={t("team.agents.change_role_for", "Change role for {agent}").replace(
                        "{agent}",
                        membership.agentLabel ?? membership.agentBindingId
                      )}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant={membership.active ? "ghost" : "secondary"}
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void patchMembership(membership, { active: !membership.active })
                      }
                    >
                      {membership.active
                        ? t("team.agents.pause", "Pause")
                        : t("team.agents.resume", "Resume")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(membership)}
                      disabled={busy}
                      aria-label={t("team.agents.remove_from_team", "Remove agent from team")}
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

      <ConfirmDialog
        open={addOpen}
        title={t("team.agents.dialog_title", "Add agent to team")}
        description={t(
          "team.agents.dialog_description",
          "Pick one of your agent bindings and choose the role card you want to grant."
        )}
        confirmLabel={t("common.add", "Add")}
        cancelLabel={t("common.cancel", "Cancel")}
        onClose={() => {
          if (!busy) setAddOpen(false);
        }}
        onConfirm={handleAdd}
      >
        <div className="space-y-3">
          <FormField
            label={t("team.agents.binding_label", "Agent binding")}
            hint={t(
              "team.agents.binding_hint",
              "Only bindings you own are listed. Agents already in this team are hidden."
            )}
            required
          >
            {loadingBindings ? (
              <LoadingSkeleton preset="list" count={2} />
            ) : availableForThisTeam.length === 0 ? (
              <EmptyState
                icon={Bot}
                title={t("team.agents.no_eligible_title", "No eligible agent bindings")}
                description={t(
                  "team.agents.no_eligible_description",
                  "Create an agent binding under Settings → My Agents first, or remove an existing membership."
                )}
              />
            ) : (
              <select
                className="input-base"
                value={selectedBindingId}
                onChange={(event) => setSelectedBindingId(event.target.value)}
              >
                <option value="">{t("team.agents.pick_agent", "Pick an agent…")}</option>
                {availableForThisTeam.map((binding) => (
                  <option key={binding.id} value={binding.id}>
                    {binding.label} · {binding.agentType}
                    {!binding.active ? ` (${t("team.agents.status_paused", "Paused").toLowerCase()})` : ""}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            label={t("team.agents.role_card_label", "Role card")}
            hint={t("team.agents.role_card_hint", "Can be changed later.")}
          >
            <select
              className="input-base"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as TeamAgentRole)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.desc}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            <ShieldCheck
              className="inline w-3 h-3 mr-1 -mt-0.5 text-[var(--color-accent-violet)]"
              aria-hidden="true"
            />
            {t(
              "team.agents.confirmation_notice",
              "Agents never act without human approval for risky writes. All high-risk actions still route through the confirmation queue."
            )}
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={removeTarget !== null}
        title={t("team.agents.remove_title", "Remove agent from team?")}
        description={
          removeTarget
            ? t(
                "team.agents.remove_description",
                'This revokes "{agent}" from the team immediately. Audit history is preserved.'
              ).replace("{agent}", removeTarget.agentLabel ?? removeTarget.agentBindingId)
            : undefined
        }
        confirmLabel={t("common.remove", "Remove")}
        cancelLabel={t("common.cancel", "Cancel")}
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
