# DØi Labs Website

Single-file marketing site (`index.html`) deployed on Vercel, plus a small set
of serverless functions in `api/`. No build step, no bundler.

## Mission Intake Email Delivery

`POST /api/mission-intake` handles the "Deploy Recon Division" mission
request form (`#contact` in `index.html`). On a valid submission it sends:

1. **One intake email** to `INTAKE_TO` (defaults to `johnktoles@doilabs.la`
   until `intake@doilabs.la` exists) with subject
   `[WEB INTAKE] <Client or Organization> – <Mission Type>` and a body made
   of a short readable summary (Part A) followed by a fenced ` ```json ` block
   (Part B) with the exact shape in `api/_lib/intake.js` (`buildIntakeJson`).
2. **One client confirmation email**, best-effort, to the submitter's email —
   it thanks them and says DØi will review and follow up. It never promises
   dates, availability, pricing, FAA/airspace approval, or results, and the
   client-facing success panel never shows a mission ID or anything that
   looks like a reference number — only "Request received".

Both emails are sent server-side via SMTP (nodemailer). Nothing is sent from
the browser, and nothing is written to SharePoint, Microsoft Graph, or any
other DØi internal system — **this replaces the previous Power Automate
webhook forward** (the `POWER_AUTOMATE_WEBHOOK_URL` env var and code path
have been removed). Confirm that's the intended change before merging; the
old webhook integration is gone, not kept as a fallback.

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `SMTP_HOST` | yes | SMTP server host |
| `SMTP_PORT` | no (default `587`) | SMTP server port |
| `SMTP_SECURE` | no | `"true"` to force TLS; auto-true on port 465 |
| `SMTP_USER` | yes | SMTP auth username |
| `SMTP_PASS` | yes | SMTP auth password/app-password — **never commit this** |
| `MAIL_FROM` | no (default `SMTP_USER`) | From address for both emails |
| `INTAKE_TO` | no (default `johnktoles@doilabs.la`) | Where intake emails are delivered |
| `TURNSTILE_SITE_KEY` | no | Public Cloudflare Turnstile site key; served to the browser via `GET /api/captcha-config`. Omit to skip the captcha widget entirely. |
| `TURNSTILE_SECRET_KEY` | no | Server-side Turnstile secret. If unset, captcha verification is skipped (treated as not required) even if a token is sent. |

Set these in the Vercel project's environment variables, never in a
committed file.

### Spam / abuse protection

- **Honeypot**: a hidden `hp_website` field real users never see. Any
  non-empty value is treated as a bot and the request is silently dropped
  (the API still returns `{ success: true }` so the bot gets no signal to
  adapt on).
- **Rate limiting**: a basic in-memory limiter (5 submissions / 10 minutes
  per IP) inside `api/mission-intake.js`. **This is best-effort, not a hard
  guarantee** — the Map only lives for the lifetime of one warm Vercel
  serverless instance, and Vercel can run multiple instances or recycle a
  cold one at any time. If abuse becomes a real problem, replace this with
  an edge/WAF-level limiter or a shared store (e.g. Upstash Redis, Vercel's
  own rate limiting).
- **Captcha**: optional Cloudflare Turnstile, wired end-to-end but inert
  until `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` are set.

### Attachments

Optional, PDF/JPG/JPEG/PNG/HEIC only, 10MB per file / 25MB total, validated
both client-side (`index.html`) and server-side (`api/_lib/intake.js`), sent
as email attachments (base64 over JSON) — never stored anywhere public.

**Known platform constraint:** Vercel's default Node.js Serverless Function
request body limit is much smaller than 25MB (historically ~4.5MB). Base64
encoding also adds ~33% overhead on top of the raw file size. In practice,
total attachments much above a few MB will likely hit that platform limit
before reaching the application's own 25MB check. Confirm Vercel's current
limit for this project's plan, and/or move to a direct-to-storage upload
flow, before relying on the full 25MB in production.

### Tests

```
npm test
```

Runs `tests/mission-intake.test.mjs` (Node's built-in test runner, no extra
dependency) against `handleIntakeRequest` with a fake SMTP transport — no
network calls, no real email sent. It checks: the intake email's subject
format, the exact JSON shape of Part B (including `"NOT PROVIDED"`
fallbacks), the client confirmation's tone (no promises), required-field
validation, the honeypot drop path, rate limiting, and that the HTTP
response never contains anything resembling a mission ID.

### Known gaps / mapping notes

- The form has one combined "Project Description" field; it maps to the
  intake JSON's `notes`. There's no separate site-access-notes field today,
  so `site_access_notes` is always `"NOT PROVIDED"` unless a future form
  change adds one — this is intentional (never guessing at data that wasn't
  collected), not a bug.
- `requested_window` is the preferred date and time window joined together
  (e.g. `"2026-11-03 — Morning (6am–12pm)"`); either half may be empty.
- `contact_name` currently always matches `client` — the form only collects
  one name, so there's no separate "on-site contact" distinct from the
  client today.
- Project Name, Mission Frequency, and Urgency Level (collected by the form
  but not part of the fixed intake JSON schema) are still included in the
  email's plain-text summary (Part A) so that context isn't silently lost,
  even though they're not keys in the Part B JSON block.
