"use client";

import { useState, Suspense } from "react";
import { StudioShell } from "@/components/studio-shell";
import { StudioTopBar } from "@/components/studio-top-bar";
import { LedgerStampBadge } from "@/components/ui/ledger-stamp-badge";
import { EmptyState, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { getMockLedgerEntries } from "@/lib/data/mock-ledger";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  ListTodo,
  Activity,
  FileIcon,
  Camera,
  Bot,
  Inbox,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

type StudioView = "tasks" | "activity" | "files" | "snapshots" | "agents";

function TasksPanel() {
  const entries = getMockLedgerEntries();
  const tasks = entries.filter((e) => e.actionKind === "agent.task.complete" || e.actionKind === "deliverable.approve");

  const inProgress = tasks.filter((e) => e.actorType === "agent" && !e.anchorTxId);
  const pendingConfirm = tasks.filter((e) => e.actionKind === "deliverable.approve" && !e.anchorTxId);
  const completed = tasks.filter((e) => e.anchorTxId);

  return (
    <div className="p-6 space-y-8">
      {/* Kanban Board */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 进行中 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-info)]" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
              进行中 ({inProgress.length})
            </h3>
          </div>
          <div className="space-y-2">
            {inProgress.map((entry) => (
              <TaskCard key={entry.id} entry={entry} status="running" />
            ))}
          </div>
        </div>

        {/* 待确认 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
              待确认 ({pendingConfirm.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingConfirm.map((entry) => (
              <TaskCard key={entry.id} entry={entry} status="pending_confirm" />
            ))}
          </div>
        </div>

        {/* 已完成 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
              已完成 ({completed.length})
            </h3>
          </div>
          <div className="space-y-2">
            {completed.map((entry) => (
              <TaskCard key={entry.id} entry={entry} status="done" />
            ))}
          </div>
        </div>
      </div>

      {tasks.length === 0 && (
        <EmptyState
          icon={ListTodo}
          title="还没有 Agent 任务"
          description="在 Settings 绑定 Agent，或使用 Cursor / Claude Code 通过 MCP 推送任务。"
        />
      )}
    </div>
  );
}

function TaskCard({ entry, status }: { entry: import("@/lib/data/mock-ledger").LedgerEntry; status: "running" | "pending_confirm" | "done" | "failed" }) {
  const statusConfig = {
    running: { icon: Clock, color: "var(--color-info)", label: "进行中" },
    pending_confirm: { icon: CheckCircle, color: "var(--color-warning)", label: "待确认" },
    done: { icon: CheckCircle, color: "var(--color-success)", label: "已完成" },
    failed: { icon: XCircle, color: "var(--color-error)", label: "失败" },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="card p-4 cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
          <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
            {entry.actorType === "agent" ? "AI" : "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate m-0">
            {entry.actionKind === "agent.task.complete" ? "Agent 完成任务" : "确认交付"}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">
            from project-x · {new Date(entry.signedAt).toLocaleString("zh-CN")}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>

            {/* Ledger stamp for completed tasks */}
            {status === "done" && (
              <LedgerStampBadge
                signature={entry.signature}
                state={entry.anchorTxId ? "anchored" : "default"}
              />
            )}
          </div>

          {/* Pending actions */}
          {status === "pending_confirm" && (
            <div className="flex items-center gap-2 mt-3">
              <button className="btn btn-primary text-xs py-1.5 px-3">确认</button>
              <button className="btn btn-ghost text-xs py-1.5 px-3">驳回</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityPanel() {
  const { t } = useLanguage();

  return (
    <div className="p-6">
      <EmptyState
        icon={Activity}
        title={t("studio.activity_placeholder_title", "活动")}
        description="查看完整 Ledger 时间线 →"
      />
    </div>
  );
}

function FilesPanel() {
  const { t } = useLanguage();
  const entries = getMockLedgerEntries();
  const uploads = entries.filter((e) => e.actionKind === "workspace.artifact.upload");

  return (
    <div className="p-6 space-y-4">
      {/* Upload dropzone */}
      <div className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 text-center hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer">
        <Upload className="w-8 h-8 mx-auto text-[var(--color-text-tertiary)] mb-3" />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          拖拽文件到此处上传
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          或点击选择文件
        </p>
      </div>

      {/* Files grid */}
      {uploads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((entry) => (
            <ArtifactCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileIcon}
          title="还没有文件"
          description="上传文件到 Studio 后，它们会出现在这里。"
        />
      )}
    </div>
  );
}

function ArtifactCard({ entry }: { entry: import("@/lib/data/mock-ledger").LedgerEntry }) {
  return (
    <div className="card p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
          <FileIcon className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {entry.targetId ?? "未命名文件"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {new Date(entry.signedAt).toLocaleDateString("zh-CN")}
          </p>

          {/* Validation status */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--color-success-subtle)] text-[var(--color-success)]">
              <CheckCircle className="w-3 h-3 mr-1" />
              已就绪
            </span>
            {entry.anchorTxId && (
              <LedgerStampBadge signature={entry.signature} state="anchored" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotsPanel() {
  const { t } = useLanguage();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <button className="btn btn-primary text-sm">
          <Camera className="w-4 h-4 mr-1.5" />
          创建快照
        </button>
      </div>

      <EmptyState
        icon={Camera}
        title="还没有快照"
        description="创建第一个快照来保存工作进度。"
      />
    </div>
  );
}

function AgentsPanel() {
  const { t } = useLanguage();

  return (
    <div className="p-6">
      <EmptyState
        icon={Bot}
        title="Agent 绑定"
        description="在 Settings 中管理 Agent 绑定。"
      />
    </div>
  );
}

export default function StudioPage() {
  const [activeView, setActiveView] = useState<StudioView>("tasks");

  return (
    <StudioShell>
      <StudioTopBar />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as StudioView)}>
        <TabList className="px-4 border-b border-[var(--color-border)]">
          <Tab value="tasks">
            <ListTodo className="w-4 h-4 mr-1.5" />
            任务
          </Tab>
          <Tab value="activity">
            <Activity className="w-4 h-4 mr-1.5" />
            活动
          </Tab>
          <Tab value="files">
            <FileIcon className="w-4 h-4 mr-1.5" />
            文件
          </Tab>
          <Tab value="snapshots">
            <Camera className="w-4 h-4 mr-1.5" />
            快照
          </Tab>
          <Tab value="agents">
            <Bot className="w-4 h-4 mr-1.5" />
            Agent
          </Tab>
        </TabList>

        <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>}>
          <TabPanel value="tasks">
            <TasksPanel />
          </TabPanel>
          <TabPanel value="activity">
            <ActivityPanel />
          </TabPanel>
          <TabPanel value="files">
            <FilesPanel />
          </TabPanel>
          <TabPanel value="snapshots">
            <SnapshotsPanel />
          </TabPanel>
          <TabPanel value="agents">
            <AgentsPanel />
          </TabPanel>
        </Suspense>
      </Tabs>
    </StudioShell>
  );
}
