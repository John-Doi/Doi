import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { uploadAttachment } from "../api/_lib/intake-attachment.js";

function jsonResponse(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const ATTACHMENT = { filename: "roof-plan.pdf", contentType: "application/pdf", base64: "JVBERi0xLjQK" };
const OPTS_BASE = { submissionId: "sub-1", intakeRef: "INT-1", url: "https://example.test/intake/web/attachment", apiKey: "k" };

test("201 (stored) -> ok:true, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(201, { status: "stored" }); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.status, 201);
  assert.equal(result.retried, false);
  assert.equal(calls, 1);
});

test("200 (replay -- same file already stored) -> ok:true, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(200, { status: "replay" }); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
});

test("415 (unsupported type) -> ok:false, rejected, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(415, {}); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.status, 415);
  assert.equal(calls, 1);
});

test("413 (too large) -> ok:false, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(413, {}); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.equal(calls, 1);
});

test("422 and 409 and 404 -> ok:false, no retry (deterministic rejections)", async () => {
  for (const status of [422, 409, 404]) {
    let calls = 0;
    const fetchImpl = async () => { calls++; return jsonResponse(status, {}); };
    const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.equal(calls, 1, `status ${status} should not be retried`);
  }
});

test("503 INTAKE_ATTACH_DISABLED -> ok:false, disabled:true, no retry (feature off, not transient)", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse(503, { error: { code: "INTAKE_ATTACH_DISABLED" } });
  };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.disabled, true);
  assert.equal(calls, 1);
});

test("429 -> retried once with identical headers, second attempt succeeds (201)", async () => {
  let calls = 0;
  const seenHeaders = [];
  const fetchImpl = async (url, options) => {
    calls++;
    seenHeaders.push(options.headers);
    if (calls === 1) return jsonResponse(429, {});
    return jsonResponse(201, { status: "stored" });
  };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
  assert.deepEqual(seenHeaders[0], seenHeaders[1], "retry must reuse identical headers");
});

test("a transient 500 is retried once, same as 429", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return calls === 1 ? jsonResponse(500, {}) : jsonResponse(201, { status: "stored" }); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
});

test("timeout (AbortError) -> retried once, second attempt succeeds", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) { const err = new Error("aborted"); err.name = "AbortError"; throw err; }
    return jsonResponse(201, { status: "stored" });
  };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl, timeoutMs: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
});

test("timeout on both attempts -> networkError surfaced", async () => {
  const fetchImpl = async () => { const err = new Error("aborted"); err.name = "AbortError"; throw err; };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, fetchImpl, timeoutMs: 10 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.networkError, true);
  assert.equal(result.retried, true);
});

test("missing url/apiKey -> configMissing, no network call attempted", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(201, {}); };
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, url: "", apiKey: "", fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.configMissing, true);
  assert.equal(calls, 0);
});

test("request carries the required headers: key, submission_id, intake_ref, encoded filename, content-type, sha256 of the raw bytes; body is the raw bytes, not JSON", async () => {
  let captured = null;
  const fetchImpl = async (url, options) => { captured = { url, options }; return jsonResponse(201, { status: "stored" }); };
  await uploadAttachment(
    { filename: "roof plan #1.pdf", contentType: "application/pdf", base64: "JVBERi0xLjQK" },
    { submissionId: "sub-xyz", intakeRef: "INT-xyz", url: "https://example.test/intake/web/attachment", apiKey: "secret-key", fetchImpl }
  );

  assert.equal(captured.url, "https://example.test/intake/web/attachment");
  assert.equal(captured.options.headers["X-DOI-Intake-Key"], "secret-key");
  assert.equal(captured.options.headers["X-Submission-Id"], "sub-xyz");
  assert.equal(captured.options.headers["X-Intake-Ref"], "INT-xyz");
  assert.equal(captured.options.headers["X-Filename"], encodeURIComponent("roof plan #1.pdf"));
  assert.equal(captured.options.headers["Content-Type"], "application/pdf");

  const expectedBytes = Buffer.from("JVBERi0xLjQK", "base64");
  const expectedSha = createHash("sha256").update(expectedBytes).digest("hex");
  assert.equal(captured.options.headers["X-Content-SHA256"], expectedSha);

  assert.ok(Buffer.isBuffer(captured.options.body), "body must be the raw file bytes, not a JSON string");
  assert.deepEqual(captured.options.body, expectedBytes);
});

test("the API key never appears in the returned result", async () => {
  const fetchImpl = async () => jsonResponse(201, { status: "stored" });
  const result = await uploadAttachment(ATTACHMENT, { ...OPTS_BASE, apiKey: "super-secret-key", fetchImpl });
  assert.equal(JSON.stringify(result).includes("super-secret-key"), false);
});

test("a retryable failure (e.g. 500) is NOT retried when less than 3s remain before the deadline", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(500, {}); };
  const result = await uploadAttachment(ATTACHMENT, {
    ...OPTS_BASE,
    fetchImpl,
    deadline: Date.now() + 2000 // less than the 3s retry floor
  });
  assert.equal(result.ok, false);
  assert.equal(result.retried, false);
  assert.equal(calls, 1);
});

test("a retryable failure IS retried with >= 3s remaining before the deadline", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return calls === 1 ? jsonResponse(500, {}) : jsonResponse(201, { status: "stored" }); };
  const result = await uploadAttachment(ATTACHMENT, {
    ...OPTS_BASE,
    fetchImpl,
    timeoutMs: 10000,
    deadline: Date.now() + 5000
  });
  assert.equal(result.ok, true);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
});
