// Sends email via a transactional HTTP API (Postmark or Resend) -- no SMTP,
// no mail server to configure. Provider is chosen via MAIL_PROVIDER
// ("postmark", the default, or "resend"); only that provider's API key env
// var needs to be set.

// Bounds how long a single mail-provider call can run. Without this, a
// slow/hanging provider could run past the handler's remaining time budget
// (see ATTACHMENT_UPLOAD_DEADLINE_MS in api/mission-intake.js -- the backup
// and confirmation emails run sequentially after that budget is spent).
const MAIL_TIMEOUT_MS = 6000;

async function fetchOrTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      const timeoutErr = new Error("Mail request timed out");
      timeoutErr.code = "MAIL_TIMEOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function toPostmarkAttachments(attachments) {
  return (attachments || []).map((a) => ({
    Name: a.filename,
    Content: a.base64,
    ContentType: a.contentType || "application/octet-stream"
  }));
}

async function sendViaPostmark({ to, from, subject, text, attachments }, { apiToken, fetchImpl, timeoutMs }) {
  const resp = await fetchOrTimeout(fetchImpl, "https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": apiToken
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: subject,
      TextBody: text,
      Attachments: toPostmarkAttachments(attachments)
    })
  }, timeoutMs);
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(`Postmark send failed (${resp.status})`);
    err.code = `POSTMARK_SEND_FAILED_${resp.status}`;
    throw err;
  }
  return { messageId: body.MessageID };
}

function toResendAttachments(attachments) {
  return (attachments || []).map((a) => ({
    filename: a.filename,
    content: a.base64
  }));
}

async function sendViaResend({ to, from, subject, text, attachments }, { apiKey, fetchImpl, timeoutMs }) {
  const resp = await fetchOrTimeout(fetchImpl, "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      attachments: toResendAttachments(attachments)
    })
  }, timeoutMs);
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(`Resend send failed (${resp.status})`);
    err.code = `RESEND_SEND_FAILED_${resp.status}`;
    throw err;
  }
  return { messageId: body.id };
}

// sendEmail({to, from, subject, text, attachments}) -> { messageId }
// Throws on failure -- callers decide whether that's fatal for the request.
export async function sendEmail(message, { fetchImpl = fetch, timeoutMs = MAIL_TIMEOUT_MS } = {}) {
  const provider = (process.env.MAIL_PROVIDER || "postmark").toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const err = new Error("RESEND_API_KEY is not configured");
      err.code = "MAIL_PROVIDER_NOT_CONFIGURED";
      throw err;
    }
    return sendViaResend(message, { apiKey, fetchImpl, timeoutMs });
  }

  const apiToken = process.env.POSTMARK_API_TOKEN;
  if (!apiToken) {
    const err = new Error("POSTMARK_API_TOKEN is not configured");
    err.code = "MAIL_PROVIDER_NOT_CONFIGURED";
    throw err;
  }
  return sendViaPostmark(message, { apiToken, fetchImpl, timeoutMs });
}
