# VibeHub P0 Compliance Checklist

Last updated: April 16, 2026

This file tracks the China launch items that must be reviewed outside normal feature delivery.

## Completed in product

- Email-first registration and login flow
- Privacy policy page
- Terms of service page
- Platform rules page
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
- Incident contact and abuse escalation path confirmed
- Data deletion and restoration procedure documented for operators
