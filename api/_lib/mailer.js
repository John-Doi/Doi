// Sends email via a transactional HTTP API (Postmark or Resend) -- no SMTP,
// no mail server to configure. Provider is chosen via MAIL_PROVIDER
// ("postmark", the default, or "resend"); only that provider's API key env
// var needs to be set.

function toPostmarkAttachments(attachments) {
  return (attachments || []).map((a) => ({
    Name: a.filename,
    Content: a.base64,
    ContentType: a.contentType || "application/octet-stream"
  }));
}

async function sendViaPostmark({ to, from, subject, text, attachments }, { apiToken, fetchImpl }) {
  const resp = await fetchImpl("https://api.postmarkapp.com/email", {
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
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Postmark send failed (${resp.status}): ${body.Message || "unknown error"}`);
  }
  return { messageId: body.MessageID };
}

function toResendAttachments(attachments) {
  return (attachments || []).map((a) => ({
    filename: a.filename,
    content: a.base64
  }));
}

async function sendViaResend({ to, from, subject, text, attachments }, { apiKey, fetchImpl }) {
  const resp = await fetchImpl("https://api.resend.com/emails", {
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
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Resend send failed (${resp.status}): ${body.message || "unknown error"}`);
  }
  return { messageId: body.id };
}

// sendEmail({to, from, subject, text, attachments}) -> { messageId }
// Throws on failure -- callers decide whether that's fatal for the request.
export async function sendEmail(message, { fetchImpl = fetch } = {}) {
  const provider = (process.env.MAIL_PROVIDER || "postmark").toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    return sendViaResend(message, { apiKey, fetchImpl });
  }

  const apiToken = process.env.POSTMARK_API_TOKEN;
  if (!apiToken) throw new Error("POSTMARK_API_TOKEN is not configured");
  return sendViaPostmark(message, { apiToken, fetchImpl });
}
