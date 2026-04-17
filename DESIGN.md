# VibeHub Design System — Monochrome Geek (v2)

> **Authority**: This document is the single source of truth for the VibeHub design system.
> `globals.css` must match the token table below. No component may introduce a colour
> literal that is not defined here.
>
> _Previous revision_ referenced an Apple.com-inspired aspiration. This revision
> documents the **implemented** system (dark-first, Inter/Geist Mono, accent palette)
> and deprecates the old Apple-only spec. Apple Blue is retained as
> `--color-accent-apple`, the primary interactive-CTA accent.

---

## 1. Design Philosophy

**Monochrome Geek** — a dark, dense, developer-tool aesthetic:

- Pure black (`#000000`) canvas — the terminal as UI canvas.
- High-contrast `#EDEDED` text on black — sharp, readable, professional.
- Flat surfaces, minimal shadows, border-first elevation.
- One primary accent (`--color-accent-apple`, `#0071e3`) plus a purposeful
  secondary palette (violet, cyan, emerald/enterprise, semantic colors).
- Inter for UI copy; Geist Mono for all code, tags, and technical labels.

---

## 2. Token Reference

All values live in `web/src/app/globals.css` `@theme {}` block.
**Never hard-code a hex value in a component** — use the CSS custom property.

### Background

| Token | Value | Use |
|---|---|---|
| `--color-bg-canvas` | `#000000` | Page root background |
| `--color-bg-surface` | `#0A0A0A` | Card / panel surface |
| `--color-bg-surface-hover` | `#171717` | Card hover state |
| `--color-bg-elevated` | `#171717` | Modal, popover, dropdown |
| `--color-bg-subtle` | `rgba(255,255,255,0.03)` | Faint tinted surface |

### Text

| Token | Value | Use |
|---|---|---|
| `--color-text-primary` | `#EDEDED` | Headings, primary content |
| `--color-text-secondary` | `#A1A1AA` | Body copy, labels |
| `--color-text-tertiary` | `#71717A` | Captions, help text |
| `--color-text-muted` | `#52525B` | Placeholders, disabled |
| `--color-text-inverse` | `#000000` | Text on primary/white fill |
| `--color-on-accent` | `#FFFFFF` | Text/icon on saturated coloured fill (accent-apple/violet/cyan, gradient chips) |

### Borders

| Token | Value | Use |
|---|---|---|
| `--color-border` | `rgba(255,255,255,0.10)` | Default border |
| `--color-border-subtle` | `rgba(255,255,255,0.05)` | Dividers, ghost borders |
| `--color-border-strong` | `rgba(255,255,255,0.20)` | Focused / active borders |

### Brand / Primary (white-on-black)

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#FFFFFF` | Primary fill (buttons, icons on dark) |
| `--color-primary-hover` | `#E5E5E5` | Hover state |
| `--color-primary-subtle` | `rgba(255,255,255,0.10)` | Tinted background |

### Accent Palette

| Token | Value | Use |
|---|---|---|
| `--color-accent-apple` | `#0071e3` | Primary interactive CTA — links, buttons, focus |
| `--color-accent-apple-hover` | `#0062cc` | CTA hover state |
| `--color-accent-apple-subtle` | `rgba(0,113,227,0.12)` | CTA background tint |
| `--color-accent-violet` | `#a78bfa` | Teams, collaboration, user avatars |
| `--color-accent-violet-hover` | `#8b5cf6` | Hover state |
| `--color-accent-violet-subtle` | `rgba(167,139,250,0.10)` | Tinted background |
| `--color-accent-cyan` | `#22d3ee` | Discussions, chat, discovery |
| `--color-accent-cyan-hover` | `#06b6d4` | Hover state |
| `--color-accent-cyan-subtle` | `rgba(34,211,238,0.10)` | Tinted background |

### Semantic

| Token | Value | Use |
|---|---|---|
| `--color-success` | `#34d399` | Success states, "active" badges |
| `--color-success-subtle` | `rgba(52,211,153,0.10)` | Success background tint |
| `--color-warning` | `#fbbf24` | Warnings, challenges, in-progress |
| `--color-warning-subtle` | `rgba(251,191,36,0.10)` | Warning background tint |
| `--color-error` | `#f87171` | Errors, destructive actions |
| `--color-error-subtle` | `rgba(248,113,113,0.10)` | Error background tint |
| `--color-info` | `#60a5fa` | Informational badges |
| `--color-info-subtle` | `rgba(96,165,250,0.10)` | Info background tint |

### Enterprise

| Token | Value | Use |
|---|---|---|
| `--color-enterprise` | `#34d399` | Enterprise tier marker (same hue as success) |
| `--color-enterprise-subtle` | `rgba(52,211,153,0.10)` | Enterprise background tint |

### Radii

| Token | Value |
|---|---|
| `--radius-xs` | `2px` |
| `--radius-sm` | `4px` |
| `--radius-md` | `6px` |
| `--radius-lg` | `8px` |
| `--radius-xl` | `12px` |
| `--radius-2xl` | `16px` |
| `--radius-3xl` | `24px` |
| `--radius-pill` | `9999px` |

### Shadows

| Token | Value |
|---|---|
| `--shadow-card` | `none` (flat design) |
| `--shadow-card-hover` | `none` |
| `--shadow-modal` | `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)` |

---

## 3. Typography

### Font Stack

| Role | Stack | Variable |
|---|---|---|
| Sans-serif | Inter, -apple-system, BlinkMacSystemFont, … | `--font-sans` |
| Monospace | Geist Mono, JetBrains Mono, Fira Code, … | `--font-mono` |

### Scale

| Role | Size | Weight | Line-height | Notes |
|---|---|---|---|---|
| Hero display | `clamp(2rem, 4vw, 3.5rem)` | 600 | 1.10 | `h1` |
| Section heading | `clamp(1.5rem, 3vw, 2.5rem)` | 600 | 1.15 | `h2` |
| Card heading | `clamp(1.25rem, 2vw, 1.75rem)` | 600 | 1.20 | `h3` |
| Body | `1rem` | 400 | 1.60 | `p` |
| Small / label | `0.875rem` | 400–500 | 1.5 | — |
| Caption / tag | `0.75rem` | 400 | 1.33 | Mono encouraged |
| Micro | `0.625–0.7rem` | 400 | 1.4 | Fine print, footnotes |

Letter-spacing on headings: `-0.02em`.

---

## 4. Component Utilities (globals.css)

These utility classes are provided in `globals.css` and consumed by all components.
Do not re-implement them inline.

| Class | Purpose |
|---|---|
| `.card` | Surface with border + transition |
| `.card:hover` | Border → strong, bg → surface-hover |
| `.card-elevated` | Elevated surface (`--color-bg-elevated`) |
| `.tag` | Monospace label pill |
| `.tag-row` | Flex row for tag lists |
| `.btn` | Base button (inline-flex, transitions) |
| `.btn-primary` | White fill on black |
| `.btn-secondary` | Transparent + border |
| `.btn-ghost` | Transparent, no border |
| `.input-base` | Text input (border, focus ring) |
| `.inline-link` | Underline link, text-primary on hover |
| `.code-block` | Surface code container |
| `.meta-row` | Flex row for metadata chips |
| `.animate-fade-in-up` | 0.6 s entrance animation |
| `.container` | `min(1280px, 94vw)` centered |

For shared interactive primitives (Button, Input, Badge, Card, Modal, Skeleton)
see `web/src/components/ui/` — prefer those over raw utility classes in new code.

---

## 5. Rules & Governance

### Do

- Use CSS custom properties (`var(--color-*)`) everywhere — no hex literals in components.
- Pick accent by semantic meaning:
  - Teams / collaboration → `--color-accent-violet`
  - Discussions / chat / discovery → `--color-accent-cyan`
  - Primary CTA / links / focus → `--color-accent-apple`
  - Enterprise / success → `--color-enterprise` / `--color-success`
  - Warnings / challenges → `--color-warning`
  - Errors / destructive → `--color-error`
- Use `--font-mono` for all code, slugs, CLI samples, and tag labels.
- New `ui/` primitives should accept a `variant` prop that maps to tokens.

### Don't

- **Never** use `stone-`, `amber-`, or other Tailwind palette literals in page
  components — these were a divergence artifact, now migrated away.
- **Never** add `bg-white`, `text-stone-900`, or similar light-theme classes
  outside of `components/ui/` variants explicitly designed for light contexts.
- Don't introduce a new colour not in this table without updating `globals.css`
  and this document in the same PR.
- Don't shadow-copy token names (`my-accent-blue: #0071e3`) — there is exactly
  one definition per token, here.
