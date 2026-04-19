import Link from "next/link";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import {
  Key,
  CreditCard,
  Building2,
  ChevronRight,
  Settings2,
  Bell,
  Webhook,
  User,
  Bot,
  AppWindow,
  Workflow,
  ArrowRight,
} from "lucide-react";

const SETTINGS_LINK_CLASS =
  "group flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4 transition-colors hover:bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]";

/* ── Settings group definition ─────────────────────────────────────────── */
interface SettingsLink {
  href: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  icon: typeof Key;
}

interface SettingsGroup {
  labelKey: string;
  labelFallback: string;
  links: SettingsLink[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    labelKey: "settings.group.account",
    labelFallback: "账号",
    links: [
      {
        href: "/settings/profile",
        titleKey: "settings.profile_title",
        titleFallback: "资料",
        descKey: "settings.profile_desc",
        descFallback: "编辑公开资料、外部链接和协作偏好。",
        icon: User,
      },
      {
        href: "/settings/account",
        titleKey: "settings.account_title",
        titleFallback: "账号与安全",
        descKey: "settings.account_desc",
        descFallback: "管理邮箱、已绑定账号、密码与账号删除。",
        icon: Settings2,
      },
      {
        href: "/settings/notifications",
        titleKey: "settings.notifications_title",
        titleFallback: "通知",
        descKey: "settings.notifications_desc",
        descFallback: "选择希望接收的站内通知类型。",
        icon: Bell,
      },
    ],
  },
  {
    labelKey: "settings.group.developer",
    labelFallback: "开发者",
    links: [
      {
        href: "/settings/api-keys",
        titleKey: "settings.api_keys_title",
        titleFallback: "API 密钥",
        descKey: "settings.api_keys_desc",
        descFallback: "管理开发者密钥、权限范围与 MCP 接入。",
        icon: Key,
      },
      {
        href: "/settings/agents",
        titleKey: "settings.agents_title",
        titleFallback: "智能代理",
        descKey: "settings.agents_desc",
        descFallback: "管理绑定到 API 密钥和审计链路的智能代理身份。",
        icon: Bot,
      },
      {
        href: "/settings/oauth-apps",
        titleKey: "settings.oauth_apps_title",
        titleFallback: "OAuth 应用",
        descKey: "settings.oauth_apps_desc",
        descFallback: "管理使用受限 Bearer 令牌的第三方应用。",
        icon: AppWindow,
      },
      {
        href: "/settings/automations",
        titleKey: "settings.automations_title",
        titleFallback: "自动化",
        descKey: "settings.automations_desc",
        descFallback: "配置团队动作与集成场景的事件驱动工作流。",
        icon: Workflow,
      },
      {
        href: "/settings/webhooks",
        titleKey: "settings.webhooks_title",
        titleFallback: "Webhook",
        descKey: "settings.webhooks_desc",
        descFallback: "管理带 HMAC 签名的外发 HTTPS Webhook。",
        icon: Webhook,
      },
    ],
  },
  {
    labelKey: "settings.group.billing",
    labelFallback: "订阅与套餐",
    links: [
      {
        href: "/settings/subscription",
        titleKey: "settings.subscription_title",
        titleFallback: "订阅",
        descKey: "settings.subscription_desc",
        descFallback: "查看套餐、账单和使用额度。",
        icon: CreditCard,
      },
      {
        href: "/enterprise/verify",
        titleKey: "settings.enterprise_verify_title",
        titleFallback: "企业认证",
        descKey: "settings.enterprise_verify_desc",
        descFallback: "提交企业认证申请（当前仅提供徽章审核）。",
        icon: Building2,
      },
    ],
  },
];

export default async function SettingsIndexPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-8">

      {/* Page header */}
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("settings.title")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            {t("settings.subtitle")}
          </p>
        </div>
      </div>

      {!session && (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            {t("settings.sign_in_hint")}
          </p>
          <Link href="/login?redirect=/settings" className="btn btn-primary text-sm px-6 py-2.5 inline-flex">
            {t("settings.sign_in", "立即登录")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Grouped settings sections */}
      {SETTINGS_GROUPS.map((group) => (
        <section key={group.labelKey} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-1">
            {t(group.labelKey, group.labelFallback)}
          </h2>
          <ul className="space-y-2">
            {group.links.map(({ href, titleKey, titleFallback, descKey, descFallback, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={SETTINGS_LINK_CLASS}>
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t(titleKey, titleFallback)}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 m-0">{t(descKey, descFallback)}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
