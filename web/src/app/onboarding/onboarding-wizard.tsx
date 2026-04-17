"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Bot,
  MessageSquarePlus,
  FolderPlus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button, FormField, PageHeader, SectionCard, TagPill } from "@/components/ui";

/**
 * Keep the storage key stable so we never re-bug a user who already skipped
 * or finished the wizard. Wiping cookies will naturally re-trigger it; that
 * is the intended behaviour.
 */
const STORAGE_KEY = "vibehub.onboarding.v8";

type StorageState = {
  status: "skipped" | "completed";
  completedAt: string;
};

export interface OnboardingLabels {
  title: string;
  subtitle: string;
  stepOf: (current: number, total: number) => string;
  skip: string;
  skipAll: string;
  back: string;
  next: string;
  done: string;
  s1: {
    heading: string;
    sub: string;
    nickname: string;
    nicknameHint: string;
    headline: string;
    headlineHint: string;
    interestsLabel: string;
    interestsHint: string;
  };
  s2: {
    heading: string;
    sub: string;
    note: string;
  };
  s3: {
    heading: string;
    sub: string;
    postTitle: string;
    postDesc: string;
    projectTitle: string;
    projectDesc: string;
    agentTitle: string;
    agentDesc: string;
  };
  tags: Record<
    "frontend" | "backend" | "ai" | "infra" | "mobile" | "game" | "design" | "research",
    string
  >;
  tools: Record<"cursor" | "claude" | "openclaw" | "codex" | "custom" | "none", string>;
}

type InterestKey = keyof OnboardingLabels["tags"];
type ToolKey = keyof OnboardingLabels["tools"];

const INTEREST_KEYS: InterestKey[] = [
  "frontend",
  "backend",
  "ai",
  "infra",
  "mobile",
  "game",
  "design",
  "research",
];

const TOOL_KEYS: ToolKey[] = ["cursor", "claude", "openclaw", "codex", "custom", "none"];

const FINAL_ACTION_LINKS: Record<"post" | "project" | "agent", string> = {
  post: "/discussions/new",
  project: "/projects/new",
  agent: "/settings/agents",
};

/**
 * Best-effort telemetry hook. We fire and forget so the wizard can never
 * block on network errors; if the endpoint doesn't exist yet the fetch will
 * silently fail and we move on.
 */
async function emitOnboardingEvent(payload: {
  step: string;
  action: "view" | "complete" | "skip";
  meta?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/v1/me/onboarding-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // swallow — telemetry is advisory, never blocking
  }
}

export function OnboardingWizard({ labels }: { labels: OnboardingLabels }) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  // Step 1 state
  const [nickname, setNickname] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [interests, setInterests] = React.useState<InterestKey[]>([]);

  // Step 2 state
  const [tools, setTools] = React.useState<ToolKey[]>([]);

  // Step 3 state
  const [finalChoice, setFinalChoice] = React.useState<"post" | "project" | "agent" | null>(null);

  React.useEffect(() => {
    void emitOnboardingEvent({ step: `s${step}`, action: "view" });
  }, [step]);

  function toggleInterest(key: InterestKey) {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  function toggleTool(key: ToolKey) {
    setTools((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // "none" is mutually exclusive with everything else
      if (key === "none") return ["none"];
      return [...prev.filter((k) => k !== "none"), key];
    });
  }

  function persistResult(status: StorageState["status"]) {
    try {
      const payload: StorageState = {
        status,
        completedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be disabled (private mode); accept and continue
    }
  }

  async function handleSkipAll() {
    void emitOnboardingEvent({ step: `s${step}`, action: "skip" });
    persistResult("skipped");
    router.replace("/");
  }

  async function handleFinish() {
    setSubmitting(true);
    void emitOnboardingEvent({
      step: "s3",
      action: "complete",
      meta: {
        nickname: Boolean(nickname.trim()),
        headline: Boolean(headline.trim()),
        interests,
        tools,
        finalChoice,
      },
    });
    persistResult("completed");
    const target = finalChoice ? FINAL_ACTION_LINKS[finalChoice] : "/";
    router.replace(target);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow={labels.stepOf(step, 3)}
        icon={Sparkles}
        title={labels.title}
        subtitle={labels.subtitle}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            aria-label={labels.skipAll}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            {labels.skipAll}
          </Button>
        }
      />

      {/* Step 1 */}
      {step === 1 ? (
        <SectionCard title={labels.s1.heading} description={labels.s1.sub}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={labels.s1.nickname} hint={labels.s1.nicknameHint} required>
              <input
                className="input-base"
                placeholder="Alice"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
              />
            </FormField>
            <FormField label={labels.s1.headline} hint={labels.s1.headlineHint}>
              <input
                className="input-base"
                placeholder={labels.s1.headlineHint.split("，")[0] ?? ""}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={60}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label={labels.s1.interestsLabel} hint={labels.s1.interestsHint}>
              <div className="flex flex-wrap gap-2">
                {INTEREST_KEYS.map((key) => {
                  const active = interests.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleInterest(key)}
                      aria-pressed={active}
                      className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-pill)]"
                    >
                      <TagPill accent={active ? "apple" : "default"} className="cursor-pointer">
                        {active ? (
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        ) : null}
                        {labels.tags[key]}
                      </TagPill>
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        </SectionCard>
      ) : null}

      {/* Step 2 */}
      {step === 2 ? (
        <SectionCard title={labels.s2.heading} description={labels.s2.sub}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOOL_KEYS.map((key) => {
              const active = tools.includes(key);
              const Icon = key === "none" ? Sparkles : Bot;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTool(key)}
                  aria-pressed={active}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-left transition-colors",
                    active
                      ? "border-[var(--color-accent-apple)] bg-[var(--color-accent-apple-subtle)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{labels.tools[key]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed mt-4 m-0">
            {labels.s2.note}
          </p>
        </SectionCard>
      ) : null}

      {/* Step 3 */}
      {step === 3 ? (
        <SectionCard title={labels.s3.heading} description={labels.s3.sub}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                {
                  key: "post" as const,
                  icon: MessageSquarePlus,
                  title: labels.s3.postTitle,
                  desc: labels.s3.postDesc,
                },
                {
                  key: "project" as const,
                  icon: FolderPlus,
                  title: labels.s3.projectTitle,
                  desc: labels.s3.projectDesc,
                },
                {
                  key: "agent" as const,
                  icon: Bot,
                  title: labels.s3.agentTitle,
                  desc: labels.s3.agentDesc,
                },
              ]
            ).map(({ key, icon: Icon, title, desc }) => {
              const active = finalChoice === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFinalChoice(key)}
                  aria-pressed={active}
                  className={[
                    "flex flex-col gap-3 p-5 rounded-[var(--radius-lg)] border text-left transition-colors",
                    active
                      ? "border-[var(--color-accent-apple)] bg-[var(--color-accent-apple-subtle)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]",
                  ].join(" ")}
                >
                  <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {/* Footer controls */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((v) => Math.max(1, v - 1))}
          disabled={step === 1 || submitting}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {labels.back}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              void emitOnboardingEvent({ step: `s${step}`, action: "skip" });
              if (step < 3) {
                setStep((v) => v + 1);
              } else {
                await handleFinish();
              }
            }}
            disabled={submitting}
          >
            {labels.skip}
          </Button>
          {step < 3 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep((v) => v + 1)}
              disabled={submitting || (step === 1 && nickname.trim().length === 0)}
            >
              {labels.next}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinish}
              loading={submitting}
            >
              {labels.done}
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
