import { getServerTranslator } from "@/lib/i18n";
import Link from "next/link";
import {
  Compass,
  Receipt,
  User,
  Shield,
  Stamp,
  FileCheck,
  BarChart2,
} from "lucide-react";

export default async function HomePage() {
  const { t } = await getServerTranslator();

  return (
    <main>
      {/* ── A. Hero ─────────────────────────────────────────────────── */}
      <section className="container py-20 md:py-28">
        <div className="grid md:grid-cols-[3fr_2fr] gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
              中国 OPC · AI 留痕本
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--color-text-primary)] leading-tight">
              你和 AI 一起做的工作，
              <br />
              有据可查。
            </h1>
            <p className="text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              VibeHub 自动记录你和 Agent 的每一次写入，加合规标识、留可校验账本、沉淀为可外发的信用名片。给客户、给监管、给自己一份证据。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center px-6 py-3 text-sm font-semibold bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
              >
                开始留痕
              </Link>
              <Link
                href="/u/dev-alice"
                className="inline-flex items-center px-6 py-3 text-sm font-semibold border border-[var(--color-border-strong)] text-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface)] transition-colors"
              >
                查看示例 Card
              </Link>
            </div>
          </div>

          {/* Right: static workflow */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-sm p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
              <div className="space-y-6">
                {/* Step 1: Studio */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-apple-subtle)] border border-[var(--color-accent-apple-border)] flex items-center justify-center">
                    <Compass className="w-5 h-5 text-[var(--color-accent-apple)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Studio（做）</p>
                    <p className="text-xs text-[var(--color-text-muted)]">任务 + Agent 执行</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-6 border-l border-dashed border-[var(--color-border-strong)]" />
                </div>

                {/* Step 2: Ledger */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-violet-subtle)] border border-[var(--color-accent-violet-border)] flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-[var(--color-accent-violet)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Ledger（签）</p>
                    <p className="text-xs text-[var(--color-text-muted)]">操作公证账本</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-6 border-l border-dashed border-[var(--color-border-strong)]" />
                </div>

                {/* Step 3: Card */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-cyan-subtle)] border border-[var(--color-accent-cyan-border)] flex items-center justify-center">
                    <User className="w-5 h-5 text-[var(--color-accent-cyan)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Card（晒）</p>
                    <p className="text-xs text-[var(--color-text-muted)]">公开信用名片</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── B. 三件事 ─────────────────────────────────────────────── */}
      <section className="container py-16 border-t border-[var(--color-border)]">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">三件事</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">做 → 签 → 晒。一个完整闭环。</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              icon: Compass,
              color: "var(--color-accent-apple)",
              bgColor: "var(--color-accent-apple-subtle)",
              borderColor: "var(--color-accent-apple-border)",
              title: "Studio（做）",
              desc: "在个人工作站里和 Agent 一起干活。每次操作自动写入 Ledger，每个产出物自动加 AIGC 标识。",
              link: "/studio",
              linkText: "进入 Studio →",
            },
            {
              icon: Receipt,
              color: "var(--color-accent-violet)",
              bgColor: "var(--color-accent-violet-subtle)",
              borderColor: "var(--color-accent-violet-border)",
              title: "Ledger（签）",
              desc: "全部 Agent 写入 + 人工确认 + 快照创建 + 交付通过事件的不可篡改时间线。支持一键导出。",
              link: "/ledger",
              linkText: "查看示例 Ledger →",
            },
            {
              icon: User,
              color: "var(--color-accent-cyan)",
              bgColor: "var(--color-accent-cyan-subtle)",
              borderColor: "var(--color-accent-cyan-border)",
              title: "Card（晒）",
              desc: "来自 Ledger 的 6 个真实指标，自动生成公开信用名片。给客户、给投资人、给监管。",
              link: "/u/dev-alice",
              linkText: "查看示例 Card →",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)]"
            >
              <div
                className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center mb-4"
                style={{ backgroundColor: item.bgColor, border: `1px solid ${item.borderColor}` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">{item.desc}</p>
              <Link href={item.link} className="text-sm font-medium hover:underline" style={{ color: item.color }}>
                {item.linkText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── C. 合规恐惧 ────────────────────────────────────────────── */}
      <section className="container py-16 border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            自 2025-09-01 起，所有 AI 内容必须加合规标识
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-3">
            GB 45438-2025 罚款上限 1000 万元。不加标 = 赌命。
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Stamp, title: "自动加标", desc: "上传即加 AIGC 标识" },
            { icon: Receipt, title: "留痕账本", desc: "每一步都不可篡改" },
            { icon: FileCheck, title: "月度报告", desc: "合规报告一键导出" },
            { icon: BarChart2, title: "可向监管出示", desc: "有据可查、可校验" },
          ].map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] text-center"
            >
              <item.icon className="w-6 h-6 mx-auto text-[var(--color-text-secondary)] mb-3" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{item.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── D. Pricing 简表 ─────────────────────────────────────── */}
      <section className="container py-16 border-t border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">简单两档</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)]">
              <h3 className="text-lg font-semibold mb-2">Free</h3>
              <p className="text-3xl font-mono font-bold mb-4">¥0</p>
              <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                <li>1 GB Workspace</li>
                <li>100 Ledger / 月</li>
                <li>基础 AIGC 标识</li>
                <li>公开 Trust Card</li>
              </ul>
            </div>
            <div
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
              style={{ boxShadow: "inset 0 0 0 1px var(--color-featured-highlight)" }}
            >
              <h3 className="text-lg font-semibold mb-2">Pro</h3>
              <p className="text-3xl font-mono font-bold mb-1">
                ¥29<span className="text-sm font-normal opacity-70">/月</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">¥288/年</p>
              <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                <li>10 GB Workspace</li>
                <li>无限 Ledger</li>
                <li>完整 AIGC 标识（腾讯/阿里 API）</li>
                <li>至信链锚定</li>
                <li>月度合规报告</li>
              </ul>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link href="/pricing" className="text-sm text-[var(--color-accent-apple)] hover:underline">
              查看完整定价 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── E. Trust Card 示例 ───────────────────────────────────── */}
      <section className="container py-16 border-t border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">真实信用名片</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            每个 VibeHub 用户都有这样一张可校验的信用名片。6 个指标全部来自 Ledger，禁止手填。
          </p>
          <Link
            href="/u/dev-alice"
            className="inline-flex items-center px-6 py-3 text-sm font-semibold bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            查看示例 Trust Card
          </Link>
        </div>
      </section>
    </main>
  );
}
