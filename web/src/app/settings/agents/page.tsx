import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { AgentsClient } from "./agents-client";

export default async function AgentsSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/settings/agents");

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-featured)]">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">Agents</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            Register named agents, mark whether they are active, and link API keys so MCP traffic stays attributable.
          </p>
        </div>
      </div>
      <AgentsClient />
    </main>
  );
}
