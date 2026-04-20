"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrustMetricGrid } from "@/components/trust-metric-grid";
import { getMockTrustCard, type TrustCardData } from "@/lib/data/mock-trust-card";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { Badge, EmptyState } from "@/components/ui";
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
    <main className="container max-w-3xl py-8 space-y-8">
      {/* Hero */}
      <section className="text-center space-y-3">
        {/* Avatar */}
        <div className="mx-auto w-24 h-24 rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-strong)] flex items-center justify-center text-3xl font-bold text-[var(--color-text-primary)]">
          {user.name.charAt(0)}
        </div>

        {/* Name */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{user.name}</h1>

        {/* Company kind badge + tagline */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="apple" pill mono size="sm">
            {COMPANY_KIND_LABELS[profile.companyKind] ?? profile.companyKind}
          </Badge>
          {profile.openToCollab && (
            <Badge variant="success" pill size="sm">
              开放协作
            </Badge>
          )}
        </div>
        {profile.tagline && (
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
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
        <section>
          <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            公开作品 ({publicWorks.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {publicWorks.map((work) => (
              <div
                key={work.slug}
                className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
              >
                <div className="w-full h-20 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-2 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                  Preview
                </div>
                <p className="text-sm text-[var(--color-text-primary)] font-medium">{work.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="flex items-center justify-center gap-3 pt-4 border-t border-[var(--color-border)]">
        <a
          href={`/api/v1/u/${slug}/trust-card.pdf`}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] border border-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" />
          下载 Trust Card PDF
        </a>
        <Link
          href={`/u/${slug}/print`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface)] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          打印版
        </Link>
      </section>

      {/* Footer branding */}
      <p className="text-center text-[10px] font-mono text-[var(--color-text-muted)] pt-4">
        由 VibeHub 公证 · {metrics.ledgerEntryCount} 条可校验操作 · #{user.slug}
      </p>
    </main>
  );
}
