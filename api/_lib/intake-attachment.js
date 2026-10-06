// Uploads ONE attachment to DOi's attachment endpoint -- a separate call
// from the main intake record (api/_lib/intake-endpoint.js). Only called
// once that record exists (see api/mission-intake.js), since every upload
// is tagged to its submission_id/intake_ref. Currently returns 503
// INTAKE_ATTACH_DISABLED until DOi switches the feature on.

import { createHash } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 10000;
// Below this much time left before `deadline`, a retry isn't worth
// attempting -- attemptOnce needs a few seconds of headroom to be
// meaningful, not just a non-zero timeout.
const MIN_REMAINING_FOR_RETRY_MS = 3000;

function withTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function attemptOnce(fetchImpl, url, headers, bodyBuffer, timeoutMs) {
  try {
    const resp = await withTimeout(fetchImpl, url, { method: "POST", headers, body: bodyBuffer }, timeoutMs);
    let body = null;
    try { body = await resp.json(); } catch { /* non-JSON or empty body */ }
    return { status: resp.status, body, networkError: false };
  } catch (err) {
    return { status: 0, body: null, networkError: true, errorMessage: err.name === "AbortError" ? "timeout" : err.message };
  }
}

// Returns a normalized result:
//   ok        -- true only on 201 (stored) or 200 (replay -- same file
//                already stored, treated as success)
//   status    -- the HTTP status from the last attempt (0 = network/timeout)
//   filename  -- echoed back from the input, for the caller's own bookkeeping
//                (never logged -- see api/mission-intake.js)
//   disabled  -- true on 503 INTAKE_ATTACH_DISABLED specifically
//   retried   -- whether a retry was attempted
export async function uploadAttachment(attachment, {
  submissionId,
  intakeRef,
  url,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  deadline = Infinity
} = {}) {
  if (!url || !apiKey) {
    return { ok: false, status: 401, filename: attachment.filename, retried: false, configMissing: true };
  }

  const bytes = Buffer.from(attachment.base64 || "", "base64");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const headers = {
    "X-DOI-Intake-Key": apiKey,
    "X-Intake-Ref": intakeRef,
    "X-Submission-Id": submissionId,
    "X-Filename": encodeURIComponent(attachment.filename || ""),
    "Content-Type": attachment.contentType || "application/octet-stream",
    "X-Content-SHA256": sha256
  };

  let result = await attemptOnce(fetchImpl, url, headers, bytes, timeoutMs);
  let retried = false;

  // Retry once on 429 or a transient 5xx -- NOT on 503 specifically, which
  // here means the attachment feature is deliberately switched off
  // (INTAKE_ATTACH_DISABLED), not a transient failure. This mirrors the
  // main intake endpoint's distinction, but note callIntakeEndpoint DOES
  // retry 503 -- the two endpoints disagree on purpose, per DOi's spec for
  // each.
  const shouldRetry = result.networkError || result.status === 429 || (result.status >= 500 && result.status !== 503);
  const remainingForRetry = deadline - Date.now();
  if (shouldRetry && remainingForRetry >= MIN_REMAINING_FOR_RETRY_MS) {
    retried = true;
    result = await attemptOnce(fetchImpl, url, headers, bytes, Math.min(timeoutMs, remainingForRetry));
  }

  if (result.networkError) {
    return { ok: false, status: 0, filename: attachment.filename, networkError: true, retried };
  }

  const status = result.status;
  if (status === 200 || status === 201) {
    return { ok: true, status, filename: attachment.filename, retried };
  }

  return {
    ok: false,
    status,
    filename: attachment.filename,
    retried,
    disabled: status === 503
  };
}
