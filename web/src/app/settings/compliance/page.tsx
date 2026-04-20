"use client";

import { useState, useEffect } from "react";
import type { ComplianceSettings } from "@/lib/data/mock-v11-routes";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Download, ShieldCheck, Stamp } from "lucide-react";

const PROVIDER_OPTIONS: { value: ComplianceSettings["aigcProvider"]; label: string; desc: string; pro: boolean }[] = [
  { value: "local", label: "Local", desc: "免费 · 仅元数据标识 · Free 默认", pro: false },
  { value: "tencent", label: "腾讯云", desc: "完整 · 含水印 + 元数据 · Pro", pro: true },
  { value: "aliyun", label: "阿里云", desc: "完整 · 同上 · Pro", pro: true },
];

function coverageStatus(pct: number): { label: string; color: string } {
  if (pct >= 99) return { label: "已合规", color: "var(--color-success)" };
  if (pct >= 80) return { label: "请关注", color: "var(--color-warning)" };
  return { label: "需修复", color: "var(--color-error)" };
}

export default function ComplianceSettingsPage() {
  const [settings, setSettings] = useState<ComplianceSettings>({
    aigcAutoStamp: true,
    aigcProvider: "local",
    ledgerEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mock data - in production would come from API
  const coveragePct = 99.7;
  const isPro = true;
  const stats = {
    retentionMonths: 12,
    monthlyStamps: 2847,
    exportedReports: 47,
  };

  useEffect(() => {
    async function load() {
      try {
        if (isMockDataEnabled()) {
          const mock = await mockFetch<ComplianceSettings>("GET", "/api/v1/me/compliance-settings");
          if (mock?.data) setSettings(mock.data);
        } else {
          const res = await apiFetch("/api/v1/me/compliance-settings");
          const json = await res.json();
          if (json.data) setSettings(json.data);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggle() {
    const next = { ...settings, aigcAutoStamp: !settings.aigcAutoStamp };
    setSaving(true);
    try {
      if (isMockDataEnabled()) {
        const mock = await mockFetch<ComplianceSettings>("PATCH", "/api/v1/me/compliance-settings", next);
        if (mock?.data) setSettings(mock.data);
      } else {
        await apiFetch("/api/v1/me/compliance-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      }
      toast.success(`自动加标已${next.aigcAutoStamp ? "开启" : "关闭"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleProviderChange(provider: ComplianceSettings["aigcProvider"]) {
    if (!isPro && provider !== "local") {
      toast.error("Pro 功能", { description: "切换至腾讯云/阿里云需要 Pro 订阅" });
      return;
    }

    setSaving(true);
    try {
      const next = { ...settings, aigcProvider: provider };
      if (isMockDataEnabled()) {
        const mock = await mockFetch<ComplianceSettings>("PATCH", "/api/v1/me/compliance-settings", next);
        if (mock?.data) setSettings(mock.data);
      } else {
        await apiFetch("/api/v1/me/compliance-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      }
      toast.success(`已切换到 ${PROVIDER_OPTIONS.find(p => p.value === provider)?.label}`);
    } finally {
      setSaving(false);
    }
  }

  const status = coverageStatus(coveragePct);

  if (loading) {
    return (
      <div className="container-narrow mx-auto py-12">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-3">
          合规
        </p>
        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--color-text-primary)] mb-3">
          AIGC 合规
        </h1>
        <p className="text-base text-[var(--color-text-secondary)] max-w-[560px] mx-auto leading-[1.75]">
          默认开启、自动处理 GB 45438-2025 要求的显式 + 隐式标识。
          日志留存 6 个月，监管检查时可一键导出。
        </p>
      </div>

      {/* Section 1: Auto Stamp Toggle */}
      <div className="card-elevated p-6 rounded-[var(--radius-2xl)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">自动加标</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              开启自动 AIGC 标识
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.aigcAutoStamp}
            onClick={handleToggle}
            disabled={saving}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[var(--color-border-strong)] transition-colors disabled:opacity-50"
            style={{ backgroundColor: settings.aigcAutoStamp ? "var(--color-primary)" : "var(--color-bg-surface)" }}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--color-on-accent)] shadow transition-transform"
              style={{ transform: settings.aigcAutoStamp ? "translateX(22px)" : "translateX(1px)", marginTop: "1px" }}
            />
          </button>
        </div>

        {/* Warning Alert when OFF */}
        {!settings.aigcAutoStamp && (
          <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-warning-subtle)] border-l-3 border-[var(--color-warning)] mb-6">
            <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-text-primary)]">
              关闭后新生成内容不会自动加标，可能违反国家相关规定。
              最高罚款 1000 万元。确认关闭？
            </p>
          </div>
        )}

        {/* Coverage Display */}
        <div className="flex items-end gap-3 mb-6">
          <span
            className="text-5xl font-medium"
            style={{ fontFamily: "var(--font-mono)", color: status.color }}
          >
            {coveragePct}%
          </span>
          <div className="pb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium"
              style={{ backgroundColor: `${status.color}20`, color: status.color }}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
            标识服务提供商
          </p>
          <div className="flex flex-wrap gap-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleProviderChange(opt.value)}
                disabled={saving || (!isPro && opt.pro)}
                className="flex flex-col items-start px-4 py-3 rounded-[var(--radius-md)] border text-left transition-all min-w-[140px]"
                style={{
                  borderColor: settings.aigcProvider === opt.value ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: settings.aigcProvider === opt.value ? "var(--color-primary-subtle)" : "var(--color-bg-surface)",
                  opacity: !isPro && opt.pro ? 0.5 : 1,
                }}
              >
                <span className="text-sm font-medium" style={{ color: settings.aigcProvider === opt.value ? "var(--color-primary)" : "var(--color-text-primary)" }}>
                  {opt.label}
                  {!isPro && opt.pro && <span className="ml-1 text-xs">🔒</span>}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Retention Policy */}
      <div className="card p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
        <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">日志留存</h4>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          按 GB 45438-2025 §8.2，生成日志至少留 6 个月。
          VibeHub 为所有用户留满 12 个月，Pro 用户支持导出。
        </p>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-medium text-[var(--color-text-primary)]">{stats.retentionMonths}</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">个月</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-medium text-[var(--color-text-primary)]">{stats.monthlyStamps.toLocaleString()}</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">本月加标记录</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-medium text-[var(--color-text-primary)]">{stats.exportedReports}</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">已导出月报</span>
          </div>
        </div>
      </div>

      {/* Section 3: Monthly Reports */}
      <div className="card p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-[var(--color-text-primary)]">月度合规报告</h4>
          {!isPro && (
            <span className="px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-medium">
              Pro 功能
            </span>
          )}
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          报告包含当月所有操作统计、AIGC 标识覆盖率、合规状态摘要。
        </p>

        <div className="space-y-2">
          {["2026-04", "2026-03", "2026-02"].map((month, i) => (
            <div
              key={month}
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)]"
              style={{ opacity: !isPro && i > 0 ? 0.5 : 1 }}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-text-primary)]">
                  {month} 合规报告 · 348 条 · 99.7% 覆盖率
                </span>
              </div>
              <button
                className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                disabled={!isPro && i > 0}
              >
                <Download className="w-3.5 h-3.5 inline mr-1" />
                下载 PDF
              </button>
            </div>
          ))}
        </div>

        {!isPro && (
          <div className="mt-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              升级 Pro 解锁全部历史报告导出
            </p>
            <a href="/pricing" className="btn btn-primary text-xs py-1.5 px-4">
              升级 Pro
            </a>
          </div>
        )}
      </div>

      {/* Section 4: Emergency Actions */}
      <div className="card p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border-[var(--color-error-subtle)]" style={{ borderWidth: "1px" }}>
        <h4 className="text-base font-semibold text-[var(--color-error)] mb-2">危险操作</h4>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          以下操作不可撤销，请谨慎操作。
        </p>

        <div className="flex flex-col gap-2">
          <button className="btn btn-ghost text-sm justify-start text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]">
            <Stamp className="w-4 h-4 mr-2" />
            导出所有 AIGC 标识日志 (JSON)
          </button>
          <button className="btn btn-ghost text-sm justify-start text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]">
            <CheckCircle className="w-4 h-4 mr-2" />
            清空当月未加标项
          </button>
        </div>
      </div>
    </div>
  );
}
