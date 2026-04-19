import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getEnterpriseProfileByUserId } from "@/lib/repository";
import { EnterpriseVerificationForm } from "@/components/enterprise-verification-form";
import { Building2, Shield, ArrowRight, CheckCircle, Clock } from "lucide-react";

const STEP_BADGE_CLASS =
  "w-8 h-8 rounded-full bg-[var(--color-enterprise-subtle)] flex items-center justify-center text-xs font-bold text-[var(--color-enterprise)] shrink-0";

export default async function EnterpriseVerifyPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/enterprise/verify&intent=enterprise");

  const profile = await getEnterpriseProfileByUserId(session.userId);
  const status = profile?.status ?? "none";

  if (status === "approved") {
    redirect("/settings");
  }

  return (
    <main className="container max-w-2xl pb-24 pt-12 space-y-6">
      <div className="card p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-enterprise-subtle)] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[var(--color-enterprise)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">申请企业认证</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            提交企业主体资料以进入人工审核。当前版本的企业认证只提供企业身份标识与审核记录，不作为独立工作区产品售卖。
          </p>
        </div>

        <div className="space-y-3">
          {[
            { step: 1, icon: Shield, title: "提交申请", desc: "填写企业主体与组织资料，明确实际运营实体。" },
            { step: 2, icon: Clock, title: "人工审核", desc: "平台管理员会结合资料与上下文进行核验。" },
            { step: 3, icon: CheckCircle, title: "审核结果", desc: "通过后会获得企业认证标识与留痕记录。" },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="flex items-start gap-3 p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border)]"
            >
              <div className={STEP_BADGE_CLASS}>
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

        <EnterpriseVerificationForm
          initialStatus={status}
          initialOrganizationName={profile?.organizationName}
          initialOrganizationWebsite={profile?.organizationWebsite}
          initialWorkEmail={profile?.workEmail}
          initialUseCase={profile?.useCase}
          reviewedBy={profile?.reviewedBy}
          reviewNote={profile?.reviewNote}
        />
      </div>

      <div className="text-center">
        <Link href="/settings/developers" className="text-xs text-[var(--color-primary-hover)] hover:underline">
          查看开发者设置 <ArrowRight className="w-3 h-3 inline-block align-[-1px]" />
        </Link>
      </div>
    </main>
  );
}
