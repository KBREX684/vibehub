import { getServerTranslator } from "@/lib/i18n";
import Link from "next/link";
import {
  Compass,
  Receipt,
  User,
  ShieldCheck,
  FileText,
  Download,
  Eye,
  CheckCircle,
} from "lucide-react";
import { TrustMetricGrid } from "@/components/ui/trust-metric-card";

export default async function HomePage() {
  await getServerTranslator();

  // Mock Trust Card metrics for display
  const trustMetrics = [
    { value: 348, label: "Ledger 条数", description: "累计可校验操作" },
    { value: 12, label: "快照数", description: "可回溯交付点" },
    { value: 47, label: "已加标产物", description: "GB 45438-2025 合规" },
    { value: 3, label: "公开作品", description: "可外部访问" },
    { value: 2.3, label: "平均响应时长（h）", description: "过去 30 天" },
    { value: 156, label: "活跃天数", description: "在 VibeHub" },
  ];

  return (
    <main>
      {/* ── Section 1 · HERO ─────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-[var(--color-bg-canvas)]">
        <div className="container-narrow mx-auto">
          <div className="grid md:grid-cols-[3fr_2fr] gap-12 items-center">
            {/* Left */}
            <div className="space-y-6">
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                中国 OPC · AI 留痕本
              </p>
              <h1 className="font-serif text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
                你和 AI 一起做的工作，
                <br />
                有据可查。
              </h1>
              <p className="text-lg text-[var(--color-text-secondary)] leading-[1.75] max-w-[560px]">
                VibeHub 自动记录你和 Agent 的每一次写入，加合规标识、
                留可校验账本、沉淀为可外发的信用名片。给客户、给监管、给自己一份证据。
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/signup"
                  className="btn btn-primary"
                >
                  开始留痕
                </Link>
                <Link
                  href="/u/dev-alice"
                  className="btn btn-ghost"
                >
                  查看示例 Card
                </Link>
              </div>
              <p className="text-[11px] font-mono text-[var(--color-text-muted)] pt-2">
                免费 1 GB · 100 ledger/月 · 无需信用卡
              </p>
            </div>

            {/* Right: workflow card */}
            <div className="hidden md:flex items-center justify-center">
              <div className="w-[400px] rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-elevated)] p-8">
                <div className="space-y-8">
                  {/* Step 1: Studio */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center">
                      <Compass className="w-5 h-5 text-[var(--color-text-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Studio（做）</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">任务 + Agent 执行</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-px h-8 border-l border-dashed border-[var(--color-border-strong)]" />
                  </div>

                  {/* Step 2: Ledger */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-violet-subtle)] border border-[var(--color-accent-violet-border)] flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-[var(--color-accent-violet)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Ledger（签）</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">操作公证账本</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-px h-8 border-l border-dashed border-[var(--color-border-strong)]" />
                  </div>

                  {/* Step 3: Card */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-cyan-subtle)] border border-[var(--color-accent-cyan-border)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--color-accent-cyan)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Card（晒）</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">可外发信用名片</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2 · 三件事 ───────────────────────────────────────── */}
      <section className="py-24 bg-[var(--color-bg-surface)]">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-3">
              v11 · 三件事架构
            </p>
            <h2 className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.2] text-[var(--color-text-primary)]">
              做 → 签 → 晒
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-[1120px] mx-auto">
            {/* Studio Card */}
            <div className="card p-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
                <Compass className="w-4 h-4 text-[var(--color-text-primary)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Studio</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-[1.65] mb-4">
                在工作台和 Agent 一起干活
              </p>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)] mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>任务流：Agent 执行 + 人工确认</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>文件 artifact 自动加合规标识</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>快照版本与回滚</span>
                </li>
              </ul>
              <Link href="/studio" className="inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:underline">
                进入 Studio →
              </Link>
            </div>

            {/* Ledger Card */}
            <div className="card p-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-violet-subtle)] border border-[var(--color-accent-violet-border)] flex items-center justify-center mb-4">
                <Receipt className="w-4 h-4 text-[var(--color-accent-violet)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Ledger</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-[1.65] mb-4">
                每一次操作自动留痕
              </p>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)] mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>哈希链 + ed25519 签名</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>司法链锚定（Pro）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>PDF / JSON / TXT 导出</span>
                </li>
              </ul>
              <Link href="/ledger" className="inline-flex items-center text-sm font-medium text-[var(--color-accent-violet)] hover:underline">
                查看示例 Ledger →
              </Link>
            </div>

            {/* Card */}
            <div className="card p-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)]">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-cyan-subtle)] border border-[var(--color-accent-cyan-border)] flex items-center justify-center mb-4">
                <User className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Card</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-[1.65] mb-4">
                信用沉淀为公开名片
              </p>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)] mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>6 个 Trust 指标来自真实 Ledger</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>公开 URL 可外发</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-success)]">•</span>
                  <span>可下载 PDF 附合同</span>
                </li>
              </ul>
              <Link href="/u/dev-alice" className="inline-flex items-center text-sm font-medium text-[var(--color-accent-cyan)] hover:underline">
                查看示例 Card →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3 · 合规恐惧 ─────────────────────────────────────── */}
      <section className="py-24 bg-[var(--color-bg-canvas)]">
        <div className="container-narrow mx-auto text-center">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-error)] mb-3">
            国家强制 · GB 45438-2025
          </p>
          <h2 className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.2] text-[var(--color-text-primary)] mb-4">
            不加合规标识，最高罚款 1000 万。
          </h2>
          <p className="text-base text-[var(--color-text-secondary)] leading-[1.75] max-w-[600px] mx-auto mb-10">
            2025 年 9 月 1 日起，所有 AI 生成内容必须加显式 + 隐式标识。
            VibeHub 替你处理这件事 — 默认开启、6 个月留存、一键导出月度报告。
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <ShieldCheck className="w-5 h-5 text-[var(--color-success)]" />
              <span>自动加标 / 合规无感知</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <FileText className="w-5 h-5 text-[var(--color-success)]" />
              <span>自动留 6 个月日志 / 监管检查可调</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Download className="w-5 h-5 text-[var(--color-success)]" />
              <span>月度报告 PDF 一键导出 / 申请扶持有凭据</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Eye className="w-5 h-5 text-[var(--color-success)]" />
              <span>监管检查时可向网信办出示 / 责任闭环</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4 · Pricing 简表 ─────────────────────────────────── */}
      <section className="py-24 bg-[var(--color-bg-surface)]">
        <div className="container-narrow mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Card */}
            <div className="card-elevated p-8 rounded-[var(--radius-2xl)] bg-[var(--color-bg-elevated)]">
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-4">
                Free
              </p>
              <p className="font-serif text-4xl font-semibold text-[var(--color-text-primary)] mb-2">
                ¥0
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                起步独立开发者
              </p>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>1 GB Workspace</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>100 ledger / 月</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>基础 AIGC 标识（local）</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>公开 Trust Card</span>
                </li>
              </ul>
              <Link href="/signup" className="btn btn-ghost w-full justify-center">
                开始使用
              </Link>
            </div>

            {/* Pro Card */}
            <div className="relative card-elevated p-8 rounded-[var(--radius-2xl)] bg-[var(--color-bg-elevated)] border-[1.5px] border-[var(--color-primary-border)]">
              <span className="absolute -top-3 left-8 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-primary)] text-[var(--color-on-accent)] text-xs font-medium">
                推荐
              </span>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-primary)] mb-4">
                Pro
              </p>
              <p className="font-serif text-4xl font-semibold text-[var(--color-text-primary)] mb-2">
                ¥29<span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">/月</span>
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                接外包 / 申请扶持 / 尽调
              </p>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>10 GB Workspace</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>无限 ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>完整 AIGC 标识（腾讯 / 阿里 API）</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>至信链 / 保全网锚定</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>月度合规报告 PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  <span>Trust Card 高级版</span>
                </li>
              </ul>
              <Link href="/pricing" className="btn btn-primary w-full justify-center">
                升级 Pro
              </Link>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              查看完整定价 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 5 · Trust Card 示例 ──────────────────────────────── */}
      <section className="py-24 bg-[var(--color-bg-canvas)]">
        <div className="container-narrow mx-auto text-center">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-3">
            每个用户都有这样一张可校验的信用名片
          </p>
          <h2 className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.2] text-[var(--color-text-primary)] mb-8">
            dev-alice 的 Trust Card
          </h2>

          <TrustMetricGrid metrics={trustMetrics} className="mb-10 max-w-[600px] mx-auto" />

          <Link href="/u/dev-alice" className="btn btn-ghost">
            查看完整 Trust Card →
          </Link>
        </div>
      </section>
    </main>
  );
}
