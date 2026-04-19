import React, { useState } from "react";
import { ConsoleShell } from "../../components/work/ConsoleShell";
import {
  Home,
  ChevronDown,
  Plus,
  Upload,
  Camera,
  Database,
  Lock,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Bot,
} from "lucide-react";
import { cn } from "../../utils";
import { TaskData, TaskCard } from "../../components/work/TaskCard";

/**
 * Personal Workspace page.  
 *
 * Implements the ConsoleShell with tabs for tasks, activity, files, snapshots, and agents.  
 * Enhances the right rail to include agent lists, running tasks, pending confirmations, recent outputs,  
 * and a quick action to start a new Agent task, per the VibeHub v10.0 design spec.  
 */
export function PersonalWorkspace() {
  const [activeTab, setActiveTab] = useState("任务");

  const TABS = ["任务", "活动流", "文件", "快照", "Agent"];

  // Mock tasks for demonstration. In a real app these would come from an API.
  const mockTasks: TaskData[] = [
    {
      id: "t-1",
      verb: "为 @project-x 生成 OpenAPI 文档",
      state: "in-progress",
      agent: "DocsBot-v2",
      preview: "Analyzing controller abstract trees...",
      actorType: "agent",
      actorAvatar: "Bot",
    },
    {
      id: "t-2",
      verb: "优化 Navbar 组件的重渲染逻辑",
      state: "pending",
      agent: "ReactExpert",
      preview: "Added useMemo wrapper to navigation array.",
      actorType: "agent",
      actorAvatar: "Bot",
    },
    {
      id: "t-3",
      verb: "更新 README 部署指南",
      state: "completed",
      agent: "System",
      preview: "Merged PR #40 into main.",
      actorType: "user",
      actorAvatar: "ME",
    },
    {
      id: "t-4",
      verb: "部署到边缘节点",
      state: "failed",
      agent: "OpsBot",
      preview: "Timeout connecting to region us-west-2.",
      actorType: "agent",
      actorAvatar: "Bot",
    },
  ];

  // Derived columns for the kanban view.  
  const columns = [
    { id: "in-progress", title: "进行中", items: mockTasks.filter((t) => t.state === "in-progress") },
    { id: "pending", title: "待确认", items: mockTasks.filter((t) => t.state === "pending") },
    { id: "completed", title: "已完成", items: mockTasks.filter((t) => t.state === "completed") },
    { id: "failed", title: "失败", items: mockTasks.filter((t) => t.state === "failed") },
  ];

  // Derived lists for the enhanced right rail.
  const agents = ["DocsBot-v2", "ReactExpert", "OpsBot"];
  const runningTasks = mockTasks.filter((t) => t.state === "in-progress");
  const pendingConfirmations = mockTasks.filter((t) => t.state === "pending");
  const recentOutputs = [
    { id: "out-1", title: "Generated API docs for project-x" },
    { id: "out-2", title: "Nav component refactored" },
    { id: "out-3", title: "README update published" },
  ];

  // Render the enhanced right rail based on design spec: show agents, running tasks, pending confirmations, recent outputs, and a quick action button.
  const rightRailContent = (
    <div className="flex flex-col gap-6 h-full">
      {/* Agents list */}
      <div>
        <h4 className="text-[10px] font-mono text-vh-text-muted uppercase mb-2">Agents</h4>
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <div
              key={agent}
              className="p-2 rounded border border-vh-border bg-vh-bg flex items-center justify-between hover:bg-vh-surface transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-vh-surface flex items-center justify-center text-vh-text border border-vh-border-strong">
                  <Cpu className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-vh-text">{agent}</span>
                  <span className="text-[9px] font-mono text-vh-text-muted flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500" /> Online
                  </span>
                </div>
              </div>
              <button className="text-vh-text-muted hover:text-vh-text p-1 rounded hover:bg-vh-elevated">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Running tasks */}
      <div>
        <h4 className="text-[10px] font-mono text-vh-text-muted uppercase mb-2">运行中任务</h4>
        {runningTasks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {runningTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded border border-vh-border bg-vh-bg hover:bg-vh-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-mono text-vh-text truncate max-w-[120px]" title={task.verb}>
                    {task.verb}
                  </span>
                </div>
                <Clock className="w-3 h-3 text-vh-text-muted" />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[9px] font-mono text-vh-text-muted">无运行中的任务</span>
        )}
      </div>

      {/* Pending confirmations */}
      <div>
        <h4 className="text-[10px] font-mono text-vh-text-muted uppercase mb-2">待确认</h4>
        {pendingConfirmations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {pendingConfirmations.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded border border-vh-border bg-vh-bg hover:bg-vh-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-[10px] font-mono text-vh-text truncate max-w-[120px]" title={task.verb}>
                    {task.verb}
                  </span>
                </div>
                <CheckCircle2 className="w-3 h-3 text-vh-text-muted" />
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[9px] font-mono text-vh-text-muted">暂无待确认</span>
        )}
      </div>

      {/* Recent outputs */}
      <div>
        <h4 className="text-[10px] font-mono text-vh-text-muted uppercase mb-2">最近输出</h4>
        <div className="flex flex-col gap-2">
          {recentOutputs.map((out) => (
            <div
              key={out.id}
              className="flex items-center gap-2 p-2 rounded border border-vh-border bg-vh-bg hover:bg-vh-surface transition-colors"
            >
              <FileText className="w-4 h-4 text-cyan-500" />
              <span className="text-[10px] font-mono text-vh-text truncate max-w-[150px]" title={out.title}>
                {out.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick action: start Agent task */}
      <div className="mt-auto">
        <button className="w-full flex items-center justify-center gap-2 h-8 rounded-md bg-vh-accent text-vh-on-accent font-mono text-xs hover:opacity-90 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong">
          <Bot className="w-4 h-4" /> 发起任务
        </button>
      </div>
    </div>
  );

  return (
    <ConsoleShell mobileBannerText="建议在桌面端使用 Workspace Console" rightRail={rightRailContent}>
      {/* WorkspaceTopBar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-vh-border bg-vh-surface shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-vh-text font-medium">
            <Home className="w-4 h-4 text-vh-text-muted" />
            <span className="text-sm">我的工作区</span>
          </div>
          <div className="h-4 w-[1px] bg-vh-border mx-2" />
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-vh-bg border border-vh-border hover:border-vh-border-strong hover:bg-vh-elevated transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vh-accent">
            <span className="w-2 h-2 rounded-full bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-shadow" />
            <span className="text-xs font-mono font-medium text-vh-text">vibe-core-ui</span>
            <ChevronDown className="w-3.5 h-3.5 text-vh-text-muted" />
          </button>
          <div className="hidden xl:flex items-center gap-3 ml-4">
            <span className="text-[10px] font-mono text-vh-text-muted bg-vh-bg px-2 py-0.5 rounded border border-vh-border">{agents.length} Agents</span>
            <span className="text-[10px] font-mono text-vh-text-muted bg-vh-bg px-2 py-0.5 rounded border border-vh-border">18 快照</span>
            <span className="text-[10px] font-mono text-vh-text-muted bg-vh-bg px-2 py-0.5 rounded border border-vh-border">2.3/5 GB</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick actions remain similar to original */}
          <button className="flex items-center justify-center p-2 rounded-md border border-vh-border bg-vh-bg text-vh-text hover:bg-vh-elevated transition-colors tooltip-trigger relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vh-accent">
            <Plus className="w-4 h-4" />
            <span className="absolute top-full mt-2 px-2 py-1 bg-vh-elevated border border-vh-border rounded text-[10px] font-mono text-vh-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">新建项目</span>
          </button>
          <button className="flex items-center justify-center p-2 rounded-md border border-vh-border bg-vh-bg text-vh-text hover:bg-vh-elevated transition-colors tooltip-trigger relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vh-accent">
            <Upload className="w-4 h-4" />
            <span className="absolute top-full mt-2 px-2 py-1 bg-vh-elevated border border-vh-border rounded text-[10px] font-mono text-vh-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">上传</span>
          </button>
          <button className="flex items-center justify-center p-2 rounded-md border border-vh-border bg-vh-bg text-vh-text hover:bg-vh-elevated transition-colors tooltip-trigger relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vh-accent">
            <Camera className="w-4 h-4" />
            <span className="absolute top-full mt-2 px-2 py-1 bg-vh-elevated border border-vh-border rounded text-[10px] font-mono text-vh-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">创建快照</span>
          </button>
        </div>
      </div>

      {/* ViewTabs */}
      <div className="px-6 border-b border-vh-border bg-vh-surface shrink-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 text-sm font-medium whitespace-nowrap transition-colors relative focus-visible:outline-none focus-visible:text-vh-text",
                activeTab === tab ? "text-vh-text" : "text-vh-text-muted hover:text-vh-text"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-vh-bg p-6 scrollbar-hide focus:outline-none">
        {activeTab === "任务" && (
          <div className="flex gap-6 h-full min-w-max pb-4">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col w-[300px] shrink-0 border border-vh-border bg-vh-surface/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-vh-border bg-vh-surface shrink-0">
                  <span className="text-xs font-mono text-vh-text font-semibold tracking-wider">{col.title}</span>
                  <span className="w-5 h-5 rounded bg-vh-elevated border border-vh-border flex items-center justify-center text-[10px] font-mono text-vh-text-muted">
                    {col.items.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                  {col.items.length > 0 ? (
                    col.items.map((item) => <TaskCard key={item.id} task={item} />)
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-vh-border rounded-lg bg-vh-bg/50">
                      <div className="w-10 h-10 rounded-full bg-vh-surface border border-vh-border flex items-center justify-center mb-2">
                        <Database className="w-4 h-4 text-vh-text-dark" />
                      </div>
                      <span className="text-xs font-mono text-vh-text-muted">No items in queue</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab !== "任务" && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-vh-surface border border-vh-border flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-vh-text-dark" />
            </div>
            <h3 className="text-lg font-semibold text-vh-text mb-2 tracking-tight">内容为空</h3>
            <p className="text-sm text-vh-text-muted leading-relaxed">
              这是 {activeTab} 视图的预留区域，数据尚未初始化或已被归档清理。
            </p>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}