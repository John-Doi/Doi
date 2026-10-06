import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidPhone,
  isValidUuid,
  validateSubmission,
  validateAttachments,
  resolveSiteAddress,
  orEmptyString,
  orNotProvided,
  truncateFilename,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES,
  MAX_FILENAME_LENGTH,
  US_STATE_CODES
} from "../api/_lib/intake.js";

const VALID_PARTS = { site_street: "19200 Soledad Canyon Rd", site_city: "Canyon Country", site_state: "CA", site_zip: "91351" };

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
  assert.equal(FIELD_LIMITS.site_street, 200);
  assert.equal(FIELD_LIMITS.site_city, 100);
  assert.equal(FIELD_LIMITS.site_state, 2);
  assert.equal(FIELD_LIMITS.site_zip, 10);
});

test("resolveSiteAddress: each missing part is named individually", () => {
  const noStreet = resolveSiteAddress({ ...VALID_PARTS, site_street: "" });
  assert.equal(noStreet.valid, false);
  assert.ok(noStreet.errors.some((e) => /street/i.test(e)));

  const noCity = resolveSiteAddress({ ...VALID_PARTS, site_city: "" });
  assert.equal(noCity.valid, false);
  assert.ok(noCity.errors.some((e) => /city/i.test(e)));

  const noState = resolveSiteAddress({ ...VALID_PARTS, site_state: "" });
  assert.equal(noState.valid, false);
  assert.ok(noState.errors.some((e) => /state/i.test(e)));

  const noZip = resolveSiteAddress({ ...VALID_PARTS, site_zip: "" });
  assert.equal(noZip.valid, false);
  assert.ok(noZip.errors.some((e) => /zip/i.test(e)));
});

test("resolveSiteAddress: a submission missing multiple parts names all of them", () => {
  const result = resolveSiteAddress({ ...VALID_PARTS, site_city: "", site_zip: "" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.some((e) => /city/i.test(e)));
  assert.ok(result.errors.some((e) => /zip/i.test(e)));
});

test("resolveSiteAddress: a ZIP that isn't 5 digits (or ZIP+4) is rejected, a valid ZIP+4 is accepted", () => {
  assert.equal(resolveSiteAddress({ ...VALID_PARTS, site_zip: "9135" }).valid, false);
  assert.equal(resolveSiteAddress({ ...VALID_PARTS, site_zip: "ABCDE" }).valid, false);
  assert.equal(resolveSiteAddress({ ...VALID_PARTS, site_zip: "913511" }).valid, false);

  const zipPlus4 = resolveSiteAddress({ ...VALID_PARTS, site_zip: "91351-1234" });
  assert.equal(zipPlus4.valid, true);
  assert.equal(zipPlus4.site_address, "19200 Soledad Canyon Rd, Canyon Country, CA 91351-1234");
});

test("resolveSiteAddress: an unrecognized state/territory code is rejected", () => {
  const result = resolveSiteAddress({ ...VALID_PARTS, site_state: "ZZ" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /state/i.test(e)));
});

test("resolveSiteAddress: a US_STATE_CODES territory (not just the 50 states) is accepted, case-insensitively", () => {
  assert.ok(US_STATE_CODES.includes("PR"));
  const result = resolveSiteAddress({ ...VALID_PARTS, site_state: "pr" });
  assert.equal(result.valid, true);
  assert.equal(result.site_address, "19200 Soledad Canyon Rd, Canyon Country, PR 91351");
});

test("resolveSiteAddress: valid parts compose the exact expected address string", () => {
  const result = resolveSiteAddress(VALID_PARTS);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.site_address, "19200 Soledad Canyon Rd, Canyon Country, CA 91351");
});

test("resolveSiteAddress: a client-composed site_address is ignored -- the server recomposes from the parts even when they disagree", () => {
  const result = resolveSiteAddress({ ...VALID_PARTS, site_address: "123 Totally Different St, Nowhere, TX 00000" });
  assert.equal(result.valid, true);
  assert.equal(result.site_address, "19200 Soledad Canyon Rd, Canyon Country, CA 91351");
});

test("resolveSiteAddress: legacy fallback (no parts at all) accepts a single site_address field only when it contains a ZIP", () => {
  const noZip = resolveSiteAddress({ site_address: "19200 Soledad Canyon Road" });
  assert.equal(noZip.valid, false);
  assert.ok(noZip.errors.some((e) => /street, city, state and zip/i.test(e)));

  const withZip = resolveSiteAddress({ site_address: "19200 Soledad Canyon Road, Canyon Country, CA 91351" });
  assert.equal(withZip.valid, true);
  assert.equal(withZip.site_address, "19200 Soledad Canyon Road, Canyon Country, CA 91351");

  const noPartsAtAll = resolveSiteAddress({});
  assert.equal(noPartsAtAll.valid, false);
});

test("resolveSiteAddress: a partial submission (at least one part present) is validated part-by-part, not treated as legacy", () => {
  // Only site_street provided -- this must NOT fall back to the legacy
  // single-field path (which would otherwise look at a nonexistent
  // site_address and reject with the generic legacy message instead of
  // naming the specific missing parts).
  const result = resolveSiteAddress({ site_street: "19200 Soledad Canyon Rd" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /city/i.test(e)));
  assert.ok(result.errors.some((e) => /state/i.test(e)));
  assert.ok(result.errors.some((e) => /zip/i.test(e)));
  assert.ok(!result.errors.some((e) => /street, city, state and zip/i.test(e)), "must not use the legacy fallback message");
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
