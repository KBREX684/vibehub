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
    labelFallback: "Account",
    links: [
      {
        href: "/settings/profile",
        titleKey: "settings.profile_title",
        titleFallback: "Profile",
        descKey: "settings.profile_desc",
        descFallback: "Edit your public profile, links, and collaboration preferences.",
        icon: User,
      },
      {
        href: "/settings/account",
        titleKey: "settings.account_title",
        titleFallback: "Account & Security",
        descKey: "settings.account_desc",
        descFallback: "Email, linked providers, password, and account deletion.",
        icon: Settings2,
      },
      {
        href: "/settings/notifications",
        titleKey: "settings.notifications_title",
        titleFallback: "Notifications",
        descKey: "settings.notifications_desc",
        descFallback: "Choose which in-app notification categories you receive.",
        icon: Bell,
      },
    ],
  },
  {
    labelKey: "settings.group.developer",
    labelFallback: "Developer",
    links: [
      {
        href: "/settings/api-keys",
        titleKey: "settings.api_keys_title",
        titleFallback: "API Keys",
        descKey: "settings.api_keys_desc",
        descFallback: "Manage developer keys, scopes, and MCP integrations.",
        icon: Key,
      },
      {
        href: "/settings/agents",
        titleKey: "settings.agents_title",
        titleFallback: "Agents",
        descKey: "settings.agents_desc",
        descFallback: "Named agent identities linked to API keys and audit trails.",
        icon: Bot,
      },
      {
        href: "/settings/oauth-apps",
        titleKey: "settings.oauth_apps_title",
        titleFallback: "OAuth Apps",
        descKey: "settings.oauth_apps_desc",
        descFallback: "Third-party apps using scoped Bearer access tokens.",
        icon: AppWindow,
      },
      {
        href: "/settings/automations",
        titleKey: "settings.automations_title",
        titleFallback: "Automations",
        descKey: "settings.automations_desc",
        descFallback: "Event-driven workflows for team actions and integrations.",
        icon: Workflow,
      },
      {
        href: "/settings/webhooks",
        titleKey: "settings.webhooks_title",
        titleFallback: "Webhooks",
        descKey: "settings.webhooks_desc",
        descFallback: "Outbound HTTPS webhooks with HMAC signatures.",
        icon: Webhook,
      },
    ],
  },
  {
    labelKey: "settings.group.billing",
    labelFallback: "Billing & Plans",
    links: [
      {
        href: "/settings/subscription",
        titleKey: "settings.subscription_title",
        titleFallback: "Subscription",
        descKey: "settings.subscription_desc",
        descFallback: "Plan, billing, and usage limits.",
        icon: CreditCard,
      },
      {
        href: "/enterprise/verify",
        titleKey: "settings.enterprise_verify_title",
        titleFallback: "Enterprise Verification",
        descKey: "settings.enterprise_verify_desc",
        descFallback: "Apply for enterprise certification (badge only).",
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("settings.title", "Settings")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            {t("settings.subtitle", "Manage your account, workspace, and developer integrations.")}
          </p>
        </div>
      </div>

      {!session && (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            {t("settings.sign_in_hint", "Sign in to manage your account settings and developer integrations.")}
          </p>
          <Link href="/login?redirect=/settings" className="btn btn-primary text-sm px-6 py-2.5 inline-flex">
            Sign in
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
