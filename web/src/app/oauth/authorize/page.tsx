import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getOAuthAppAuthorizationCandidate } from "@/lib/repositories/oauth-app.repository";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OAuthAuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const clientId = typeof params.client_id === "string" ? params.client_id : "";
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : "";
  const scope = typeof params.scope === "string" ? params.scope : "";
  const state = typeof params.state === "string" ? params.state : "";
  const session = await getSessionUserFromCookie();

  if (!clientId || !redirectUri) {
    return (
      <main className="container max-w-xl pt-16 pb-24">
        <div className="card p-6 space-y-3">
          <h1 className="text-xl font-bold m-0">Invalid OAuth request</h1>
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            Missing <code>client_id</code> or <code>redirect_uri</code>.
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}${state ? `&state=${encodeURIComponent(state)}` : ""}`)}`);
  }

  let app = null;
  let error: string | null = null;
  try {
    app = await getOAuthAppAuthorizationCandidate({
      clientId,
      redirectUri,
      requestedScopes: scope.split(" ").map((item) => item.trim()).filter(Boolean),
    });
    if (!app) error = "OAuth client not found or inactive.";
  } catch (issue) {
    error = issue instanceof Error ? issue.message : "Failed to validate OAuth client.";
  }

  return (
    <main className="container max-w-xl pt-16 pb-24">
      <div className="card p-6 space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)] m-0">OAuth authorization</p>
          <h1 className="text-2xl font-bold m-0">Authorize access</h1>
          <p className="text-sm text-[var(--color-text-secondary)] m-0">
            Review the third-party app request before granting access to your VibeHub account.
          </p>
        </div>

        {error || !app ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-sm text-[var(--color-text-secondary)]">
            {error ?? "OAuth client not found."}
          </div>
        ) : (
          <>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{app.name}</p>
              {app.description && <p className="text-sm text-[var(--color-text-secondary)] m-0">{app.description}</p>}
              <p className="text-xs text-[var(--color-text-muted)] m-0">Redirect URI: {redirectUri}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Requested scopes</p>
              <ul className="m-0 p-0 list-none space-y-2 text-sm text-[var(--color-text-secondary)]">
                {(scope ? scope.split(" ").filter(Boolean) : app.scopes).map((item) => (
                  <li key={item} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 font-mono text-xs">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <form action="/api/v1/oauth/authorize/decision" method="post" className="flex items-center gap-3">
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="state" value={state} />
              <button type="submit" name="decision" value="approve" className="btn btn-primary">
                Approve
              </button>
              <button type="submit" name="decision" value="deny" className="btn btn-secondary">
                Deny
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
