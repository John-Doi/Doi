import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import {
  validateSubmission,
  validateAttachments,
  buildSubject,
  buildIntakeJson,
  buildIntakeEmailBody,
  buildClientConfirmationEmail
} from "./_lib/intake.js";

const MAX_LEN = 2000;
const MAX_NOTES_LEN = 4000;

// ── IN-MEMORY RATE LIMIT ──
// Best-effort only: this Map lives for the lifetime of one warm serverless
// instance. Vercel can run several instances concurrently and recycles cold
// ones, so a determined client can exceed this by landing on a fresh
// instance. It stops casual retry-loops and simple scripts; it is not a
// substitute for an edge/WAF-level rate limit if abuse becomes a real
// problem (e.g. Vercel's own rate limiting, or a shared store like Upstash).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitHits = new Map(); // ip -> timestamps[]

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (rateLimitHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateLimitHits.set(ip, hits);
  // Bound memory growth across many distinct IPs on a long-lived warm instance.
  if (rateLimitHits.size > 5000) rateLimitHits.clear();
  return hits.length > RATE_LIMIT_MAX;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha not configured -- treat as not required
  if (!token) return false;
  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip })
    });
    const data = await resp.json();
    return Boolean(data && data.success);
  } catch (err) {
    console.error("[mission-intake] Turnstile verification error:", err.message);
    return false;
  }
}

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass }
  });
}

function toNodemailerAttachments(attachments) {
  return (Array.isArray(attachments) ? attachments : []).map((a) => ({
    filename: a.filename,
    content: a.base64,
    encoding: "base64",
    contentType: a.contentType || undefined
  }));
}

// Core request handling, factored out from the Vercel entry point so it can
// be exercised in tests with a fake transport/clock instead of real SMTP --
// see tests/mission-intake.test.mjs. `deps` defaults to the real
// implementations used in production.
export async function handleIntakeRequest(req, res, deps = {}) {
  const transport = deps.transport !== undefined ? deps.transport : buildTransport();
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

  if (!transport) {
    console.error("[mission-intake] SMTP env vars not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)");
    return res.status(503).json({ success: false, error: "Service unavailable" });
  }

  try {
    const body = req.body || {};

    // ── HONEYPOT ──
    // Hidden field real users never see or fill. Any non-empty value here is
    // almost certainly a bot. Respond with the same shape a real success
    // would use so the bot has no signal to adapt on, and skip sending mail
    // entirely. Logged without any of the submitted field values.
    if (typeof body.hp_website === "string" && body.hp_website.trim()) {
      console.warn("[mission-intake] honeypot triggered, dropping submission from ip:", ip);
      return res.status(200).json({ success: true });
    }

    const fields = {
      client: String(body.client || "").slice(0, MAX_LEN),
      organization: String(body.organization || "").slice(0, MAX_LEN),
      site_address: String(body.site_address || "").slice(0, MAX_LEN),
      mission_type: String(body.mission_type || "").slice(0, MAX_LEN),
      requested_window: String(body.requested_window || "").slice(0, MAX_LEN),
      deliverables: String(body.deliverables || "").slice(0, MAX_LEN),
      contact_name: String(body.contact_name || "").slice(0, MAX_LEN),
      contact_phone: String(body.contact_phone || "").slice(0, MAX_LEN),
      contact_email: String(body.contact_email || "").slice(0, MAX_LEN),
      site_access_notes: String(body.site_access_notes || "").slice(0, MAX_LEN),
      notes: String(body.notes || "").slice(0, MAX_NOTES_LEN),
      extraContext: String(body.extraContext || "").slice(0, MAX_NOTES_LEN)
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

    const submissionId = uuid();
    const submittedAtUtc = now().toISOString();
    const intakeJson = buildIntakeJson(fields, { submissionId, submittedAtUtc });
    const subject = buildSubject(fields);
    const intakeBodyText = buildIntakeEmailBody(fields, intakeJson);

    const intakeTo = process.env.INTAKE_TO || "johnktoles@doilabs.la";
    const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER;

    await transport.sendMail({
      from: mailFrom,
      to: intakeTo,
      replyTo: fields.contact_email || undefined,
      subject,
      text: intakeBodyText,
      attachments: toNodemailerAttachments(attachments)
    });

    // Client confirmation is best-effort: the intake email above is the
    // record of the request, so a failure here is logged but does not fail
    // the request back to the client.
    if (fields.contact_email) {
      try {
        const confirmation = buildClientConfirmationEmail(fields);
        await transport.sendMail({
          from: mailFrom,
          to: fields.contact_email,
          subject: confirmation.subject,
          text: confirmation.text
        });
      } catch (err) {
        console.error("[mission-intake] confirmation email failed, submission_id:", submissionId, "error:", err.message);
      }
    }

    // No mission ID / reference number is generated or returned -- the
    // client sees only confirmation that the request was received.
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[mission-intake] Server error:", error.message);
    return res.status(502).json({
      success: false,
      error: "We couldn't send your request right now. Please try again in a moment or contact us directly."
    });
  }
}

export default async function handler(req, res) {
  return handleIntakeRequest(req, res);
}
