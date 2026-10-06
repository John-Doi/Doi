import { randomUUID, createHash, createHmac } from "node:crypto";
import {
  validateSubmission,
  validateAttachments,
  buildSubject,
  buildIntakeJson,
  buildBackupEmailBody,
  buildClientConfirmationEmail,
  isValidUuid,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES
} from "./_lib/intake.js";
import { callIntakeEndpoint as realCallIntakeEndpoint } from "./_lib/intake-endpoint.js";
import { uploadAttachment as realUploadAttachment } from "./_lib/intake-attachment.js";
import { sendEmail as realSendEmail } from "./_lib/mailer.js";

const DEFAULT_INTAKE_ENDPOINT_URL =
  "https://func-doi-int-prod-8585-eydjf7gtbacwh0fs.westus2-01.azurewebsites.net/api/intake/web";

// Deadline for sequential attachment uploads is measured from handler
// entry, not from when uploads start -- the intake-record call itself can
// take up to 20s (10s timeout + one retry), so a budget measured only
// across the upload loop doesn't bound total runtime against the 60s
// maxDuration (vercel.json). 45s leaves ~15s for the backup/confirmation
// emails and the response.
const ATTACHMENT_UPLOAD_DEADLINE_MS = 45000;
// Below this much remaining time, don't even start a file (a single
// attempt can take up to its timeoutMs) or a retry (attemptOnce + its
// own timeout needs a few seconds of headroom to be worth it).
const MIN_REMAINING_FOR_UPLOAD_MS = 3000;

// ── IN-MEMORY RATE LIMIT ──
// Best-effort only: see README -- this Map lives for the lifetime of one
// warm serverless instance, not a durable shared store.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (rateLimitHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateLimitHits.set(ip, hits);
  if (rateLimitHits.size > 5000) rateLimitHits.clear();
  return hits.length > RATE_LIMIT_MAX;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

// A short fingerprint for correlating repeated activity from the same IP
// across log lines without ever logging the raw address. HMAC'd with
// LOG_HASH_SALT when set -- plain SHA-256 of an IPv4 address is reversible
// by simply enumerating the ~4 billion possible inputs, so an unsalted hash
// isn't actually non-reversible. Falls back to plain SHA-256 (still useful
// for correlation, just not collision/enumeration-resistant) if no salt is
// configured, so this doesn't become a hard requirement to deploy.
function fingerprintIp(ip) {
  const salt = process.env.LOG_HASH_SALT;
  const hash = salt ? createHmac("sha256", salt) : createHash("sha256");
  return hash.update(String(ip)).digest("hex").slice(0, 8);
}

function mailErrorCode(err) {
  return (err && err.code) || "MAIL_SEND_ERROR";
}

const TURNSTILE_TIMEOUT_MS = 5000;

// fetchImpl/timeoutMs are injectable so tests can exercise the timeout path
// directly without waiting out a real 5s; production always uses the
// defaults. On timeout, the AbortError lands in the catch below and returns
// false -- the same fail-closed behavior as any other verification error.
export async function verifyTurnstile(token, ip, { fetchImpl = fetch, timeoutMs = TURNSTILE_TIMEOUT_MS } = {}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha not configured -- treat as not required
  if (!token) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: controller.signal
    });
    const data = await resp.json();
    return Boolean(data && data.success);
  } catch (err) {
    console.error("[mission-intake] Turnstile verification error:", err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Core request handling, factored out so tests can inject fakes for the
// Azure endpoint call and the mailer instead of touching the network --
// see tests/mission-intake.test.mjs. `deps` defaults to the real
// implementations used in production.
export async function handleIntakeRequest(req, res, deps = {}) {
  // Real wall-clock time, deliberately NOT the injectable `now()` below
  // (that's for submittedAtUtc semantics and may be fixed/fake in tests) --
  // this deadline has to track actual elapsed time so it bounds real
  // runtime against Vercel's maxDuration.
  const handlerStart = Date.now();
  const uploadDeadline = handlerStart + ATTACHMENT_UPLOAD_DEADLINE_MS;
  const callIntakeEndpoint = deps.callIntakeEndpoint || realCallIntakeEndpoint;
  const uploadAttachment = deps.uploadAttachment || realUploadAttachment;
  const sendEmail = deps.sendEmail || realSendEmail;
  const verifyCaptcha = deps.verifyCaptcha || verifyTurnstile;
  const now = deps.now || (() => new Date());
  const uuid = deps.uuid || randomUUID;
  const rateLimited = deps.rateLimited !== undefined ? deps.rateLimited : isRateLimited;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (rateLimited(ip)) {
    return res.status(429).json({ success: false, error: "Too many requests. Please try again later." });
  }

  // ── TURNSTILE CONFIG SANITY CHECK ──
  // Exactly one of the pair set is a misconfiguration, not "captcha
  // disabled" -- failing open here would silently skip captcha protection
  // on a deploy where someone only set one of the two env vars.
  const turnstileSecretSet = Boolean(process.env.TURNSTILE_SECRET_KEY);
  const turnstileSiteSet = Boolean(process.env.TURNSTILE_SITE_KEY);
  if (turnstileSecretSet !== turnstileSiteSet) {
    console.error("[mission-intake] CONFIG ERROR: TURNSTILE_SECRET_KEY/TURNSTILE_SITE_KEY mismatched -- exactly one is set");
    return res.status(503).json({ success: false, error: "Service temporarily unavailable. Please try again shortly or contact us directly." });
  }

  const body = req.body || {};

  // ── HONEYPOT ──
  // Hidden field real users never see or fill. Any non-empty value is
  // almost certainly a bot -- respond with the same shape a real success
  // would use, skip the endpoint call and both emails. Logged with a
  // short IP fingerprint only, never the raw address.
  if (typeof body.hp_website === "string" && body.hp_website.trim()) {
    console.warn("[mission-intake] honeypot triggered, ip_fp:", fingerprintIp(ip));
    return res.status(200).json({ success: true });
  }

  const fields = {
    client: String(body.client || "").slice(0, FIELD_LIMITS.client),
    organization: String(body.organization || "").slice(0, FIELD_LIMITS.organization),
    site_address: String(body.site_address || "").slice(0, FIELD_LIMITS.site_address),
    mission_type: String(body.mission_type || "").slice(0, FIELD_LIMITS.mission_type),
    requested_window: String(body.requested_window || "").slice(0, FIELD_LIMITS.requested_window),
    deliverables: String(body.deliverables || "").slice(0, FIELD_LIMITS.deliverables),
    contact_name: String(body.contact_name || "").slice(0, FIELD_LIMITS.contact_name),
    contact_phone: String(body.contact_phone || "").slice(0, FIELD_LIMITS.contact_phone),
    contact_email: String(body.contact_email || "").slice(0, FIELD_LIMITS.contact_email),
    site_access_notes: String(body.site_access_notes || "").slice(0, FIELD_LIMITS.site_access_notes),
    notes: String(body.notes || "").slice(0, FIELD_LIMITS.notes),
    extraContext: String(body.extraContext || "").slice(0, FIELD_LIMITS.extraContext)
  };

  const { valid, errors } = validateSubmission(fields);
  if (!valid) {
    return res.status(400).json({ success: false, error: "Validation failed", errors });
  }

  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const attCheck = validateAttachments(attachments);
  if (!attCheck.valid) {
    return res.status(400).json({ success: false, error: "Validation failed", errors: attCheck.errors });
  }

  const captchaOk = await verifyCaptcha(body.captchaToken, ip);
  if (!captchaOk) {
    return res.status(400).json({ success: false, error: "Captcha verification failed" });
  }

  fields.attachmentFilenames = attachments.map((a) => a.filename);

  // The client generates submission_id once per form fill and resends the
  // same value on a retry (e.g. after a 429/422) so a resubmission is
  // recognized as a duplicate rather than a new request. A missing or
  // malformed value falls back to a server-generated one rather than
  // failing the request.
  const submissionId = isValidUuid(body.submission_id) ? body.submission_id.trim() : uuid();
  const submittedAtUtc = now().toISOString();
  const azurePayload = buildIntakeJson(fields, { submissionId, submittedAtUtc });

  const payloadBytes = Buffer.byteLength(JSON.stringify(azurePayload), "utf8");
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({
      success: false,
      error: "Your submission is too large. Please shorten your details and try again."
    });
  }

  // ── PRIMARY PATH: the intake endpoint. Attachment CONTENT never goes
  // here -- only filenames (already in azurePayload.attachments). ──
  const endpointResult = await callIntakeEndpoint(azurePayload, {
    url: process.env.INTAKE_ENDPOINT_URL || DEFAULT_INTAKE_ENDPOINT_URL,
    apiKey: process.env.INTAKE_WEB_KEY
  });

  if (endpointResult.configMissing) {
    console.error("[mission-intake] CONFIG ERROR: INTAKE_ENDPOINT_URL/INTAKE_WEB_KEY not set, submission_id:", submissionId);
  } else if (endpointResult.status === 401) {
    console.error("[mission-intake] CONFIG ERROR: endpoint rejected credentials (401), submission_id:", submissionId);
  } else if (!endpointResult.ok) {
    console.error(
      "[mission-intake] intake endpoint did not succeed, submission_id:", submissionId,
      "status:", endpointResult.status, "retried:", endpointResult.retried
    );
  }

  // ── ATTACHMENT UPLOADS ──
  // Only once the intake record itself exists (ok + an intake_ref to tag
  // every file to) -- if the row failed, there's nothing to attach these
  // to, so uploads are skipped entirely and existing behavior (attachment
  // content only reaches the backup email) is unchanged. Sequential, not
  // parallel, within an overall time budget well under maxDuration.
  let attachmentResults = null;
  if (endpointResult.ok && endpointResult.intakeRef && attachments.length > 0) {
    attachmentResults = [];
    const attachUrl = process.env.INTAKE_ATTACH_URL
      || `${process.env.INTAKE_ENDPOINT_URL || DEFAULT_INTAKE_ENDPOINT_URL}/attachment`;
    for (const att of attachments) {
      const remaining = uploadDeadline - Date.now();
      if (remaining < MIN_REMAINING_FOR_UPLOAD_MS) {
        // Not enough time left to even attempt this file -- treat it (and
        // everything after it) as not stored rather than risk running past
        // maxDuration. status:0 matches the existing network/timeout
        // convention (see intake-endpoint.js).
        attachmentResults.push({ filename: att.filename, ok: false, status: 0 });
        continue;
      }
      const result = await uploadAttachment(att, {
        submissionId,
        intakeRef: endpointResult.intakeRef,
        url: attachUrl,
        apiKey: process.env.INTAKE_WEB_KEY,
        timeoutMs: Math.min(10000, remaining),
        deadline: uploadDeadline
      });
      attachmentResults.push({ filename: att.filename, ok: result.ok, status: result.status });
    }
    // Status codes and a count only -- never filenames, IPs, or bodies.
    console.log(
      "[mission-intake] attachment uploads, submission_id:", submissionId,
      "count:", attachments.length,
      "statuses:", attachmentResults.map((r) => r.status)
    );
  }

  // ── BACKUP / NOTIFICATION EMAIL: always sent, regardless of the
  // endpoint's outcome -- this is the durable record of the request. ──
  const subject = buildSubject(fields);
  const backupBodyText = buildBackupEmailBody(fields, azurePayload, {
    intakeRef: endpointResult.intakeRef,
    endpointStatus: endpointResult.status,
    attachmentResults
  });
  const intakeTo = process.env.INTAKE_TO || "johnktoles@doilabs.la";
  const mailFrom = process.env.MAIL_FROM || "intake@doilabs.la";

  let backupEmailFailed = false;
  try {
    await sendEmail({
      to: intakeTo,
      from: mailFrom,
      subject,
      text: backupBodyText,
      attachments
    });
  } catch (err) {
    backupEmailFailed = true;
    console.error("[mission-intake] backup email failed, submission_id:", submissionId, "code:", mailErrorCode(err));
  }

  // Client confirmation is best-effort on top of an already-best-effort
  // backup email: never let it change the response to the browser.
  if (fields.contact_email) {
    try {
      const confirmation = buildClientConfirmationEmail(fields);
      await sendEmail({ to: fields.contact_email, from: mailFrom, subject: confirmation.subject, text: confirmation.text });
    } catch (err) {
      console.error("[mission-intake] confirmation email failed, submission_id:", submissionId, "code:", mailErrorCode(err));
    }
  }

  // ── CLIENT-FACING RESPONSE ──
  // Nothing here ever includes intake_ref or anything that looks like a
  // mission ID -- only a plain success/failure signal.
  if (endpointResult.ok) {
    const attachmentsFailed = (attachmentResults || [])
      .filter((r) => !r.ok)
      .map((r) => r.filename);
    if (attachmentsFailed.length > 0) {
      return res.status(200).json({ success: true, attachmentsFailed });
    }
    return res.status(200).json({ success: true });
  }

  if (endpointResult.status === 400 || endpointResult.status === 422) {
    // The endpoint rejected the data itself. The backup email above still
    // went out (so DOi has a record), but the client needs to know
    // something about their submission needs attention.
    return res.status(endpointResult.status).json({
      success: false,
      error: "Validation failed",
      errors: endpointResult.errors || ["Your request could not be processed. Please check your details and try again."]
    });
  }

  if (endpointResult.status === 413) {
    return res.status(413).json({
      success: false,
      error: "Your request is too large. Please shorten your details or remove attachments and try again."
    });
  }

  if (endpointResult.status === 429) {
    // Endpoint-side throttling, not the client's fault -- but per spec this
    // is the one case where we don't just say "received" even though the
    // backup email was sent.
    return res.status(429).json({ success: false, error: "Please try again in a few minutes." });
  }

  if (backupEmailFailed) {
    // Both the primary endpoint AND the backup email failed -- nothing
    // durable happened. This is the one real failure case.
    return res.status(502).json({
      success: false,
      error: "We couldn't send your request right now. Please try again in a moment or contact us directly."
    });
  }

  // 401 (config error), 503 (endpoint switched off), 5xx/timeout after one
  // retry, or no endpoint configured at all -- the backup email is the
  // record of this request, so the client still sees success.
  return res.status(200).json({ success: true });
}

export default async function handler(req, res) {
  return handleIntakeRequest(req, res);
}
