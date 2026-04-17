"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Button,
  CopyButton,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  SectionCard,
  TagPill,
} from "@/components/ui";
import { BookOpen, ExternalLink, Play, Search } from "lucide-react";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type AuthMode = "anonymous" | "session" | "bearer_api_key";

interface OpenApiParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<string, unknown>;
  [key: string]: unknown;
}

interface OpenApiDocument {
  info?: { title?: string; version?: string };
  paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
}

interface OperationEntry {
  id: string;
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  parameters: OpenApiParameter[];
  requestSchema?: Record<string, unknown>;
  responses?: Record<string, unknown>;
  authModes: AuthMode[];
  requiredScope?: string | null;
  rateLimitTier?: string | null;
  runnable: boolean;
}

const METHOD_ORDER: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

function methodTone(method: HttpMethod) {
  if (method === "get") return "cyan" as const;
  if (method === "post") return "apple" as const;
  if (method === "patch") return "violet" as const;
  if (method === "delete") return "error" as const;
  return "default" as const;
}

function buildExampleValue(schema: Record<string, unknown> | undefined): unknown {
  if (!schema) return "";
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (schema.type === "object") {
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (required.size === 0 || required.has(key)) {
        out[key] = buildExampleValue(value);
      }
    }
    return out;
  }
  if (schema.type === "array") return [];
  if (schema.type === "integer" || schema.type === "number") return 0;
  if (schema.type === "boolean") return false;
  return "";
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function normalizeOperations(spec: OpenApiDocument): OperationEntry[] {
  const entries: OperationEntry[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of METHOD_ORDER) {
      const operation = pathItem[method];
      if (!operation) continue;
      const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
      entries.push({
        id: `${method.toUpperCase()} ${path}`,
        method,
        path,
        tag: operation.tags?.[0] ?? "other",
        summary: operation.summary ?? `${method.toUpperCase()} ${path}`,
        description: operation.description,
        parameters: operation.parameters ?? [],
        requestSchema,
        responses: operation.responses,
        authModes: ((operation["x-auth-modes"] as AuthMode[] | undefined) ?? ["anonymous"]).filter(Boolean),
        requiredScope: (operation["x-required-scope"] as string | null | undefined) ?? null,
        rateLimitTier: (operation["x-rate-limit-tier"] as string | null | undefined) ?? null,
        runnable: !operation.requestBody || Boolean(requestSchema),
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path) || METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method));
}

function formatAuthMode(mode: AuthMode): string {
  switch (mode) {
    case "session":
      return "Session";
    case "bearer_api_key":
      return "Bearer API Key";
    default:
      return "Anonymous";
  }
}

export function ApiDocsClient({ spec }: { spec: OpenApiDocument }) {
  const operations = useMemo(() => normalizeOperations(spec), [spec]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(operations[0]?.id ?? null);
  const [authMode, setAuthMode] = useState<AuthMode>("anonymous");
  const [bearerKey, setBearerKey] = useState("");
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("{}");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    headers: Array<[string, string]>;
    body: string;
    prettyBody: string;
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter((operation) => {
      const haystack = [operation.tag, operation.method, operation.path, operation.summary].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [operations, query]);

  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected) return;
    const nextPathValues: Record<string, string> = {};
    const nextQueryValues: Record<string, string> = {};
    for (const parameter of selected.parameters) {
      if (parameter.in === "path") nextPathValues[parameter.name] = "";
      if (parameter.in === "query") nextQueryValues[parameter.name] = "";
    }
    setPathValues(nextPathValues);
    setQueryValues(nextQueryValues);
    setBodyText(prettyJson(buildExampleValue(selected.requestSchema)));
    setAuthMode(selected.authModes.includes("session") ? "session" : selected.authModes[0] ?? "anonymous");
    setResult(null);
    setRunError(null);
  }, [selected]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, OperationEntry[]>>((acc, operation) => {
      (acc[operation.tag] ??= []).push(operation);
      return acc;
    }, {});
  }, [filtered]);

  async function runRequest() {
    if (!selected) return;
    setSubmitting(true);
    setRunError(null);
    setResult(null);

    try {
      let url = selected.path;
      for (const parameter of selected.parameters.filter((item) => item.in === "path")) {
        const value = pathValues[parameter.name]?.trim();
        if (!value) {
          throw new Error(`Missing required path parameter: ${parameter.name}`);
        }
        url = url.replace(`{${parameter.name}}`, encodeURIComponent(value));
      }

      const searchParams = new URLSearchParams();
      for (const parameter of selected.parameters.filter((item) => item.in === "query")) {
        const value = queryValues[parameter.name]?.trim();
        if (value) searchParams.set(parameter.name, value);
      }
      const finalUrl = searchParams.size > 0 ? `${url}?${searchParams.toString()}` : url;

      const headers: Record<string, string> = {};
      let body: string | undefined;
      if (selected.requestSchema) {
        if (bodyText.trim()) {
          JSON.parse(bodyText);
          body = bodyText;
          headers["Content-Type"] = "application/json";
        }
      }

      let response: Response;
      if (authMode === "session") {
        response = await apiFetch(finalUrl, {
          method: selected.method.toUpperCase(),
          headers,
          body,
          credentials: "include",
        });
      } else {
        if (authMode === "bearer_api_key") {
          if (!bearerKey.trim()) {
            throw new Error("Bearer API key is required for this mode.");
          }
          headers.Authorization = `Bearer ${bearerKey.trim()}`;
        }
        response = await fetch(finalUrl, {
          method: selected.method.toUpperCase(),
          headers,
          body,
          credentials: "omit",
        });
      }

      const rawBody = await response.text();
      let prettyBody = rawBody;
      try {
        prettyBody = prettyJson(JSON.parse(rawBody));
      } catch {
        // keep raw body
      }

      setResult({
        status: response.status,
        headers: [...response.headers.entries()],
        body: rawBody,
        prettyBody,
      });
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (operations.length === 0) {
    return <LoadingSkeleton preset="list" count={3} />;
  }

  if (!selected) {
    return <EmptyState icon={BookOpen} title="No matching endpoints" description="Try a different search term." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <SectionCard
        className="lg:col-span-3"
        icon={Search}
        title="Endpoints"
        description="Search by tag, method, path, or summary."
        padding="md"
      >
        <div className="space-y-4">
          <input
            className="input-base"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search endpoints"
          />
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([tag, items]) => (
              <div key={tag} className="space-y-2">
                <div className="text-[0.7rem] uppercase tracking-[0.12em] font-mono text-[var(--color-text-tertiary)]">
                  {tag}
                </div>
                <div className="space-y-1">
                  {items.map((operation) => (
                    <button
                      key={operation.id}
                      type="button"
                      onClick={() => setSelectedId(operation.id)}
                      className={[
                        "w-full rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors",
                        selected.id === operation.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                          : "border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TagPill accent={methodTone(operation.method)} size="sm" mono>
                          {operation.method.toUpperCase()}
                        </TagPill>
                        <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">{operation.path}</span>
                      </div>
                      <div className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-2">{operation.summary}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        className="lg:col-span-5"
        icon={BookOpen}
        title={selected.summary}
        description={selected.path}
        actions={<CopyButton value={`${selected.method.toUpperCase()} ${selected.path}`} size="sm" />}
        padding="lg"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <TagPill accent={methodTone(selected.method)} size="sm" mono>
              {selected.method.toUpperCase()}
            </TagPill>
            {selected.authModes.map((mode) => (
              <TagPill key={mode} accent="default" size="sm">
                {formatAuthMode(mode)}
              </TagPill>
            ))}
            {selected.requiredScope ? (
              <TagPill accent="violet" size="sm" mono>
                scope: {selected.requiredScope}
              </TagPill>
            ) : null}
            {selected.rateLimitTier ? (
              <TagPill accent="default" size="sm" mono>
                rate: {selected.rateLimitTier}
              </TagPill>
            ) : null}
          </div>

          {selected.description ? (
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed m-0">{selected.description}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Parameters</div>
              {selected.parameters.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] m-0">No path or query parameters.</p>
              ) : (
                <div className="space-y-2">
                  {selected.parameters.map((parameter) => (
                    <div key={`${parameter.in}-${parameter.name}`} className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <code className="text-xs font-mono text-[var(--color-text-primary)]">{parameter.name}</code>
                        <TagPill accent="default" size="sm" mono>
                          {parameter.in}
                        </TagPill>
                        {parameter.required ? (
                          <TagPill accent="error" size="sm" mono>
                            required
                          </TagPill>
                        ) : null}
                      </div>
                      {parameter.description ? (
                        <p className="text-xs text-[var(--color-text-secondary)] m-0">{parameter.description}</p>
                      ) : null}
                      {parameter.schema ? (
                        <pre className="mt-2 overflow-x-auto text-[11px] text-[var(--color-text-tertiary)] m-0">{prettyJson(parameter.schema)}</pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Request schema</div>
              {selected.requestSchema ? (
                <pre className="overflow-x-auto text-[11px] text-[var(--color-text-secondary)] m-0">{prettyJson(selected.requestSchema)}</pre>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] m-0">No JSON request body.</p>
              )}
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Responses</div>
              <pre className="overflow-x-auto text-[11px] text-[var(--color-text-secondary)] m-0">{prettyJson(selected.responses ?? {})}</pre>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        className="lg:col-span-4 lg:sticky lg:top-20"
        icon={Play}
        title="Try it"
        description="Run the selected endpoint with anonymous, session, or Bearer API key auth."
        actions={
          <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1">
            Raw spec
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Auth mode</label>
            <select className="input-base" value={authMode} onChange={(event) => setAuthMode(event.target.value as AuthMode)}>
              <option value="anonymous">Anonymous</option>
              <option value="session">Session</option>
              <option value="bearer_api_key">Bearer API Key</option>
            </select>
          </div>

          {authMode === "bearer_api_key" ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Bearer API Key</label>
              <input
                className="input-base font-mono"
                value={bearerKey}
                onChange={(event) => setBearerKey(event.target.value)}
                placeholder="vh_..."
              />
            </div>
          ) : null}

          {selected.parameters.filter((parameter) => parameter.in === "path").length > 0 ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Path params</label>
              {selected.parameters
                .filter((parameter) => parameter.in === "path")
                .map((parameter) => (
                  <input
                    key={parameter.name}
                    className="input-base"
                    value={pathValues[parameter.name] ?? ""}
                    onChange={(event) => setPathValues((current) => ({ ...current, [parameter.name]: event.target.value }))}
                    placeholder={parameter.name}
                  />
                ))}
            </div>
          ) : null}

          {selected.parameters.filter((parameter) => parameter.in === "query").length > 0 ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Query params</label>
              {selected.parameters
                .filter((parameter) => parameter.in === "query")
                .map((parameter) => (
                  <input
                    key={parameter.name}
                    className="input-base"
                    value={queryValues[parameter.name] ?? ""}
                    onChange={(event) => setQueryValues((current) => ({ ...current, [parameter.name]: event.target.value }))}
                    placeholder={parameter.name}
                  />
                ))}
            </div>
          ) : null}

          {selected.requestSchema ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">JSON body</label>
              <textarea
                className="input-base min-h-[220px] font-mono text-xs"
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                spellCheck={false}
              />
            </div>
          ) : null}

          {!selected.runnable ? (
            <ErrorBanner>This endpoint cannot be run here because it does not accept a standard JSON request body.</ErrorBanner>
          ) : null}
          {runError ? <ErrorBanner>{runError}</ErrorBanner> : null}

          <Button variant="primary" size="md" onClick={() => void runRequest()} disabled={submitting || !selected.runnable}>
            <Play className="w-4 h-4" aria-hidden="true" />
            {submitting ? "Running…" : "Run request"}
          </Button>

          {result ? (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4">
              <div className="flex items-center gap-2">
                <TagPill accent={result.status >= 400 ? "error" : "success"} size="sm" mono>
                  {result.status}
                </TagPill>
                <span className="text-xs text-[var(--color-text-secondary)]">{selected.method.toUpperCase()} {selected.path}</span>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2">Headers</div>
                <pre className="overflow-x-auto text-[11px] text-[var(--color-text-secondary)] m-0">{prettyJson(Object.fromEntries(result.headers))}</pre>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2">Body</div>
                <pre className="overflow-x-auto text-[11px] text-[var(--color-text-secondary)] m-0">{result.prettyBody || result.body}</pre>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
