import test from "node:test";
import assert from "node:assert/strict";
import { handleIntakeRequest } from "../api/mission-intake.js";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    }
  };
}

// Extracts the fenced ```json ... ``` block from an email body.
function extractJsonBlock(text) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, "email body must contain a fenced json block");
  return JSON.parse(match[1]);
}

function fakeEndpoint(result) {
  return async () => result;
}

const SAMPLE_BODY = {
  client: "Jordan Lee",
  organization: "Lee Construction Group",
  site_address: "4821 Harbor Blvd, Long Beach, CA",
  mission_type: "Thermal Inspection",
  requested_window: "2026-11-03 — Morning (6am–12pm)",
  deliverables: "Thermal Findings, Inspection Documentation",
  contact_name: "Jordan Lee",
  contact_phone: "(562) 555-0134",
  contact_email: "jordan@leeconstruction.example",
  notes: "Roof-mounted HVAC units, need thermal pass before the rainy season.",
  attachments: [],
  hp_website: "",
  captchaToken: ""
};

const FIXED_DEPS = {
  rateLimited: () => false,
  verifyCaptcha: async () => true,
  now: () => new Date("2026-11-01T18:30:00.000Z"),
  uuid: () => "00000000-0000-4000-8000-000000000000"
};

test("endpoint 200/received (duplicate submission_id): client sees success, backup + confirmation emails both sent with correct subject/shape", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: true, status: 200, intakeRef: "INT-20261101-001", errors: null, retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 2);

  const backupMail = sentMail[0];
  assert.equal(backupMail.to, "johnktoles@doilabs.la");
  assert.equal(backupMail.from, "intake@doilabs.la");
  assert.equal(backupMail.subject, "[WEB INTAKE] Jordan Lee – Thermal Inspection");

  const json = extractJsonBlock(backupMail.text);
  assert.deepEqual(json, {
    intake_channel: "website",
    submission_id: "00000000-0000-4000-8000-000000000000",
    submitted_at_utc: "2026-11-01T18:30:00.000Z",
    client: "Jordan Lee",
    organization: "Lee Construction Group",
    site_address: "4821 Harbor Blvd, Long Beach, CA",
    mission_type: "Thermal Inspection",
    requested_window: "2026-11-03 — Morning (6am–12pm)",
    deliverables: "Thermal Findings, Inspection Documentation",
    contact_name: "Jordan Lee",
    contact_phone: "(562) 555-0134",
    contact_email: "jordan@leeconstruction.example",
    site_access_notes: "",
    notes: "Roof-mounted HVAC units, need thermal pass before the rainy season.",
    attachments: [],
    intake_ref: "INT-20261101-001",
    endpoint_status: "200"
  });

  const confirmationMail = sentMail[1];
  assert.equal(confirmationMail.to, "jordan@leeconstruction.example");
  assert.doesNotMatch(confirmationMail.text, /\$|price|quote|FAA approval|availability|INT-/i);

  // The client-facing response never contains a reference number anywhere.
  assert.deepEqual(Object.keys(res.body).sort(), ["success"]);
});

test("endpoint 201/received (new submission): client sees plain success, no ref exposed", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: true, status: 201, intakeRef: "INT-20261101-099", errors: null, retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 2);
  assert.equal(extractJsonBlock(sentMail[0].text).endpoint_status, "201");
  assert.equal(extractJsonBlock(sentMail[0].text).intake_ref, "INT-20261101-099");
});

test("endpoint 400: client sees field errors, backup email still sent for the record", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 400, intakeRef: null, errors: ["mission_type must be a known value"], retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.deepEqual(res.body.errors, ["mission_type must be a known value"]);
  assert.equal(sentMail.length, 2, "backup + confirmation emails still sent even though the endpoint rejected the payload");

  const json = extractJsonBlock(sentMail[0].text);
  assert.equal(json.endpoint_status, "400");
  assert.equal(json.intake_ref, "NOT LOGGED");
});

test("endpoint 503, retried internally and still failing: client still sees plain success, no ref exposed", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    // callIntakeEndpoint already retried once internally (see
    // tests/intake-endpoint.test.mjs) by the time the handler sees this.
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 503, intakeRef: null, errors: null, retried: true }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 2);
  assert.equal(extractJsonBlock(sentMail[0].text).endpoint_status, "503");
});

test("endpoint timeout: callIntakeEndpoint already retried once internally, then falls back to email -- client sees success", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();
  let callCount = 0;

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    // Simulates what api/_lib/intake-endpoint.js itself does on a timeout:
    // one retry, same payload, still fails, surfaced here as a single
    // normalized result with retried:true.
    callIntakeEndpoint: async (payload) => {
      callCount++;
      return { ok: false, status: 0, intakeRef: null, errors: null, retried: true, networkError: true };
    },
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 2, "falls back to the backup email after the retried timeout");
  assert.equal(extractJsonBlock(sentMail[0].text).endpoint_status, "0");
});

test("endpoint 429: client is asked to retry shortly, not told it succeeded", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 429, intakeRef: null, errors: null, retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.success, false);
  assert.equal(sentMail.length, 2, "backup email is still sent even on 429");
});

test("endpoint 422: client sees field errors (not silent success), backup email still sent", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 422, intakeRef: null, errors: ["mission_type is not a recognized value"], retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.success, false);
  assert.deepEqual(res.body.errors, ["mission_type is not a recognized value"]);
  assert.equal(sentMail.length, 2, "backup email is still sent even on 422");
});

test("endpoint 413: client sees a too-large message (not silent success), backup email still sent", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 413, intakeRef: null, errors: null, retried: false }),
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(res.statusCode, 413);
  assert.equal(res.body.success, false);
  assert.equal(sentMail.length, 2);
});

test("a payload within every per-field character limit can still exceed 16KB in bytes (multi-byte UTF-8) and is rejected with 413, before the endpoint or mailer are ever touched", async () => {
  let endpointCalled = false;
  let mailerCalled = false;
  // A 3-byte-per-character CJK string at each field's own max *character*
  // count defeats character-count limits alone but not the explicit
  // byte-length guard -- this is exactly the gap that guard exists to close.
  const wide = (n) => "测".repeat(n);
  const req = {
    method: "POST",
    headers: {},
    body: {
      client: wide(200),
      organization: wide(200),
      site_address: wide(500),
      mission_type: wide(120),
      requested_window: wide(200),
      deliverables: wide(1000),
      contact_name: wide(200),
      contact_phone: "5551234567",
      contact_email: "a@example.com",
      site_access_notes: wide(1000),
      notes: wide(2000),
      attachments: [],
      hp_website: "",
      captchaToken: ""
    }
  };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async () => { endpointCalled = true; return { ok: true, status: 200 }; },
    sendEmail: async () => { mailerCalled = true; }
  });

  assert.equal(res.statusCode, 413);
  assert.equal(res.body.success, false);
  assert.equal(endpointCalled, false, "the oversized payload must never reach the endpoint");
  assert.equal(mailerCalled, false, "an oversized/malformed submission is rejected outright, not emailed");
});

test("submission_id provided by the client (a valid UUID) is reused verbatim, not regenerated", async () => {
  const sentMail = [];
  const clientId = "7f3b2a10-9c4e-4d2a-8b1e-6a2f5c9d0e11";
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY, submission_id: clientId } };
  const res = fakeRes();
  let capturedPayload = null;

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async (payload) => { capturedPayload = payload; return { ok: true, status: 200, intakeRef: "INT-1" }; },
    sendEmail: async (msg) => { sentMail.push(msg); return { messageId: "test" }; }
  });

  assert.equal(capturedPayload.submission_id, clientId);
  assert.equal(extractJsonBlock(sentMail[0].text).submission_id, clientId);
});

test("a missing or malformed client submission_id falls back to a server-generated one instead of failing the request", async () => {
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY, submission_id: "not-a-uuid" } };
  const res = fakeRes();
  let capturedPayload = null;

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async (payload) => { capturedPayload = payload; return { ok: true, status: 200 }; },
    sendEmail: async () => ({ messageId: "test" })
  });

  assert.equal(capturedPayload.submission_id, "00000000-0000-4000-8000-000000000000");
});

test("mismatched Turnstile env vars (only one of secret/site key set) fail closed with a config error, before touching the endpoint or mailer", async () => {
  let endpointCalled = false;
  let mailerCalled = false;
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  const originalSite = process.env.TURNSTILE_SITE_KEY;
  process.env.TURNSTILE_SECRET_KEY = "a-secret";
  delete process.env.TURNSTILE_SITE_KEY;

  try {
    await handleIntakeRequest(req, res, {
      ...FIXED_DEPS,
      callIntakeEndpoint: async () => { endpointCalled = true; return { ok: true, status: 200 }; },
      sendEmail: async () => { mailerCalled = true; }
    });
  } finally {
    if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = originalSecret;
    if (originalSite === undefined) delete process.env.TURNSTILE_SITE_KEY; else process.env.TURNSTILE_SITE_KEY = originalSite;
  }

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.equal(endpointCalled, false);
  assert.equal(mailerCalled, false);
});

test("endpoint AND backup email both fail: this is the one real failure shown to the client", async () => {
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: fakeEndpoint({ ok: false, status: 500, intakeRef: null, errors: null, retried: true }),
    sendEmail: async () => { throw new Error("Postmark down"); }
  });

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.success, false);
});

test("a mailer failure is logged with a short error code, never the raw error message", async () => {
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();
  const originalError = console.error;
  const errorCalls = [];
  console.error = (...args) => { errorCalls.push(args); };

  const sensitiveMessage = "Postmark rejected recipient jordan@leeconstruction.example: invalid mailbox";
  const mailerErr = new Error(sensitiveMessage);
  mailerErr.code = "POSTMARK_SEND_FAILED_422";

  try {
    await handleIntakeRequest(req, res, {
      ...FIXED_DEPS,
      callIntakeEndpoint: fakeEndpoint({ ok: true, status: 200, intakeRef: "INT-1" }),
      sendEmail: async () => { throw mailerErr; }
    });
  } finally {
    console.error = originalError;
  }

  const logged = errorCalls.map((a) => a.join(" ")).join("\n");
  assert.match(logged, /backup email failed/);
  assert.match(logged, /POSTMARK_SEND_FAILED_422/);
  assert.doesNotMatch(logged, /invalid mailbox/, "the raw mailer error message must never be logged");
});

test("missing required fields are rejected with 400 before the endpoint or mailer are ever touched", async () => {
  let endpointCalled = false;
  let mailerCalled = false;
  const req = {
    method: "POST",
    headers: {},
    body: { client: "", organization: "", site_address: "", mission_type: "", contact_email: "", contact_phone: "" }
  };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async () => { endpointCalled = true; return { ok: true, status: 200 }; },
    sendEmail: async () => { mailerCalled = true; }
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.length > 0);
  assert.equal(endpointCalled, false);
  assert.equal(mailerCalled, false);
});

test("honeypot field being filled silently drops the submission before endpoint/mailer", async () => {
  let endpointCalled = false;
  let mailerCalled = false;
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY, hp_website: "http://spam.example" } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async () => { endpointCalled = true; return { ok: true, status: 200 }; },
    sendEmail: async () => { mailerCalled = true; }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(endpointCalled, false);
  assert.equal(mailerCalled, false);
});

test("honeypot log never includes the raw client IP, only a short fingerprint", async () => {
  const rawIp = "203.0.113.42";
  const req = { method: "POST", headers: { "x-forwarded-for": rawIp }, body: { ...SAMPLE_BODY, hp_website: "http://spam.example" } };
  const res = fakeRes();
  const originalWarn = console.warn;
  const warnCalls = [];
  console.warn = (...args) => { warnCalls.push(args); };

  try {
    await handleIntakeRequest(req, res, {
      ...FIXED_DEPS,
      callIntakeEndpoint: async () => ({ ok: true, status: 200 }),
      sendEmail: async () => ({ messageId: "test" })
    });
  } finally {
    console.warn = originalWarn;
  }

  const logged = warnCalls.map((a) => a.join(" ")).join("\n");
  assert.match(logged, /honeypot triggered/);
  assert.doesNotMatch(logged, new RegExp(rawIp.replace(/\./g, "\\.")), "the raw IP must never appear in logs");
  assert.match(logged, /ip_fp: [0-9a-f]{8}/, "a short fingerprint should appear instead");
});

test("rate-limited requests are rejected with 429 before anything else runs", async () => {
  let endpointCalled = false;
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    rateLimited: () => true,
    callIntakeEndpoint: async () => { endpointCalled = true; return { ok: true, status: 200 }; }
  });

  assert.equal(res.statusCode, 429);
  assert.equal(endpointCalled, false);
});

test("attachment content never appears in the endpoint payload, only filenames", async () => {
  let capturedPayload = null;
  const req = {
    method: "POST",
    headers: {},
    body: {
      ...SAMPLE_BODY,
      attachments: [{ filename: "roof-plan.pdf", contentType: "application/pdf", base64: "JVBERi0xLjQK" }]
    }
  };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    ...FIXED_DEPS,
    callIntakeEndpoint: async (payload) => { capturedPayload = payload; return { ok: true, status: 200, intakeRef: "INT-1" }; },
    sendEmail: async () => ({ messageId: "test" })
  });

  assert.deepEqual(capturedPayload.attachments, ["roof-plan.pdf"]);
  assert.equal(JSON.stringify(capturedPayload).includes("JVBERi0xLjQK"), false, "base64 content must never be sent to the intake endpoint");
});
