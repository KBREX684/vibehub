import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { getSessionUserFromCookie } from "@/lib/auth";

export default async function ApiKeysSettingsPage() {
  const session = await getSessionUserFromCookie();

  return (
    <>
      <SiteHeader />
      <main className="container detail">
        <article className="card detail-full">
          <p className="muted small">
            <Link href="/" className="inline-link">
              ← 首页
            </Link>
          </p>
          <h1>开发者设置</h1>
          <p className="muted">API Key 与开放接口（P4）</p>
        </article>
        <ApiKeysPanel currentUserId={session?.userId ?? null} />
      </main>
    </>
  );
}
