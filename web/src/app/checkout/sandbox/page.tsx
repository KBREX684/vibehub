import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreditCard, ArrowLeft } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getBillingRecordByIdForUser } from "@/lib/repositories/billing.repository";
import { SandboxCheckoutClient } from "./sandbox-checkout-client";

interface Props {
  searchParams: Promise<{ record?: string }>;
}

export default async function SandboxCheckoutPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/checkout/sandbox");
  }

  const { record: recordId } = await searchParams;
  if (!recordId) notFound();

  const record = await getBillingRecordByIdForUser({ recordId, userId: session.userId });
  if (!record) notFound();

  return (
    <main className="container max-w-2xl pb-24 pt-8 space-y-6">
      <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
        <ArrowLeft className="w-4 h-4" />
        返回定价页
      </Link>

      <section className="card p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] m-0">支付宝支付沙箱</h1>
            <p className="text-sm text-[var(--color-text-secondary)] m-0">
              在不接入正式商户密钥的情况下，完成 {record.paymentProvider} 的演练支付闭环。
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">支付渠道</dt>
            <dd className="m-0 text-[var(--color-text-primary)] capitalize">{record.paymentProvider}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">状态</dt>
            <dd className="m-0 text-[var(--color-text-primary)] capitalize">{record.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">套餐</dt>
            <dd className="m-0 text-[var(--color-text-primary)] uppercase">{record.tier}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">金额</dt>
            <dd className="m-0 text-[var(--color-text-primary)]">
              {(record.amountCents / 100).toFixed(2)} {record.currency}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--color-text-muted)]">记录编号</dt>
            <dd className="m-0 font-mono text-[var(--color-text-primary)] break-all">{record.id}</dd>
          </div>
        </dl>

        <SandboxCheckoutClient record={record} />

        <p className="text-xs text-[var(--color-text-muted)] m-0">
          此页面仅用于联调与验收。正式支付宝支付仍需要生产密钥、回调验签与商户审核。
        </p>
      </section>
    </main>
  );
}
