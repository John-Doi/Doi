import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidPhone,
  isValidUuid,
  validateSubmission,
  validateAttachments,
  orEmptyString,
  orNotProvided,
  truncateFilename,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES,
  MAX_FILENAME_LENGTH
} from "../api/_lib/intake.js";

test("isValidPhone accepts 7-15 digits, rejects outside that range", () => {
  assert.equal(isValidPhone("5551234"), true); // 7 digits
  assert.equal(isValidPhone("+1 (562) 555-0134"), true); // 11 digits, formatted
  assert.equal(isValidPhone("123456"), false); // 6 digits -- too few
  assert.equal(isValidPhone("1234567890123456"), false); // 16 digits -- too many
});

test("isValidPhone rejects a string longer than 25 characters even with a valid digit count", () => {
  // Padded with trailing dashes (not whitespace, which .trim() would strip)
  // so the digit count stays valid (11) while pushing total length past 25.
  const padded = "+1 (562) 555-0134" + "-".repeat(20);
  assert.equal(padded.length > 25, true);
  assert.equal(isValidPhone(padded), false);
});

test("isValidUuid accepts a well-formed UUID and rejects garbage", () => {
  assert.equal(isValidUuid("7f3b2a10-9c4e-4d2a-8b1e-6a2f5c9d0e11"), true);
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.equal(isValidUuid(""), false);
  assert.equal(isValidUuid(undefined), false);
});

test("validateSubmission requires contact_name in addition to the existing required fields", () => {
  const withoutName = validateSubmission({
    client: "Jordan Lee",
    site_address: "123 Main St",
    mission_type: "Thermal Inspection",
    contact_email: "jordan@example.com",
    contact_name: ""
  });
  assert.equal(withoutName.valid, false);
  assert.ok(withoutName.errors.some((e) => /contact name/i.test(e)));

  const withName = validateSubmission({
    client: "Jordan Lee",
    site_address: "123 Main St",
    mission_type: "Thermal Inspection",
    contact_email: "jordan@example.com",
    contact_name: "Jordan Lee"
  });
  assert.equal(withName.valid, true);
});

test("orEmptyString returns '' (not NOT_PROVIDED) for empty/missing values", () => {
  assert.equal(orEmptyString(""), "");
  assert.equal(orEmptyString(null), "");
  assert.equal(orEmptyString(undefined), "");
  assert.equal(orEmptyString("  "), "");
  assert.equal(orEmptyString("value"), "value");
});

test("orNotProvided still returns the human-readable placeholder (used only in email prose)", () => {
  assert.equal(orNotProvided(""), "NOT PROVIDED");
  assert.equal(orNotProvided("value"), "value");
});

test("FIELD_LIMITS matches the per-field caps this change specifies", () => {
  assert.equal(FIELD_LIMITS.client, 200);
  assert.equal(FIELD_LIMITS.organization, 200);
  assert.equal(FIELD_LIMITS.contact_name, 200);
  assert.equal(FIELD_LIMITS.requested_window, 200);
  assert.equal(FIELD_LIMITS.site_address, 500);
  assert.equal(FIELD_LIMITS.mission_type, 120);
  assert.equal(FIELD_LIMITS.contact_email, 254);
  assert.equal(FIELD_LIMITS.contact_phone, 25);
});

test("MAX_PAYLOAD_BYTES is 16 KB", () => {
  assert.equal(MAX_PAYLOAD_BYTES, 16 * 1024);
});

test("validateAttachments error messages say 3 MB, matching the actual limits (not the old 10MB/25MB wording)", () => {
  const bigBase64 = "A".repeat(4 * 1024 * 1024 + 8); // just over 3MB once decoded (base64 is 4/3 the size)
  const perFile = validateAttachments([{ filename: "big.pdf", base64: bigBase64 }]);
  assert.ok(perFile.errors.some((e) => /3 MB per-file limit/.test(e)));
  assert.ok(!perFile.errors.some((e) => /10 ?MB/.test(e)));

  const total = validateAttachments([
    { filename: "a.pdf", base64: "A".repeat(2 * 1024 * 1024 + 8) },
    { filename: "b.pdf", base64: "A".repeat(2 * 1024 * 1024 + 8) }
  ]);
  assert.ok(total.errors.some((e) => /Total attachment size exceeds the 3 MB limit/.test(e)));
  assert.ok(!total.errors.some((e) => /25 ?MB/.test(e)));
});

test("truncateFilename keeps the extension and caps total length at MAX_FILENAME_LENGTH", () => {
  const longName = "a".repeat(300) + ".pdf";
  const truncated = truncateFilename(longName);
  assert.equal(truncated.length, MAX_FILENAME_LENGTH);
  assert.ok(truncated.endsWith(".pdf"));

  const shortName = "roof-plan.pdf";
  assert.equal(truncateFilename(shortName), shortName);
});

test("validateAttachments truncates an over-long filename in place rather than rejecting the submission", () => {
  const longName = "a".repeat(300) + ".pdf";
  const attachment = { filename: longName, base64: "AAAA" };
  const result = validateAttachments([attachment]);
  assert.equal(result.valid, true);
  assert.equal(attachment.filename.length, MAX_FILENAME_LENGTH, "the object passed in should be mutated so downstream consumers see the truncated name");
  assert.ok(attachment.filename.endsWith(".pdf"));
});
