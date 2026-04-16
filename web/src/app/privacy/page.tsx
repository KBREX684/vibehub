import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — VibeHub",
  description: "How VibeHub handles your data and privacy.",
};

export default function PrivacyPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 15, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Overview</h2>
          <p>
            VibeHub (&quot;we&quot;, &quot;our&quot;) provides a developer community platform. This policy
            describes how we collect, use, and protect information when you use our website and services.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Information we collect</h2>
          <p>
            We may collect account information you provide, including display name, email address, encrypted
            password credentials, linked GitHub identity data, project and discussion content, and technical
            signals such as IP address, browser type, request identifiers, and moderation metadata needed to
            keep the service reliable and safe.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">How we use information</h2>
          <p>
            We use information to provide and improve VibeHub, authenticate users, prevent abuse, communicate
            about your account where appropriate, and comply with legal obligations.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Governance and reports</h2>
          <p>
            We keep moderation, report ticket, enterprise verification, and security audit records when needed
            to investigate abuse, enforce platform rules, and protect users and the service. These records may
            be reviewed by authorized administrators and AI-assisted review tooling that provides suggestions
            only and does not make final enforcement decisions on its own.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Account deletion</h2>
          <p>
            You can request deletion from account settings. When you delete your account, we remove or detach
            user-owned content and access credentials from the active service, subject to any records we must
            retain for security, fraud prevention, dispute handling, or legal compliance.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Cookies and sessions</h2>
          <p>
            We use cookies and similar technologies to keep you signed in and to protect the platform (for
            example, session and security tokens). You can control cookies through your browser settings.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Cross-border services and subprocessors</h2>
          <p>
            Some infrastructure and integrations may process data outside mainland China, including code hosting,
            email delivery, billing, and model providers. The exact production configuration is tracked in the
            P0 compliance checklist and must be reviewed before formal launch.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a href="mailto:support@vibehub.dev" className="text-[var(--color-text-primary)] underline">
              support@vibehub.dev
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
