"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { BillingRecord } from "@/lib/types";

interface Props {
  record: BillingRecord;
}

export function SandboxCheckoutClient({ record }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "succeed" | "fail" | "cancel" | "refund") {
    setBusy(action);
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/billing/sandbox/records/${encodeURIComponent(record.id)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? "Sandbox billing action failed");
        return;
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {record.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary text-sm px-4 py-2" disabled={busy !== null} onClick={() => void run("succeed")}>
            {busy === "succeed" ? "Processing..." : "Mark paid"}
          </button>
          <button className="btn btn-secondary text-sm px-4 py-2" disabled={busy !== null} onClick={() => void run("fail")}>
            {busy === "fail" ? "Processing..." : "Mark failed"}
          </button>
          <button className="btn btn-ghost text-sm px-4 py-2" disabled={busy !== null} onClick={() => void run("cancel")}>
            {busy === "cancel" ? "Processing..." : "Cancel checkout"}
          </button>
        </div>
      ) : null}
      {record.status === "succeeded" ? (
        <button className="btn btn-secondary text-sm px-4 py-2" disabled={busy !== null} onClick={() => void run("refund")}>
          {busy === "refund" ? "Processing..." : "Simulate refund"}
        </button>
      ) : null}
      {message ? <p className="text-sm text-[var(--color-danger)] m-0">{message}</p> : null}
    </div>
  );
}
