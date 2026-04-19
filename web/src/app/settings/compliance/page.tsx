"use client";

import { useState, useEffect } from "react";
import { AigcStampToggle } from "@/components/aigc-stamp-toggle";
import type { ComplianceSettings } from "@/lib/data/mock-v11-routes";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

export default function ComplianceSettingsPage() {
  const [settings, setSettings] = useState<ComplianceSettings>({
    aigcAutoStamp: true,
    aigcProvider: "local",
    ledgerEnabled: true,
  });
  const [loading, setLoading] = useState(true);

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

  async function handleChange(next: ComplianceSettings) {
    if (isMockDataEnabled()) {
      const mock = await mockFetch<ComplianceSettings>("PATCH", "/api/v1/me/compliance-settings", next);
      if (mock?.data) setSettings(mock.data);
    } else {
      const res = await apiFetch("/api/v1/me/compliance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json();
      if (json.data) setSettings(json.data);
    }
    toast.success("合规设置已保存");
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="text-[var(--color-text-muted)] text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">合规设置</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          管理 AIGC 标识、Ledger 记录和合规相关配置。
        </p>
      </div>

      <AigcStampToggle
        settings={settings}
        coveragePct={100}
        onChange={handleChange}
      />
    </div>
  );
}
