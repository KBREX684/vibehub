import * as React from "react";
import {
  AlertTriangle,
  Lock,
  ShieldOff,
  WifiOff,
  Compass,
  ServerCrash,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ErrorStateKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "generic";

export interface ErrorStateProps {
  kind?: ErrorStateKind;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Fill parent container vertically */
  block?: boolean;
}

const iconMap: Record<ErrorStateKind, LucideIcon> = {
  network: WifiOff,
  unauthorized: Lock,
  forbidden: ShieldOff,
  not_found: Compass,
  server: ServerCrash,
  generic: AlertTriangle,
};

const defaultCopy: Record<ErrorStateKind, { title: string; description: string }> = {
  network: {
    title: "网络异常",
    description: "请检查网络连接后重试。",
  },
  unauthorized: {
    title: "请先登录",
    description: "你需要登录后才能访问此内容。",
  },
  forbidden: {
    title: "没有访问权限",
    description: "你当前的账号没有查看此内容的权限。",
  },
  not_found: {
    title: "找不到内容",
    description: "你访问的页面不存在，或可能已被移动。",
  },
  server: {
    title: "服务暂时不可用",
    description: "我们已记录此错误，请稍后再试。",
  },
  generic: {
    title: "出错了",
    description: "请稍后再试。",
  },
};

export function ErrorState({
  kind = "generic",
  title,
  description,
  action,
  className = "",
  block = false,
}: ErrorStateProps) {
  const Icon = iconMap[kind];
  const copy = defaultCopy[kind];
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-center text-center",
        "px-6 py-10",
        block ? "min-h-[50vh] justify-center" : "",
        className,
      ].join(" ")}
    >
      <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-error-subtle)] border border-[var(--color-error-border)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[var(--color-error)]" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
        {title ?? copy.title}
      </h3>
      <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed max-w-[360px] mt-2 m-0">
        {description ?? copy.description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
