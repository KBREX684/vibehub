import Link from "next/link";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import { Key, CreditCard, Building2, ChevronRight, Settings2, Bell, Webhook } from "lucide-react";

export default async function SettingsIndexPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  const links = [
    {
      href: "/settings/subscription",
      title: t("settings.subscription_title", "Subscription"),
      description: t("settings.subscription_desc", "Plan, billing, and usage limits."),
      icon: CreditCard,
    },
    {
      href: "/settings/api-keys",
      title: t("settings.api_keys_title", "API keys"),
      description: t("settings.api_keys_desc", "Developer keys, scopes, and MCP tooling."),
      icon: Key,
    },
    {
      href: "/settings/profile",
      title: t("settings.profile_title", "Profile"),
      description: t("settings.profile_desc", "Edit creator profile, links, and collaboration preferences."),
      icon: Settings2,
    },
    {
      href: "/settings/notifications",
      title: t("settings.notifications_title", "Notifications"),
      description: t("settings.notifications_desc", "Choose which in-app notification categories you receive."),
      icon: Bell,
    },
    {
      href: "/settings/webhooks",
      title: t("settings.webhooks_title", "Webhooks"),
      description: t("settings.webhooks_desc", "Outbound HTTPS webhooks with HMAC signatures."),
      icon: Webhook,
    },
    {
      href: "/enterprise/verify",
      title: t("settings.enterprise_title", "Enterprise workspace"),
      description: t("settings.enterprise_desc", "Apply for observer workspace access (optional)."),
      icon: Building2,
    },
  ] as const;

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-8">
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]">
          <Settings2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">{t("settings.title", "Settings")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            {t("settings.subtitle", "Manage your account, billing, and developer integrations.")}
          </p>
        </div>
      </div>

      {!session && (
        <div className="card p-5 border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            {t("settings.sign_in_hint", "Sign in to change profile, subscription, and API keys. You can still browse public links below.")}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {links.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4 transition-colors hover:bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 m-0">{description}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-[var(--color-text-muted)]">
        {t("settings.project_hint_prefix", "Project creation and editing live under")}{" "}
        <Link href="/discover" className="text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">
          {t("nav.discover")}
        </Link>{" "}
        {t("settings.project_hint_suffix", "and individual project pages.")}
      </p>
    </main>
  );
}
