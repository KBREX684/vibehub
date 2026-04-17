import Link from "next/link";
import { ArrowLeft, BookOpen, Key, Terminal } from "lucide-react";
import { buildOpenApiDocument } from "@/lib/openapi-spec";
import { PageHeader } from "@/components/ui";
import { ApiDocsClient } from "./api-docs-client";

export default function DeveloperApiDocsPage() {
  const spec = buildOpenApiDocument() as { info?: { version?: string }; paths: Record<string, unknown> };

  return (
    <main className="container max-w-7xl pb-24 pt-8 space-y-8">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/developers" className="inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Developers
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-muted)]">API docs</span>
      </div>

      <PageHeader
        icon={Terminal}
        eyebrow="W5 · API Docs"
        title="Interactive OpenAPI docs"
        subtitle={`Browse ${Object.keys(spec.paths).length} routes, inspect auth and scope metadata, and run same-origin JSON requests from the browser.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings/api-keys" className="btn btn-secondary text-sm px-4 py-2">
              <Key className="w-4 h-4" aria-hidden="true" />
              API Keys
            </Link>
            <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="btn btn-ghost text-sm px-4 py-2">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Raw JSON
            </a>
          </div>
        }
      />

      <ApiDocsClient spec={spec as never} />
    </main>
  );
}
