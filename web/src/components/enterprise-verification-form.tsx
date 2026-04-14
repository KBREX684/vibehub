"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import type { EnterpriseVerificationStatus } from "@/lib/types";

interface EnterpriseVerificationSummary {
  status: EnterpriseVerificationStatus;
  organizationName?: string;
  organizationWebsite?: string;
  workEmail?: string;
  useCase?: string;
  reviewNote?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  initialStatus: EnterpriseVerificationStatus;
  initialOrganizationName?: string;
  initialOrganizationWebsite?: string;
  initialWorkEmail?: string;
  initialUseCase?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

function statusMeta(status: EnterpriseVerificationStatus) {
  switch (status) {
    case "approved":
      return {
        icon: CheckCircle2,
        title: "Enterprise access approved",
        hint: "You can enter the enterprise workspace now.",
        tone: "text-[var(--color-success)]",
      };
    case "rejected":
      return {
        icon: ShieldAlert,
        title: "Verification rejected",
        hint: "Update your details and resubmit.",
        tone: "text-[var(--color-error)]",
      };
    case "pending":
      return {
        icon: Clock3,
        title: "Verification in review",
        hint: "Your request is pending admin review.",
        tone: "text-[var(--color-warning)]",
      };
    default:
      return {
        icon: Clock3,
        title: "Start enterprise verification",
        hint: "Submit your company details for review.",
        tone: "text-[var(--color-text-secondary)]",
      };
  }
}

export function EnterpriseVerificationForm({
  initialStatus,
  initialOrganizationName,
  initialOrganizationWebsite,
  initialWorkEmail,
  initialUseCase,
  reviewedBy,
  reviewNote,
}: Props) {
  const [status, setStatus] = useState<EnterpriseVerificationSummary | null>({
    status: initialStatus,
    organizationName: initialOrganizationName,
    organizationWebsite: initialOrganizationWebsite,
    workEmail: initialWorkEmail,
    useCase: initialUseCase,
    reviewedBy,
    reviewNote,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    organizationName: initialOrganizationName ?? "",
    organizationWebsite: initialOrganizationWebsite ?? "",
    workEmail: initialWorkEmail ?? "",
    useCase: initialUseCase ?? "",
  });

  const currentStatus = status?.status ?? "none";
  const meta = useMemo(() => statusMeta(currentStatus), [currentStatus]);
  const Icon = meta.icon;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/me/enterprise/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: form.organizationName,
          organizationWebsite: form.organizationWebsite,
          workEmail: form.workEmail,
          useCase: form.useCase || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const message =
          payload?.error?.message || payload?.error?.code || "Failed to submit enterprise verification";
        throw new Error(message);
      }
      const next = payload.data as EnterpriseVerificationSummary;
      setStatus(next);
      setForm({
        organizationName: next.organizationName ?? form.organizationName,
        organizationWebsite: next.organizationWebsite ?? form.organizationWebsite,
        workEmail: next.workEmail ?? form.workEmail,
        useCase: next.useCase ?? "",
      });
      setOkMessage(
        next.status === "approved"
          ? "Approved. You can access enterprise workspace now."
          : "Submitted successfully. Your verification is pending review."
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-8 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-enterprise-subtle)] flex items-center justify-center">
          <Icon className={`w-5 h-5 ${meta.tone}`} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{meta.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{meta.hint}</p>
        </div>
      </div>

      {status?.reviewNote ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 text-xs text-[var(--color-text-secondary)]">
          <strong className="text-[var(--color-text-primary)]">Review note:</strong> {status.reviewNote}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--color-error)]" data-testid="enterprise-verify-error">
          {error}
        </p>
      ) : null}
      {okMessage ? (
        <p className="text-sm text-[var(--color-success)]" data-testid="enterprise-verify-success">
          {okMessage}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Organization name *</label>
          <input
            className="input-base"
            value={form.organizationName}
            onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Organization website *</label>
          <input
            className="input-base"
            type="url"
            value={form.organizationWebsite}
            onChange={(e) => setForm((p) => ({ ...p, organizationWebsite: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Work email *</label>
          <input
            className="input-base"
            type="email"
            value={form.workEmail}
            onChange={(e) => setForm((p) => ({ ...p, workEmail: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Use case</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            value={form.useCase}
            onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value }))}
            placeholder="How your organization will use VibeHub enterprise."
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
          disabled={submitting}
          data-testid="enterprise-verify-submit"
        >
          {submitting ? "Submitting..." : "Submit verification request"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
