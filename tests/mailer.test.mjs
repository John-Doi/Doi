import test from "node:test";
import assert from "node:assert/strict";
import { sendEmail } from "../api/_lib/mailer.js";

const MESSAGE = { to: "client@example.test", from: "intake@doilabs.la", subject: "Subject", text: "Body" };

test("a hanging mail provider call aborts at ~6s with code MAIL_TIMEOUT", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const originalToken = process.env.POSTMARK_API_TOKEN;
  process.env.POSTMARK_API_TOKEN = "test-token";

  // Simulates a provider that never responds: the real `fetch` would reject
  // once our AbortController fires (the signal is passed in `options`),
  // just like a real network timeout would.
  const fetchImpl = (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });

  try {
    const pending = sendEmail(MESSAGE, { fetchImpl });
    t.mock.timers.tick(6000);
    await assert.rejects(pending, (err) => {
      assert.equal(err.code, "MAIL_TIMEOUT");
      return true;
    });
  } finally {
    if (originalToken === undefined) delete process.env.POSTMARK_API_TOKEN; else process.env.POSTMARK_API_TOKEN = originalToken;
  }
});
