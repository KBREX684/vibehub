"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/app/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import { WEBHOOK_EVENT_NAMES } from "@/lib/webhook-events";

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
};

type DeliveryRow = {
  id: string;
  event: string;
  targetUrl: string;
  status: string;
  httpStatus: number | null;
  attempts: number;
  createdAt: string;
};

export function WebhooksClient() {
  const { t } = useLanguage();
  const [items, setItems] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const [wRes, dRes] = await Promise.all([
        apiFetch("/api/v1/me/webhooks", { credentials: "include" }),
        apiFetch("/api/v1/me/webhook-deliveries?limit=30", { credentials: "include" }),
      ]);
      const wJson = (await wRes.json()) as { data?: { webhooks?: WebhookRow[] } };
      const dJson = (await dRes.json()) as { data?: { deliveries?: DeliveryRow[] } };
      setItems(wJson.data?.webhooks ?? []);
      setDeliveries(dJson.data?.deliveries ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createEndpoint(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/v1/me/webhooks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: events.length ? events : undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? t("webhooks.createFailed"));
      return;
    }
    toast.success(t("webhooks.created"));
    setUrl("");
    setEvents([]);
    void refresh();
  }

  async function testWebhook(id: string) {
    const res = await apiFetch(`/api/v1/me/webhooks/${encodeURIComponent(id)}/test`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? t("webhooks.testFailed"));
      return;
    }
    toast.success(json?.data?.ok ? t("webhooks.testSucceeded") : `${t("webhooks.testFailed")} ${json?.data?.error ?? ""}`.trim());
    void refresh();
  }

  function toggleEvent(name: string) {
    setEvents((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  return (
    <div className="space-y-8">
      <form onSubmit={createEndpoint} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("webhooks.newTitle")}</h2>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-text-secondary)]">{t("webhooks.httpsUrl")}</label>
          <input
            className="input-base"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/vibehub"
            required
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-muted)] m-0">{t("webhooks.events")}</p>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENT_NAMES.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={events.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary text-sm">
          {t("webhooks.create")}
        </button>
      </form>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("webhooks.endpoints")}</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("webhooks.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("webhooks.empty")}</p>
        ) : (
          <ul className="space-y-3 m-0 p-0 list-none">
            {items.map((w) => (
              <li key={w.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
                <p className="text-xs font-mono text-[var(--color-text-secondary)] break-all m-0">{w.url}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 m-0">
                  {w.events.length ? w.events.join(", ") : t("webhooks.allEvents")} · {w.active ? t("webhooks.active") : t("webhooks.inactive")}
                </p>
                <button type="button" className="btn btn-secondary text-xs mt-2" onClick={() => testWebhook(w.id)}>
                  {t("webhooks.sendTest")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("webhooks.recentDeliveries")}</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] m-0">{t("webhooks.recentDeliveriesEmpty")}</p>
        ) : (
          <ul className="space-y-2 m-0 p-0 list-none text-xs">
            {deliveries.map((d) => (
              <li key={d.id} className="border-b border-[var(--color-border-subtle)] pb-2">
                <span className="text-[var(--color-text-primary)]">{d.event}</span>{" "}
                <span className="text-[var(--color-text-muted)]">{d.status}</span>
                {d.httpStatus != null ? ` · HTTP ${d.httpStatus}` : ""}
                <div className="text-[var(--color-text-tertiary)] truncate">{d.targetUrl}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
