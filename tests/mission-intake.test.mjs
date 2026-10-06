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

function fakeTransport(sentMail) {
  return {
    async sendMail(opts) {
      sentMail.push(opts);
      return { messageId: "test" };
    }
  };
}

// Extracts the fenced ```json ... ``` block from the intake email body and
// parses it, mirroring how a human reading the email would read Part B.
function extractJsonBlock(text) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, "intake email body must contain a fenced json block");
  return JSON.parse(match[1]);
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

test("valid submission sends intake email with correct subject and JSON shape, and a client confirmation", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    transport: fakeTransport(sentMail),
    rateLimited: () => false,
    verifyCaptcha: async () => true,
    now: () => new Date("2026-11-01T18:30:00.000Z"),
    uuid: () => "00000000-0000-4000-8000-000000000000"
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 2, "expected one intake email and one client confirmation");

  const intakeMail = sentMail[0];
  assert.equal(intakeMail.to, "johnktoles@doilabs.la");
  assert.equal(intakeMail.subject, "[WEB INTAKE] Jordan Lee – Thermal Inspection");

  const json = extractJsonBlock(intakeMail.text);
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
    site_access_notes: "NOT PROVIDED",
    notes: "Roof-mounted HVAC units, need thermal pass before the rainy season.",
    attachments: []
  });

  const confirmationMail = sentMail[1];
  assert.equal(confirmationMail.to, "jordan@leeconstruction.example");
  assert.match(confirmationMail.text, /received your mission request/);
  assert.doesNotMatch(confirmationMail.text, /\$|price|quote|FAA approval|availability/i);
});

test("missing required fields are rejected with 400 and no email is sent", async () => {
  const sentMail = [];
  const req = {
    method: "POST",
    headers: {},
    body: { client: "", organization: "", site_address: "", mission_type: "", contact_email: "", contact_phone: "" }
  };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    transport: fakeTransport(sentMail),
    rateLimited: () => false,
    verifyCaptcha: async () => true
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.length > 0);
  assert.equal(sentMail.length, 0);
});

test("honeypot field being filled silently drops the submission", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY, hp_website: "http://spam.example" } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    transport: fakeTransport(sentMail),
    rateLimited: () => false,
    verifyCaptcha: async () => true
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(sentMail.length, 0, "no mail should be sent for a honeypot-triggered submission");
});

test("rate-limited requests are rejected with 429 before SMTP is touched", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    transport: fakeTransport(sentMail),
    rateLimited: () => true
  });

  assert.equal(res.statusCode, 429);
  assert.equal(sentMail.length, 0);
});

test("never generates or returns a mission ID / reference number to the client", async () => {
  const sentMail = [];
  const req = { method: "POST", headers: {}, body: { ...SAMPLE_BODY } };
  const res = fakeRes();

  await handleIntakeRequest(req, res, {
    transport: fakeTransport(sentMail),
    rateLimited: () => false,
    verifyCaptcha: async () => true
  });

  const bodyKeys = Object.keys(res.body);
  assert.deepEqual(bodyKeys.sort(), ["success"]);
});
