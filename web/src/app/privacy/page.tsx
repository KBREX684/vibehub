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
            We may collect account information you provide (such as name and email when you sign in with
            GitHub), usage data necessary to operate the service, and technical data such as IP address and
            browser type for security and reliability.
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
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Cookies and sessions</h2>
          <p>
            We use cookies and similar technologies to keep you signed in and to protect the platform (for
            example, session and security tokens). You can control cookies through your browser settings.
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
