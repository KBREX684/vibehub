# V7.0 Pre-Release Rehearsal — 2026-04-17

## Summary

This rehearsal was run against a production-like local environment after the v7.0 closure fixes for team settings, enterprise copy, billing session continuity, and i18n/runtime regressions.

Result:
- Code and build gates: passed
- Fresh-schema migrate/seed/smoke gates: passed
- Manual release walkthrough: passed for the targeted login, discussion, project, team, API/MCP, billing, enterprise verification, and admin governance flows
- External/live prerequisites: still pending

This document is the release-candidate evidence for `v7.0.0-rc.1`.

## Environment

- App repo: `KBREX684/vibehub`
- App root: `/root/vibehub/web`
- Rehearsal date: `2026-04-17`
- App mode: `NODE_ENV=production`
- Base URL: `http://127.0.0.1:43160`
- WebSocket health URL: `http://127.0.0.1:43161/health`
- Database: `postgresql://postgres:postgres@127.0.0.1:5432/vibehub_rc_final_20260417?schema=public`
- Seed users:
  - `alice@vibehub.dev / RcPass123!` (admin)
  - `bob@vibehub.dev / RcPass123!` (user)

## Code / Build Gates

Passed:
- `npm run lint`
  - status: passed
  - note: 3 historical warnings remain
- `npm run validate:openapi`
  - status: passed
  - result: `paths=117`, `non-admin coverage=92.6% (122 routes)`
- `npm run generate:types`
  - status: passed
- `npm test`
  - status: passed
  - result: `58` test files, `240` tests
- `npm run build`
  - status: passed

## Fresh-Schema / Data Gates

Passed earlier on a clean rehearsal database and re-validated on the final rehearsal database:
- `prisma migrate deploy`
  - status: passed after preflight migration fixes
- `npm run prisma:seed`
  - status: passed
- `npm run smoke:live-data`
  - status: passed
  - result:
    - `userCount=2`
    - `project=vibehub`
    - `team=vibehub-core`
    - `creator=alice-ai-builder`
    - `subscriptionTier=free`
    - `enterpriseStatus=none`

## Product Closure Fixes Included In This Rehearsal

### Team settings closure
- `/teams/[slug]/settings` is now a real settings center instead of a links-only form.
- Scope now includes:
  - overview editing (`name`, `mission`)
  - external links editing
  - member/permission summary
  - coordination shortcuts back into tasks/discussions/team page

### Enterprise wording closure
- User-visible enterprise pages now describe v7 correctly:
  - enterprise verification = manual review + badge + verified identity context
  - no user-facing promise of separate enterprise workspace, observer seats, or radar workspace product

### Billing session continuity
- Subscription updates no longer invalidate the active browser session during sandbox checkout success/failure flows.
- This was required to keep the user inside the billing -> subscription follow-up path during the rehearsal.

## Manual Walkthrough Results

### User journey: Bob

Passed:
1. Login
   - email login redirected correctly into the authenticated app
2. Discussions
   - opened seeded discussion detail
   - created a new comment successfully
3. Projects
   - created a new project from `/projects/new`
   - opened project edit flow
   - saved `repoUrl` and `websiteUrl`
   - re-opened edit page and verified persistence
4. Team collaboration
   - created a new task in `vibehub-core`
   - sent a chat message and verified it rendered in history
5. Developer / API / MCP
   - created a session-backed API key through the authenticated API
   - fetched MCP manifest
   - invoked `search_projects` successfully with the generated Bearer key
6. Billing
   - started China payment sandbox flow from `/pricing`
   - completed `Alipay sandbox` payment
   - verified subscription status via app + repository state
7. Enterprise verification
   - submitted enterprise verification request successfully
   - resulting status moved to `pending`

### Admin journey: Alice

Passed:
1. Team settings
   - opened `/teams/vibehub-core/settings`
   - updated team mission
   - save feedback returned successfully
2. Moderation
   - opened `/admin/moderation`
   - approved a pending moderation item
3. Reports
   - opened `/admin/reports`
   - closed an open report ticket
4. Enterprise review
   - opened `/admin/enterprise`
   - approved Bob's pending enterprise verification
5. AI governance
   - opened `/admin/ai-suggestions`
6. MCP governance
   - opened `/admin/mcp-audits`
7. Health
   - called `/api/v1/admin/health`
   - result:
     - `database=ok`
     - `websocket=ok`
     - `redis=not_configured`
     - `mockData=false`

## Findings

### Fixed during rehearsal
- Billing subscription updates were bumping `sessionVersion` and forcing the current browser session to become invalid after checkout. This is now fixed.
- Enterprise verification form success handling was using the wrong API response shape. This is now fixed.
- Production SSR still exposed untranslated keys for several shared strings. Locale keys were added and verified.
- Discover page had a server/client boundary violation caused by passing a function prop into a client component. This is now fixed.

### Remaining non-code prerequisites
- SMTP production credentials still need real live verification
- Alipay / WeChat live merchant credentials and callback material are still pending
- ICP / legal / AIGC / cross-border data confirmation remain external go-live blockers
- Redis is not configured in this local rehearsal environment; production should not ship without the intended Redis topology

### Remaining engineering debt
- 3 historical lint warnings remain
- Prisma CLI config still uses deprecated `package.json#prisma`
- The Playwright suite is not a valid production-like release gate on this shared machine without an isolated server/port/database setup; local rehearsal used targeted browser walkthroughs instead

## Release Readiness Judgment

### Ready for RC
Yes.

The repository is fit to cut `v7.0.0-rc.1` because:
- v7.0 product scope is implemented
- production build passes
- fresh-schema deployment path passes
- critical user and admin flows were manually validated end-to-end
- release-candidate branch/tag can be cut from this state

### Not yet ready for public live rollout
Not yet.

Live rollout still depends on:
- real production secrets
- SMTP live validation
- China payment live merchant setup
- compliance/legal confirmations
- Redis-backed production topology

## Recommended next action after RC
- Freeze scope on `release/v7.0-rc1`
- Allow only blocker fixes into the RC branch
- Complete external go-live prerequisites before promoting the RC to a final release
