# DØi Labs Website

Single-file marketing site (`index.html`) deployed on Vercel, plus a small set
of serverless functions in `api/`. No build step, no bundler.

## Mission Intake Delivery

`POST /api/mission-intake` handles the "Deploy Recon Division" mission
request form (`#contact` in `index.html`). Each submission goes through two
independent paths:

1. **Primary: DØi's intake endpoint** (an Azure Function). The server posts
   the structured JSON record to `INTAKE_ENDPOINT_URL`, authenticated with
   `X-DOI-Intake-Key: <INTAKE_WEB_KEY>`. The key never reaches the browser —
   this call happens only in `api/mission-intake.js`, server-side. On a
   network error, timeout, or any 5xx (503 included) it's retried **once**,
   reusing the exact same payload (same `submission_id`), before falling
   back to the backup email below.
2. **Backup / notification email — always sent**, regardless of whether the
   endpoint call succeeded, failed, or wasn't configured at all. This is the
   durable record: a short readable summary plus the same JSON block sent to
   the endpoint, with two extra fields that only ever appear in this email —
   `intake_ref` (the endpoint's internal reference, or `"NOT LOGGED"`) and
   `endpoint_status` (what the endpoint call actually returned). Sent via
   Postmark or Resend's HTTP API — no SMTP, no mail server to configure.

A separate, best-effort **client confirmation email** also goes out: it
thanks them and says DØi will review and follow up. It never promises dates,
availability, pricing, FAA/airspace approval, or results, and it never
mentions `intake_ref` or anything else. The client-facing success panel
never shows a mission ID — only **"Request received."**

Nothing is written to SharePoint, Microsoft Graph, or any other DØi internal
system directly — the Azure intake endpoint is the only integration, and the
backup email is a plain transactional send, not a write into any DØi system.

### How each endpoint outcome is handled

| Endpoint result | Backup email sent? | What the client sees |
|---|---|---|
| 201 (new submission) + `status:"received"` | yes | `{success:true}` → "Request received" |
| 200 (duplicate `submission_id`, already received) + `status:"received"` | yes | `{success:true}` → "Request received" |
| 400 (endpoint-side validation) | yes | 400 with field errors |
| 401 (bad/missing key) | yes | logged as a `CONFIG ERROR` for ops; client still sees success (the email is the record) |
| 429 (endpoint throttling) | yes | **429, "please try again in a few minutes"** — the one case that isn't shown as success |
| 503, or timeout, or any other 5xx — retried once, still failing | yes | `{success:true}` → "Request received" (the retried failure falls back to the email) |
| endpoint not configured at all | yes | same as 401 — logged, client still sees success |

If the backup email **also** fails (on top of the endpoint failing), that's
the one real failure: the client sees a 502 with a friendly retry message,
since nothing durable happened for that submission.

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `INTAKE_ENDPOINT_URL` | no | Defaults to the production Azure Function URL. Override only for pointing at a different environment. |
| `INTAKE_WEB_KEY` | yes | Sent as `X-DOI-Intake-Key`. Never put this (or anything like it) in client JS or a `NEXT_PUBLIC_*` var. |
| `MAIL_PROVIDER` | no (default `postmark`) | `postmark` or `resend` |
| `POSTMARK_API_TOKEN` | yes, if using Postmark | Server token for the Postmark server sending this mail |
| `RESEND_API_KEY` | yes, if using Resend | API key |
| `MAIL_FROM` | no (default `intake@doilabs.la`) | From address for both emails |
| `INTAKE_TO` | no (default `johnktoles@doilabs.la`) | Where the backup/notification email is delivered, until `intake@doilabs.la` exists |
| `TURNSTILE_SITE_KEY` | no | Public Cloudflare Turnstile site key; served to the browser via `GET /api/captcha-config`. Omit to skip the captcha widget entirely. |
| `TURNSTILE_SECRET_KEY` | no | Server-side Turnstile secret. If unset, captcha verification is skipped (treated as not required) even if a token is sent. |

Set these in the Vercel project's environment variables, never in a
committed file.

### Spam / abuse protection

- **Honeypot**: a hidden `hp_website` field real users never see. Any
  non-empty value is treated as a bot and the request is silently dropped
  before the endpoint or mailer are ever touched (the API still returns
  `{ success: true }` so the bot gets no signal to adapt on).
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
both client-side (`index.html`) and server-side (`api/_lib/intake.js`).
**Attachment content is only ever sent to the backup email, never to the
intake endpoint** — the endpoint's JSON payload carries filenames only.
Attachments are never stored anywhere public.

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

Runs (Node's built-in test runner, no extra dependency, no network calls):

- `tests/intake-endpoint.test.mjs` — the Azure call itself: 201 (new), 200
  (duplicate submission_id), 400, 503 (retried once, same payload, falls
  back), a transient 500 (same), a timeout that succeeds on retry, a
  timeout that fails twice, and missing config.
- `tests/mission-intake.test.mjs` — the full handler with the endpoint and
  mailer both faked: every row of the outcome table above, the exact
  subject/JSON shape (including the email-only `intake_ref` /
  `endpoint_status` fields and `"NOT PROVIDED"` fallbacks), the client
  confirmation's tone, required-field validation, the honeypot drop path,
  rate limiting, that attachment file contents never reach the intake
  endpoint, and that the HTTP response to the browser never contains
  anything resembling a mission ID.

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
  backup email's plain-text summary (Part A) so that context isn't silently
  lost, even though they're not keys in the structured JSON block.
- `doilabs-v2.html` (an archived alternate version of the site, not linked
  from `index.html` or routed in `vercel.json`/`sitemap.xml`) also posts to
  `/api/mission-intake`, with older field names from before this and the
  prior intake-delivery change. It isn't part of the live site, so it
  wasn't updated, but its form would fail validation if loaded directly.
