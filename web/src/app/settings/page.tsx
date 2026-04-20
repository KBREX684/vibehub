import Link from "next/link";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import {
  Key,
  CreditCard,
  ChevronRight,
  User,
  Shield,
  Bot,
  Bell,
  Download,
  Lock,
  Receipt,
  Anchor,
  Stamp,
} from "lucide-react";

const SETTINGS_CARD_CLASS =
  "card p-5 cursor-pointer group";

/* ── Settings group definition ─────────────────────────────────────────── */
interface SettingsLink {
  href: string;
  title: string;
  description: string;
  icon: typeof Key;
}

interface SettingsGroup {
  title: string;
  links: SettingsLink[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: "账户",
    links: [
      {
        href: "/settings/profile",
        title: "个人资料",
        description: "编辑公开资料、外部链接和 OPC 信息",
        icon: User,
      },
      {
        href: "/settings/account",
        title: "账号安全",
        description: "邮箱、密码、2FA、会话管理",
        icon: Shield,
      },
      {
        href: "/settings/subscription",
        title: "订阅与账单",
        description: "套餐、账单历史、升降级",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "开发者",
    links: [
      {
        href: "/settings/agents",
        title: "Agent 接入",
        description: "绑定 Cursor / Claude / Codex 等 Agent",
        icon: Bot,
      },
      {
        href: "/settings/api-keys",
        title: "API 密钥",
        description: "管理 API Key 和权限范围",
        icon: Key,
      },
    ],
  },
  {
    title: "通知与隐私",
    links: [
      {
        href: "/settings/notifications",
        title: "通知设置",
        description: "邮件、站内、Webhook 通知偏好",
        icon: Bell,
      },
      {
        href: "/settings/privacy",
        title: "隐私与权限",
        description: "数据可见性、导出、删除",
        icon: Lock,
      },
      {
        href: "/settings/data-export",
        title: "数据导出",
        description: "一键导出所有 Ledger 和 Artifact",
        icon: Download,
      },
    ],
  },
  {
    title: "合规",
    links: [
      {
        href: "/settings/compliance",
        title: "AIGC 标识",
        description: "自动加标、覆盖率、服务商选择",
        icon: Stamp,
      },
      {
        href: "/ledger",
        title: "操作账本",
        description: "查看完整 Ledger 时间线",
        icon: Receipt,
      },
      {
        href: "/settings/compliance#anchor",
        title: "司法锚定",
        description: "至信链 / 保全网存证设置",
        icon: Anchor,
      },
    ],
  },
];

export default async function SettingsIndexPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  return (
    <main className="container-narrow mx-auto pb-24 pt-12 space-y-12">

      {/* Page header */}
      <div className="text-center mb-12">
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] mb-3">
          账户
        </p>
        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--color-text-primary)] mb-3">
          设置
        </h1>
        <p className="text-base text-[var(--color-text-secondary)] max-w-[480px] mx-auto leading-[1.75]">
          管理你的账户、订阅、Agent 绑定与合规默认值。
        </p>
      </div>

      {/* Grouped settings sections */}
      {SETTINGS_GROUPS.map((group) => (
        <section key={group.title} className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {group.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.links.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className={SETTINGS_CARD_CLASS}>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {title}
                      </p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
