import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — VibeHub",
  description: "Terms governing your use of VibeHub.",
};

export default function TermsPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Terms of Service</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 15, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Agreement</h2>
          <p>
            By accessing or using VibeHub, you agree to these Terms. If you do not agree, please do not use
            the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Use of the service</h2>
          <p>
            You agree to use VibeHub only for lawful purposes and in a way that does not infringe the rights
            of others or restrict their use of the platform. You are responsible for content you post and for
            maintaining the security of your account credentials.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Content</h2>
          <p>
            You retain rights to content you submit. By posting on VibeHub, you grant us a limited license to
            host, display, and distribute that content as needed to operate the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
            permitted by law, we are not liable for indirect or consequential damages arising from your use of
            VibeHub.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the service after changes constitutes
            acceptance of the updated Terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href="mailto:support@vibehub.dev" className="text-[var(--color-text-primary)] underline">
              support@vibehub.dev
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
