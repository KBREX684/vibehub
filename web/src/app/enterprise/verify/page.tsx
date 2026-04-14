import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Building2, Shield, ArrowRight, CheckCircle, Clock } from "lucide-react";

export default async function EnterpriseVerifyPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/enterprise/verify&intent=enterprise");

  // Admin already has enterprise access
  if (session.role === "admin") {
    redirect("/workspace/enterprise");
  }

  return (
    <main className="container max-w-xl pb-24 pt-12 space-y-6">
      <div className="card p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-enterprise-subtle)] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[var(--color-enterprise)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Apply for Enterprise Access</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Complete the form below to request enterprise verification. Our team will review
            within 1–2 business days.
          </p>
        </div>

        {/* Process steps */}
        <div className="space-y-3">
          {[
            { step: 1, icon: Shield,       title: "Submit application",   desc: "Fill in your organisation details" },
            { step: 2, icon: Clock,        title: "Review (1–2 days)",    desc: "Our team verifies your request" },
            { step: 3, icon: CheckCircle,  title: "Access granted",        desc: "Enterprise workspace unlocked" },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex items-start gap-3 p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-enterprise-subtle)] flex items-center justify-center text-xs font-bold text-[var(--color-enterprise)] shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
              </div>
              <Icon className="w-4 h-4 text-[var(--color-enterprise)] ml-auto self-center shrink-0" />
            </div>
          ))}
        </div>

        {/* Placeholder form — enterprise verification is P1 backend work */}
        <form className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Organisation Name *</label>
            <input className="input-base" placeholder="Acme Corp" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Organisation Website *</label>
            <input className="input-base" type="url" placeholder="https://acme.com" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Work Email *</label>
            <input className="input-base" type="email" placeholder="you@acme.com" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Use case</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              placeholder="Describe how your organisation plans to use VibeHub Enterprise…"
            />
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Enterprise verification backend is coming soon. Your request will be
              recorded and reviewed manually.
            </p>
            <button
              type="submit"
              className="btn btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
              disabled
            >
              Submit Application
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-[var(--color-text-muted)] mt-2">
              Full enterprise verification workflow is scheduled for P1 release.
            </p>
          </div>
        </form>
      </div>

      <div className="text-center">
        <Link href="/pricing" className="text-xs text-[var(--color-primary-hover)] hover:underline">
          View enterprise pricing →
        </Link>
      </div>
    </main>
  );
}
