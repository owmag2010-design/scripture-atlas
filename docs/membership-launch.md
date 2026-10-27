# Ereunia membership launch contract

Approved product boundary: Bible reading is free. Advanced Pastor and Kids tools are the future subscription products. Each tool plan has a 14-day trial without a payment card. No charge may occur automatically after a cardless trial.

## Current release

- Cited research and pastor drafting assistance run through the existing Netlify AI Gateway and Anthropic service.
- Sermon records, recordings, transcripts and recovery versions remain local to the browser. Membership signup and paid checkout are disabled; /api/membership reports this explicitly.
- The membership page explains the proposed plans. The current tools remain available in preview. A local timer is not used to claim or enforce a trial.
- public/js/membership.js contains the access policy for a trusted server-loaded account record. It is not yet an account system or a paid access gate.

## Before opening signups

1. Connect a dedicated Ereunia account database and email verification service. Do not reuse the GIH customer database. Adults hold Pastor and Kids memberships; no child email account is required.
2. Create immutable account trial-start records per product in the database, using server time and a uniqueness constraint. Verify ownership and email before starting the trial. Never trust browser timestamps, client-editable metadata or a supplied account ID for entitlements.
3. Add authenticated ownership policies for optional cloud manuscripts and recordings. Existing local work must be imported only with the user’s explicit choice. Provide data export independently of tool access.
4. Apply toolAccess only after loading entitlements on the server. Gate the paid server endpoints and enforce account-based AI allowances. Bible text routes and the Kids Bible reader must remain outside the paid gate. Trial expiry should preserve read/download access to the user's existing work.
5. Publish approved monthly/yearly prices, currency, cancellation terms and tool limits. These have not been set. Use hosted subscription checkout and a customer billing portal; validate signed payment webhooks and process them idempotently. The account database is the authority for verified entitlements.
6. Verify signup, verification email, trial start, day-14 expiry, plan isolation, paid checkout, cancellation, refunds, duplicate webhooks, exports and free Bible access end to end in an isolated payment sandbox before enabling live billing.

Do not replace the disabled signup state with a decorative button, browser-only trial counter or checkout success URL as proof of payment.
