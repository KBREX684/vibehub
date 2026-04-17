import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — VibeHub",
  description: "How VibeHub handles your data, subprocessors, governance, and cross-border processing.",
};

export default function PrivacyPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 17, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Overview</h2>
          <p>
            VibeHub provides a developer community, project gallery, team collaboration, and Agent-assisted tooling.
            This policy explains what information we collect, why we collect it, how long we keep it, and which
            third parties may process it when necessary to run the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Information we collect</h2>
          <p>
            We collect account data you provide, such as email address, display name, encrypted password, linked
            GitHub identity, project content, discussions, team records, API keys, audit logs, billing records, and
            enterprise verification submissions. We also collect technical signals such as request identifiers, IP
            address, browser information, moderation metadata, and webhook / MCP invocation records needed to keep
            the service reliable and safe.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">How we use data</h2>
          <p>
            We use personal data to authenticate users, deliver collaboration features, enforce platform rules,
            investigate abuse, operate billing, maintain auditability, and comply with legal obligations. We do not
            sell personal data. Recommendation flows currently use interaction and tag signals rather than LLM-based
            ranking.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">AI, Agent, and governance processing</h2>
          <p>
            VibeHub may use AI-assisted review tooling to summarize reports, suggest moderation labels, or surface
            operational insights. These tools provide suggestions only. Final moderation, account action, enterprise
            verification, and high-risk Agent write decisions remain subject to human review. See <a href="/aigc" className="text-[var(--color-text-primary)] underline">/aigc</a> for the current AIGC and Agent policy.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Cross-border processing and subprocessors</h2>
          <p>
            Our default production posture is China-mainland-first. Some integrations may still involve cross-border
            processing depending on your account configuration or the production stack in use, including GitHub OAuth,
            code hosting, email delivery, payment channels, and user-supplied model providers. We track the final
            production dependency set in the go-live checklist and compliance checklist before formal launch.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Retention and deletion</h2>
          <p>
            Account owners can request deletion from settings. We delete or detach user-owned content from the active
            service where possible, but may retain limited security, billing, abuse, or compliance records for the
            retention period required by policy or law. Audit records, billing records, and moderation evidence may
            remain for fraud prevention, dispute handling, or legal compliance.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Contact</h2>
          <p>
            For privacy-related questions or data requests, contact <a href="mailto:support@vibehub.dev" className="text-[var(--color-text-primary)] underline">support@vibehub.dev</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
