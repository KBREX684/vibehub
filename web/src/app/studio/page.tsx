"use client";

import { Suspense } from "react";
import { StudioShell } from "@/components/studio-shell";
import { StudioTopBar } from "@/components/studio-top-bar";
import { StudioViewTabs, useStudioView } from "@/components/studio-view-tabs";
import { LedgerStampBadge } from "@/components/ledger-stamp-badge";
import { EmptyState } from "@/components/ui";
import { getMockLedgerEntries } from "@/lib/data/mock-ledger";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  FileIcon,
  Camera,
  Bot,
  Briefcase,
} from "lucide-react";

function StudioViewContent() {
  const view = useStudioView();
  const { t } = useLanguage();

  switch (view) {
    case "tasks":
      return <TasksView />;
    case "activity":
      return <ActivityPlaceholder />;
    case "files":
      return <PlaceholderView icon={FileIcon} title={t("studio.view.files", "Files")} />;
    case "snapshots":
      return <PlaceholderView icon={Camera} title={t("studio.view.snapshots", "Snapshots")} />;
    case "agents":
      return <PlaceholderView icon={Bot} title={t("studio.view.agents", "Agents")} />;
    case "works":
      return <WorksView />;
    default:
      return <TasksView />;
  }
}

function TasksView() {
  const entries = getMockLedgerEntries();
  const tasks = entries.filter((e) => e.actionKind === "agent.task.complete" || e.actionKind === "deliverable.approve");

  const inProgress = tasks.filter((e) => e.actorType === "agent" && !e.anchorTxId);
  const completed = tasks.filter((e) => e.anchorTxId);

  return (
    <div className="p-4 space-y-6">
      {inProgress.length > 0 && (
        <section>
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            进行中 ({inProgress.length})
          </h3>
          <div className="space-y-2">
            {inProgress.map((entry) => (
              <TaskCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            已完成 ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map((entry) => (
              <TaskCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {tasks.length === 0 && (
        <EmptyState
          title="还没有任务"
          description="开始使用 Studio 后，你的 Agent 任务会出现在这里。"
        />
      )}
    </div>
  );
}

function TaskCard({ entry }: { entry: import("@/lib/data/mock-ledger").LedgerEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs font-mono">
          {entry.actorType === "agent" ? "AI" : "U"}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-primary)] truncate m-0">
            {entry.actionKind === "agent.task.complete" ? "Agent 完成任务" : "确认交付"}
          </p>
          <p className="text-xs font-mono text-[var(--color-text-muted)] m-0 mt-0.5">
            {new Date(entry.signedAt).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>
      <LedgerStampBadge entry={entry} />
    </div>
  );
}

function WorksView() {
  const entries = getMockLedgerEntries();
  const uploads = entries.filter((e) => e.actionKind === "workspace.artifact.upload");

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
          公开作品 ({uploads.length})
        </h3>
      </div>
      {uploads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {uploads.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
              <div className="flex items-center gap-3 min-w-0">
                <Briefcase className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate m-0">
                    {entry.targetId ?? "未命名作品"}
                  </p>
                  <p className="text-xs font-mono text-[var(--color-text-muted)] m-0 mt-0.5">
                    {new Date(entry.signedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>
              <LedgerStampBadge entry={entry} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="还没有公开作品"
          description="上传文件到 Studio 后，作品会出现在这里。"
        />
      )}
    </div>
  );
}

function ActivityPlaceholder() {
  const { t } = useLanguage();
  return (
    <div className="p-4">
      <EmptyState
        title={t("studio.activity_placeholder_title", "Activity 时间线")}
        description={t("studio.activity_placeholder_desc", "P4 完成后，这里会显示 LedgerTimeline。")}
      />
    </div>
  );
}

function PlaceholderView({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="p-4">
      <EmptyState
        title={title}
        description={`${title}视图即将上线。`}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <StudioShell>
      <StudioTopBar />
      <StudioViewTabs />
      <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>}>
        <StudioViewContent />
      </Suspense>
    </StudioShell>
  );
}
