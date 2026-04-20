"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrustMetricGrid } from "@/components/trust-metric-grid";
import { getMockTrustCard, type TrustCardData } from "@/lib/data/mock-trust-card";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { EmptyState } from "@/components/ui";
import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";

const COMPANY_KIND_LABELS: Record<string, string> = {
  solo_dev: "独立开发者",
  design: "独立设计师",
  content: "内容创作者",
  ops: "运营",
  domain: "领域专家",
  other: "其他",
};

export default function TrustCardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<TrustCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (isMockDataEnabled()) {
          const mock = getMockTrustCard(slug);
          setData(mock);
        } else {
          const res = await fetch(`/api/v1/u/${slug}/trust-card`);
          const json = await res.json();
          if (json.data) setData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <main className="container max-w-3xl py-12">
        <div className="text-[var(--color-text-muted)] text-sm text-center">加载中...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container max-w-3xl py-12">
        <EmptyState
          title="未找到此用户"
          description="该 Trust Card 不存在或尚未公开。"
        />
      </main>
    );
  }

  const { user, profile, metrics, publicWorks } = data;

  return (
    <main className="container-narrow mx-auto py-12 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4">
        {/* Avatar */}
        <div
          className="mx-auto w-24 h-24 rounded-[var(--radius-2xl)] flex items-center justify-center text-3xl font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-card)]"
          style={{
            background: "linear-gradient(135deg, var(--color-primary-subtle), var(--color-primary))",
          }}
        >
          {user.name.charAt(0)}
        </div>

        {/* Name */}
        <h1 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight">
          {user.name}
        </h1>

        {/* Company kind badge + tagline */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-[11px] font-mono">
            {COMPANY_KIND_LABELS[profile.companyKind] ?? profile.companyKind}
          </span>
          {profile.openToCollab && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-success-border)] text-[var(--color-success)] text-[11px] font-mono">
              开放协作
            </span>
          )}
        </div>
        {profile.tagline && (
          <p className="text-base text-[var(--color-text-secondary)] max-w-[480px] mx-auto leading-[1.65]">
            {profile.tagline}
          </p>
        )}
      </section>

      {/* Metrics */}
      <section>
        <TrustMetricGrid metrics={metrics} />
      </section>

      {/* Public works */}
      {publicWorks.length > 0 && (
        <section className="space-y-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            公开作品
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {publicWorks.map((work) => (
              <div
                key={work.slug}
                className="card p-4"
              >
                <div className="w-full aspect-video rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-bg-subtle)] to-[var(--color-bg-surface-hover)] border border-[var(--color-border-subtle)] mb-3 flex items-center justify-center text-xs font-mono text-[var(--color-text-tertiary)]">
                  {work.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">{work.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="flex items-center justify-center gap-3 pt-6">
        <a
          href={`/api/v1/u/${slug}/trust-card.pdf`}
          className="btn btn-primary text-sm"
        >
          <Download className="w-4 h-4" />
          下载 Trust Card PDF
        </a>
        <Link
          href={`/u/${slug}/print`}
          target="_blank"
          className="btn btn-secondary text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          打印版
        </Link>
      </section>

      {/* Footer branding */}
      <p
        className="text-center text-xs text-[var(--color-text-tertiary)] pt-6"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        由 VibeHub 公证 · {metrics.ledgerEntryCount} 条可校验操作 · #{user.slug}
      </p>
    </main>
  );
}
