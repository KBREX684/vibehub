"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/app/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import { WEBHOOK_EVENT_NAMES } from "@/lib/webhook-events";
import type { AgentBindingSummary, AutomationWorkflowRunSummary, AutomationWorkflowSummary } from "@/lib/types";

const ACTION_EXAMPLES = {
  create_team_task: { teamSlug: "core-team", title: "Review {{payload.taskTitle}}", description: "Created from {{event}}" },
  create_team_discussion: { teamSlug: "core-team", title: "Event {{event}}", body: "Payload task: {{payload.taskTitle}}" },
  agent_complete_team_task: { teamSlug: "core-team", taskId: "{{payload.taskId}}" },
  agent_submit_task_review: { teamSlug: "core-team", taskId: "{{payload.taskId}}", approved: true, reviewNote: "Auto-review from {{event}}" },
  request_team_task_delete: { teamSlug: "core-team", taskId: "{{payload.taskId}}", reason: "Escalated by automation" },
  request_team_member_role_change: { teamSlug: "core-team", memberUserId: "{{payload.memberUserId}}", nextRole: "reviewer", reason: "Automation requested role update" },
  send_slack_message: { webhookUrl: "https://hooks.slack.com/services/...", text: "VibeHub event {{event}} fired for {{payload.teamSlug}}" },
  send_discord_message: { webhookUrl: "https://discord.com/api/webhooks/...", content: "VibeHub event {{event}} fired" },
  send_feishu_message: { webhookUrl: "https://open.feishu.cn/open-apis/bot/...", text: "VibeHub event {{event}} fired" },
  trigger_github_repository_dispatch: { owner: "acme", repo: "ops", token: "<github-personal-access-token>", eventType: "vibehub_event", clientPayload: { teamSlug: "{{payload.teamSlug}}", taskId: "{{payload.taskId}}" } },
} as const;

const ACTION_TYPES = Object.keys(ACTION_EXAMPLES) as Array<keyof typeof ACTION_EXAMPLES>;

export function AutomationsClient({ agentBindings }: { agentBindings: AgentBindingSummary[] }) {
  const { t } = useLanguage();
  const [workflows, setWorkflows] = useState<AutomationWorkflowSummary[]>([]);
  const [runs, setRuns] = useState<AutomationWorkflowRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<(typeof WEBHOOK_EVENT_NAMES)[number]>("team.task_ready_for_review");
  const [agentBindingId, setAgentBindingId] = useState("");
  const [actionType, setActionType] = useState<keyof typeof ACTION_EXAMPLES>("create_team_task");
  const [filterJson, setFilterJson] = useState("{}");
  const [configJson, setConfigJson] = useState(JSON.stringify(ACTION_EXAMPLES.create_team_task, null, 2));

  const actionOptions = useMemo(() => ACTION_TYPES, []);

  async function refresh() {
    setLoading(true);
    try {
      const [workflowRes, runRes] = await Promise.all([
        apiFetch("/api/v1/me/automations", { credentials: "include" }),
        apiFetch("/api/v1/me/automation-runs", { credentials: "include" }),
      ]);
      const workflowJson = (await workflowRes.json()) as { data?: { workflows?: AutomationWorkflowSummary[] } };
      const runJson = (await runRes.json()) as { data?: { runs?: AutomationWorkflowRunSummary[] } };
      setWorkflows(workflowJson.data?.workflows ?? []);
      setRuns(runJson.data?.runs ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setConfigJson(JSON.stringify(ACTION_EXAMPLES[actionType], null, 2));
  }, [actionType]);

  async function createWorkflow(event: React.FormEvent) {
    event.preventDefault();
    let parsedFilter: Record<string, unknown> | undefined;
    let parsedConfig: Record<string, unknown>;
    try {
      parsedFilter = filterJson.trim() ? (JSON.parse(filterJson) as Record<string, unknown>) : undefined;
      parsedConfig = JSON.parse(configJson) as Record<string, unknown>;
    } catch {
      toast.error(t("automations.invalidJson"));
      return;
    }
    const res = await apiFetch("/api/v1/me/automations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        triggerEvent,
        filterJson: parsedFilter,
        agentBindingId: agentBindingId || undefined,
        steps: [{ actionType, config: parsedConfig }],
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      toast.error(json.error?.message ?? t("automations.createFailed"));
      return;
    }
    toast.success(t("automations.created"));
    setName("");
    setDescription("");
    setFilterJson("{}");
    void refresh();
  }

  async function toggleWorkflow(workflow: AutomationWorkflowSummary) {
    const res = await apiFetch(`/api/v1/me/automations/${encodeURIComponent(workflow.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !workflow.active }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      toast.error(json.error?.message ?? t("automations.updateFailed"));
      return;
    }
    void refresh();
  }

  async function removeWorkflow(workflow: AutomationWorkflowSummary) {
    const res = await apiFetch(`/api/v1/me/automations/${encodeURIComponent(workflow.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      toast.error(json.error?.message ?? t("automations.deleteFailed"));
      return;
    }
    toast.success(t("automations.deleted"));
    void refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={createWorkflow} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("automations.newTitle")}</h2>
        <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("automations.namePlaceholder")} required />
        <textarea className="input-base min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("automations.descriptionPlaceholder")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t("automations.triggerEvent")}</span>
            <select className="input-base" value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value as typeof triggerEvent)}>
              {WEBHOOK_EVENT_NAMES.map((eventName) => (
                <option key={eventName} value={eventName}>{eventName}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t("automations.agentBinding")}</span>
            <select className="input-base" value={agentBindingId} onChange={(e) => setAgentBindingId(e.target.value)}>
              <option value="">{t("automations.none")}</option>
              {agentBindings.map((binding) => (
                <option key={binding.id} value={binding.id}>{binding.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t("automations.action")}</span>
            <select className="input-base" value={actionType} onChange={(e) => setActionType(e.target.value as keyof typeof ACTION_EXAMPLES)}>
              {actionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-xs text-[var(--color-text-muted)]">{t("automations.payloadFilter")}</span>
          <textarea className="input-base min-h-20 font-mono text-xs" value={filterJson} onChange={(e) => setFilterJson(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-[var(--color-text-muted)]">{t("automations.stepConfig")}</span>
          <textarea className="input-base min-h-48 font-mono text-xs" value={configJson} onChange={(e) => setConfigJson(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary w-fit">{t("automations.create")}</button>
      </form>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("automations.activeTitle")}</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("automations.loading")}</p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("automations.empty")}</p>
        ) : (
          <ul className="list-none m-0 p-0 space-y-4">
            {workflows.map((workflow) => (
              <li key={workflow.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{workflow.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] m-0">{workflow.triggerEvent}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary text-xs" onClick={() => toggleWorkflow(workflow)}>
                      {workflow.active ? t("automations.disable") : t("automations.enable")}
                    </button>
                    <button type="button" className="btn btn-ghost text-xs text-[var(--color-error)]" onClick={() => removeWorkflow(workflow)}>
                      {t("automations.delete")}
                    </button>
                  </div>
                </div>
                {workflow.description && <p className="text-sm text-[var(--color-text-secondary)] m-0">{workflow.description}</p>}
                {workflow.agentBindingLabel && <p className="text-xs text-[var(--color-text-muted)] m-0">{t("automations.agentLabel")}: {workflow.agentBindingLabel}</p>}
                <ul className="list-none m-0 p-0 space-y-2">
                  {workflow.steps.map((step) => (
                    <li key={step.id} className="rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] m-0">{step.actionType}</p>
                      <pre className="m-0 mt-1 overflow-x-auto text-[11px] text-[var(--color-text-secondary)]">{JSON.stringify(step.config, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("automations.recentRuns")}</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("automations.recentRunsEmpty")}</p>
        ) : (
          <ul className="list-none m-0 p-0 space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{run.workflowName ?? run.workflowId}</p>
                <p className="text-xs text-[var(--color-text-muted)] m-0">{run.event} · {run.status}</p>
                {run.resultSummary && <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">{run.resultSummary}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
