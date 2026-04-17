# VibeHub P0 Compliance Checklist

Last updated: April 17, 2026

This file tracks the China launch items that must be reviewed outside normal feature delivery.

## Completed in product

- Email-first registration and login flow
- Privacy policy page
- Terms of service page
- Platform rules page
- AIGC / Agent policy page
- Report submission entry for discussion posts
- Admin review pages for reports, audit logs, enterprise verification, and health
- User account deletion entry in settings

## Must confirm before formal launch

- ICP filing status and publishing entity alignment
- Real-name boundary: whether current community scope requires additional identity verification
- Cross-border data assessment for GitHub OAuth, email provider, Stripe, logging, and model providers
- Audit log retention duration by record type
- AIGC or recommendation filing obligations for the final production feature set
- Minor protection obligations and age-related restrictions, if any
- Final privacy-policy and terms wording review by counsel

## Operational prerequisites

- Production SMTP configured and tested
- Production billing provider configuration reviewed against actual go-live market
- Alipay live app ID / key pair / notify flow verified
- WeChat Pay merchant cert / API v3 key / notify flow verified if enabled for launch
- Incident contact and abuse escalation path confirmed
- Data deletion and restoration procedure documented for operators

## Production-like RC evidence (2026-04-17)

Reference: `docs/v8-rc-go-live-rehearsal-2026-04-17.md`

Confirmed by rehearsal:

- Production-like register flow fails closed without SMTP (`503 EMAIL_NOT_CONFIGURED`)
- Public/admin health correctly report `degraded` when SMTP and live payment providers are absent
- Billing checkout in production-like mode fails closed when live provider config is missing
- The remaining go-live blockers are now concrete, external items rather than missing product implementation

Current external blockers:

- SMTP credentials and delivery validation
- Alipay live merchant credentials and notify/return callback validation
- WeChat Pay merchant credentials / API v3 key / callback validation if included in launch scope
- ICP and final legal review
- AIGC / recommendation / cross-border data filing confirmation
