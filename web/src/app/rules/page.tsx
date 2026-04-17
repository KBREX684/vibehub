import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Rules — VibeHub",
  description: "Baseline content, conduct, automation, and security rules for VibeHub.",
};

const sections = [
  {
    title: "Respectful participation",
    body:
      "No harassment, hate speech, threats, doxxing, or targeted abuse. Debate ideas directly, but do not attack people.",
  },
  {
    title: "Authentic identity and attribution",
    body:
      "Do not impersonate other people, teams, or companies. Claim only work, code, screenshots, domains, or credentials you actually own or are allowed to represent.",
  },
  {
    title: "No malicious content",
    body:
      "Do not upload or link malware, credential stealers, phishing pages, exploit kits, or instructions intended to cause unauthorized harm.",
  },
  {
    title: "No spam or ranking manipulation",
    body:
      "Do not flood discussions, fake engagement, mass-message users, or manipulate rankings, recommendations, collaboration funnels, verification workflows, or billing flows.",
  },
  {
    title: "Automation, MCP, and Agent use",
    body:
      "Use API keys, MCP tools, workflows, and Agents only within the granted scopes, role boundaries, and rate limits. Do not bypass confirmation queues, impersonate another user, or use automation to execute high-risk actions without the required human approval.",
  },
  {
    title: "Reports, moderation, and AI assistance",
    body:
      "Users may report content or behavior. Administrators may review reports, enterprise verification requests, audit trails, and AI-generated suggestions before making moderation decisions. AI suggestions do not automatically decide enforcement outcomes.",
  },
  {
    title: "AIGC transparency",
    body:
      "If you use AI-generated or heavily AI-assisted material in a way that may mislead other users, you may be required to clarify authorship, source, or editing responsibility. See /aigc for the current policy.",
  },
  {
    title: "Enforcement",
    body:
      "We may warn, limit, suspend, remove content, revoke API access, reject verification, cancel paid benefits, or terminate accounts that violate these rules or create material legal, security, or operational risk.",
  },
];

export default function RulesPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Platform Rules</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 17, 2026</p>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{section.title}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] m-0 leading-6">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
