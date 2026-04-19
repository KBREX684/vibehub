import Link from "next/link";
import { BookOpen, Bot, Key, Webhook } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui";

export default function SettingsDevelopersPage() {
  return (
    <main className="container max-w-5xl pb-24 pt-8 space-y-6">
      <PageHeader
        icon={Key}
        eyebrow="开发者设置"
        title="接入与密钥管理"
        subtitle="中国版 VibeHub 的 API、Agent 与回调配置统一从设置区进入，不再保留独立公开开发者主面。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="API 密钥" description="创建、吊销和查看当前账户的接入密钥。">
          <Link href="/settings/api-keys" className="btn btn-primary text-sm px-4 py-2">
            打开 API 密钥
          </Link>
        </SectionCard>
        <SectionCard title="我的智能代理" description="管理智能代理绑定、权限范围与确认流。">
          <Link href="/settings/agents" className="btn btn-primary text-sm px-4 py-2">
            打开 Agent 设置
          </Link>
        </SectionCard>
        <SectionCard title="Webhook" description="配置事件回调、签名校验与失败重试。">
          <Link href="/settings/webhooks" className="btn btn-primary text-sm px-4 py-2">
            打开 Webhook
          </Link>
        </SectionCard>
        <SectionCard title="OpenAPI 文档" description="查看当前环境的接口规范与 JSON 输出。">
          <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            打开规范
          </a>
        </SectionCard>
      </div>

      <SectionCard title="当前接入边界" description="这轮只保留中国版主路径，所有接入能力都服务于中文工作台与支付宝计费。">
        <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <li className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 shrink-0" />
            智能代理写入仍需人工确认，高风险动作不会直接执行。
          </li>
          <li className="flex items-start gap-2">
            <Key className="mt-0.5 h-4 w-4 shrink-0" />
            API 密钥与工作区权限保持最小化授权，不提供海外支付与英文开发者界面。
          </li>
          <li className="flex items-start gap-2">
            <Webhook className="mt-0.5 h-4 w-4 shrink-0" />
            Webhook 与接口规范继续可用，但统一从设置区进入，不再保留独立公开入口。
          </li>
        </ul>
      </SectionCard>
    </main>
  );
}
