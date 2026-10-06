import test from "node:test";
import assert from "node:assert/strict";
import { callIntakeEndpoint } from "../api/_lib/intake-endpoint.js";

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const PAYLOAD = { intake_channel: "website", submission_id: "sub-1" };

test("201 (new) + status:received -> ok:true, intakeRef captured, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse(201, { status: "received", intake_ref: "INT-20261101-001" });
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.intakeRef, "INT-20261101-001");
  assert.equal(result.retried, false);
  assert.equal(calls, 1);
});

test("200 (duplicate -- same submission_id already received) + status:received -> ok:true, no retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse(200, { status: "received", intake_ref: "INT-20261101-001" });
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.intakeRef, "INT-20261101-001");
  assert.equal(result.retried, false);
  assert.equal(calls, 1);
});

test("400 -> ok:false, errors passed through, no retry (deterministic failure)", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse(400, { errors: ["site_address is required"] });
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.deepEqual(result.errors, ["site_address is required"]);
  assert.equal(calls, 1);
});

test("503 -> retried once with the same payload, still fails -> ok:false, retried:true, caller falls back to email", async () => {
  let calls = 0;
  const seenPayloads = [];
  const fetchImpl = async (url, options) => {
    calls++;
    seenPayloads.push(JSON.parse(options.body));
    return jsonResponse(503, {});
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
  assert.deepEqual(seenPayloads[0], seenPayloads[1], "retry must reuse the exact same payload/submission_id");
});

test("500 -> retried once with the same payload, still fails -> ok:false, retried:true", async () => {
  let calls = 0;
  const seenPayloads = [];
  const fetchImpl = async (url, options) => {
    calls++;
    seenPayloads.push(JSON.parse(options.body));
    return jsonResponse(500, {});
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.retried, true);
  assert.equal(calls, 2);
  assert.deepEqual(seenPayloads[0], seenPayloads[1], "retry must reuse the exact same payload/submission_id");
});

test("timeout (AbortError) -> retried once, second attempt succeeds -> ok:true", async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    if (calls === 1) {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
    return jsonResponse(200, { status: "received", intake_ref: "INT-2" });
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl, timeoutMs: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.retried, true);
  assert.equal(result.intakeRef, "INT-2");
  assert.equal(calls, 2);
});

test("timeout on both attempts -> networkError surfaced, caller falls back to email", async () => {
  const fetchImpl = async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "https://example.test/intake", apiKey: "k", fetchImpl, timeoutMs: 10 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.networkError, true);
  assert.equal(result.retried, true);
});

test("missing url/apiKey -> configMissing, no network call attempted", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(200, {}); };
  const result = await callIntakeEndpoint(PAYLOAD, { url: "", apiKey: "", fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.configMissing, true);
  assert.equal(calls, 0);
});
