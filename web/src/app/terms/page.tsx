import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — VibeHub",
  description: "Terms governing your use of VibeHub.",
};

export default function TermsPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Terms of Service</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 17, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Agreement</h2>
          <p>By accessing or using VibeHub, you agree to these Terms, the Privacy Policy, the Platform Rules, and the current AIGC / Agent policy where applicable.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Accounts and credentials</h2>
          <p>
            Email sign-in is the primary account method. GitHub can be linked as an auxiliary sign-in method. You are
            responsible for keeping your mailbox, password, API keys, linked providers, and any Agent credentials
            secure. You may not share credentials in a way that circumvents the product&apos;s scope, rate, or audit rules.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Use of the service</h2>
          <p>
            You must use VibeHub lawfully and in a manner that does not infringe the rights of others or undermine the
            safety, reliability, or integrity of the platform. You remain responsible for the content you publish, the
            teams you operate, and the automation or Agent actions you authorize.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Rules, automation, and Agent writes</h2>
          <p>
            You must follow the VibeHub platform rules at <a href="/rules" className="text-[var(--color-text-primary)] underline">/rules</a>. Agent or API-driven actions must stay within granted scopes, role boundaries, rate limits, and human-confirmation requirements. High-risk writes may be delayed, rejected, or audited even when a valid API key is presented. See <a href="/aigc" className="text-[var(--color-text-primary)] underline">/aigc</a> for the current AI and Agent policy.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Billing</h2>
          <p>
            VibeHub currently offers Free and Pro as the primary public plans. Stripe is retained for overseas card checkout. China-local payment channels may operate as one-off monthly renewals instead of automatic recurring billing. We may suspend or downgrade paid benefits if payment fails, is refunded, or reaches the end of the purchased access period.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Disclaimer and changes</h2>
          <p>
            The service is provided on an &ldquo;as is&rdquo; basis. We may update these Terms, pricing, product boundaries, or
            governance processes from time to time. Continued use after changes take effect constitutes acceptance of
            the updated terms to the extent permitted by law.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Contact</h2>
          <p>Questions about these Terms: <a href="mailto:support@vibehub.dev" className="text-[var(--color-text-primary)] underline">support@vibehub.dev</a></p>
        </section>
      </div>
    </main>
  );
}
