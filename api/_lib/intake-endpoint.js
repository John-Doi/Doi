// Calls DOi's Azure Function intake endpoint -- the PRIMARY delivery path.
// The backup/notification email (api/_lib/mailer.js) is sent regardless of
// what this returns; this module only decides whether the primary path
// succeeded and what the client should be told about it.

const DEFAULT_TIMEOUT_MS = 10000;

function withTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function attemptOnce(fetchImpl, url, apiKey, payload, timeoutMs) {
  try {
    const resp = await withTimeout(fetchImpl, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DOI-Intake-Key": apiKey
      },
      body: JSON.stringify(payload)
    }, timeoutMs);

    let body = null;
    try { body = await resp.json(); } catch { /* non-JSON or empty body */ }

    return { status: resp.status, body, networkError: false };
  } catch (err) {
    // Network failure or our own AbortController timeout -- both are
    // retried the same way as a 5xx (see callIntakeEndpoint below).
    return { status: 0, body: null, networkError: true, errorMessage: err.name === "AbortError" ? "timeout" : err.message };
  }
}

// Returns a normalized result the handler maps to client-facing behavior:
//   ok           -- true only on a clean 2xx "received" response
//   status       -- the HTTP status from the last attempt (0 = network/timeout)
//   intakeRef    -- internal reference, NEVER sent to the browser
//   errors       -- field errors, when status is 400
//   retried      -- whether a retry was attempted
export async function callIntakeEndpoint(payload, { url, apiKey, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!url || !apiKey) {
    return { ok: false, status: 401, intakeRef: null, errors: null, retried: false, configMissing: true };
  }

  let result = await attemptOnce(fetchImpl, url, apiKey, payload, timeoutMs);
  let retried = false;

  // Retry once, with the SAME payload (same submission_id), on a network
  // error/timeout or a transient 5xx -- not on 400/401/429 (deterministic,
  // won't change on an immediate retry) and not on 503 specifically, which
  // per spec means the endpoint was deliberately switched off, not a
  // transient failure worth retrying.
  const shouldRetry = result.networkError || (result.status >= 500 && result.status !== 503);
  if (shouldRetry) {
    retried = true;
    result = await attemptOnce(fetchImpl, url, apiKey, payload, timeoutMs);
  }

  if (result.networkError) {
    return { ok: false, status: 0, intakeRef: null, errors: null, retried, networkError: true };
  }

  const status = result.status;
  const body = result.body || {};

  if (status >= 200 && status < 300 && body.status === "received") {
    return { ok: true, status, intakeRef: body.intake_ref || null, errors: null, retried };
  }

  return {
    ok: false,
    status,
    intakeRef: body.intake_ref || null,
    errors: Array.isArray(body.errors) ? body.errors : null,
    retried
  };
}
