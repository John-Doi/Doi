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
| 400 (endpoint-side validation) | yes | 400 with field errors, read from the endpoint's `{ error: { fields: [...] } }` body |
| 422 (endpoint-side semantic validation) | yes | 422 with field errors, same shape as 400 |
| 413 (endpoint says the payload itself is too large) | yes | 413 with a "too large" message |
| 401 (bad/missing key) | yes | logged as a `CONFIG ERROR` for ops; client still sees success (the email is the record) |
| 429 (endpoint throttling) | yes | **429, "please try again in a few minutes"** — the one non-200/201/400/422/413 case that isn't shown as success |
| 503, or timeout, or any other 5xx — retried once, still failing | yes | `{success:true}` → "Request received" (the retried failure falls back to the email) |
| endpoint not configured at all | yes | same as 401 — logged, client still sees success |

If the backup email **also** fails (on top of the endpoint failing), that's
the one real failure: the client sees a 502 with a friendly retry message,
since nothing durable happened for that submission.

A request is also rejected with **413** before the endpoint is ever called
if the serialized JSON payload itself would exceed 16KB (`MAX_PAYLOAD_BYTES`
in `api/_lib/intake.js`) — per-field character limits (below) keep this from
happening with ordinary input, but they don't bound multi-byte UTF-8
characters on their own, so this is an explicit belt-and-suspenders check.

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
| `TURNSTILE_SITE_KEY` | no | Public Cloudflare Turnstile site key; served to the browser via `GET /api/captcha-config`. Omit (along with `TURNSTILE_SECRET_KEY`) to skip the captcha widget entirely. |
| `TURNSTILE_SECRET_KEY` | no | Server-side Turnstile secret. If unset along with `TURNSTILE_SITE_KEY`, captcha verification is skipped (treated as not required). |

Set these in the Vercel project's environment variables, never in a
committed file.

**`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` must both be set or both be
unset.** Having exactly one set is a misconfiguration, not "captcha
half-enabled" — the request fails closed with a 503 rather than silently
skipping captcha verification, so a deploy that only set one of the two
doesn't quietly turn off bot protection.

### Per-field limits

Every text field has its own character cap, enforced server-side in
`api/mission-intake.js` (via `FIELD_LIMITS` in `api/_lib/intake.js`, the
single source of truth) and mirrored as `maxlength` on the corresponding
`index.html` input (advisory only — the client is never trusted):

| Field | Max length |
|---|---|
| `client`, `organization`, `contact_name`, `requested_window` | 200 |
| `site_address` | 500 |
| `mission_type` | 120 |
| `contact_email` | 254 |
| `contact_phone` | 25 characters, with 7–15 digits |
| `deliverables`, `site_access_notes` | 1000 |
| `notes` | 2000 |

Empty optional fields are sent as `""` in the JSON payload posted to the
intake endpoint (not the string `"NOT PROVIDED"` — sending that literal
string into fields the endpoint expects to validate, e.g. as an email or
enum, is what produced some of the 422s this was fixed in response to).
`"NOT PROVIDED"` is still used, but only in the backup email's human-read
prose summary (Part A) — never in the structured JSON block, which mirrors
exactly what was sent to the endpoint.

`contact_name` is now a required field (previously only client-or-organization
and contact email-or-phone were required).

### Spam / abuse protection

- **Honeypot**: a hidden `hp_website` field real users never see. Any
  non-empty value is treated as a bot and the request is silently dropped
  before the endpoint or mailer are ever touched (the API still returns
  `{ success: true }` so the bot gets no signal to adapt on). Logged with a
  short, non-reversible IP fingerprint (`ip_fp`, a truncated SHA-256) rather
  than the raw IP address.
- **Rate limiting**: a basic in-memory limiter (5 submissions / 10 minutes
  per IP) inside `api/mission-intake.js`. **This is best-effort, not a hard
  guarantee** — the Map only lives for the lifetime of one warm Vercel
  serverless instance, and Vercel can run multiple instances or recycle a
  cold one at any time. If abuse becomes a real problem, replace this with
  an edge/WAF-level limiter or a shared store (e.g. Upstash Redis, Vercel's
  own rate limiting).
- **Captcha**: optional Cloudflare Turnstile, wired end-to-end but inert
  until `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` are set (both, not
  just one — see above).

### Attachments

Optional, PDF/JPG/JPEG/PNG/HEIC only, **3MB per file / 3MB total**,
validated both client-side (`index.html`) and server-side
(`api/_lib/intake.js`). **Attachment content is only ever sent to the
backup email, never to the intake endpoint** — the endpoint's JSON payload
carries filenames only. Attachments are never stored anywhere public.

Filenames are rendered in the attachment list via DOM `textContent`, never
`innerHTML` — a filename is fully attacker-controlled (nothing stops someone
naming a file `<img src=x onerror=...>`) and must never be parsed as markup.

### Submission ID and retries

`submission_id` is generated **client-side**, once per form fill (when
`index.html`'s script runs — this page is never navigated away from without
a reload), not freshly on every POST. If a submission is rejected with a
429 or 422 and the visitor resubmits without reloading, the retry carries
the *same* `submission_id`, so DØi's systems can recognize it as the same
request rather than a new one. The server validates the client-provided
value is a well-formed UUID and falls back to generating its own if it's
missing or malformed, so a tampered or absent value never fails the
request outright.

### Logging

Failures are logged server-side with enough to correlate and triage, but
never full PII, secrets, or raw provider error text:

- The honeypot path logs a short IP fingerprint (`ip_fp`), never the raw
  client IP.
- Mail provider failures (`api/_lib/mailer.js`) log a short `.code` (e.g.
  `POSTMARK_SEND_FAILED_422`), never `err.message` — a provider's error
  text can echo back request details (recipient address, body excerpts)
  that shouldn't end up in logs.
- Endpoint-call failures log the HTTP status and `submission_id` only.

**Known platform constraint:** Vercel's default Node.js Serverless Function
request body limit is much smaller than the old 25MB attachment budget was
(historically ~4.5MB), which was part of why attachments were cut to 3MB
total. Base64 encoding also adds ~33% overhead on top of the raw file size.
Confirm Vercel's current limit for this project's plan before assuming even
3MB always fits comfortably.

`vercel.json` sets `maxDuration: 60` for `api/mission-intake.js` specifically
(not the whole project) — the Azure call (up to 10s, once retried = up to
20s) plus up to two email sends needs more headroom than Vercel's default.

### Tests

```
npm test
```

Runs (Node's built-in test runner, no extra dependency, no network calls):

- `tests/intake.test.mjs` — the pure helpers: phone/UUID validation
  (including the 7–15 digit and 25-character bounds), `contact_name` now
  being required, `orEmptyString` vs `orNotProvided`, and `FIELD_LIMITS` /
  `MAX_PAYLOAD_BYTES` matching this doc.
- `tests/intake-endpoint.test.mjs` — the Azure call itself: 201 (new), 200
  (duplicate submission_id), 400 and 422 (errors read from `error.fields`,
  not a top-level `errors` key), 413, 503 (retried once, same payload, falls
  back), a transient 500 (same), a timeout that succeeds on retry, a
  timeout that fails twice, and missing config.
- `tests/mission-intake.test.mjs` — the full handler with the endpoint and
  mailer both faked: every row of the outcome table above (including 422
  and 413), the exact subject/JSON shape (including the email-only
  `intake_ref` / `endpoint_status` fields and `""` vs `"NOT PROVIDED"`
  fallbacks), the client confirmation's tone, required-field validation,
  the honeypot drop path (and that it logs a fingerprint, never the raw
  IP), rate limiting, the mismatched-Turnstile-env config error, the
  16KB payload guard (via multi-byte UTF-8 padding, which defeats
  per-field character limits alone), `submission_id` reuse vs fallback,
  mailer failures logging a `.code` and never the raw message, that
  attachment file contents never reach the intake endpoint, and that the
  HTTP response to the browser never contains anything resembling a
  mission ID.

### Known gaps / mapping notes

- The form has one combined "Project Description" field; it maps to the
  intake JSON's `notes`. There's no separate site-access-notes field today,
  so `site_access_notes` is always `""` unless a future form change adds
  one — this is intentional (never guessing at data that wasn't collected),
  not a bug.
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
