// Pure helpers for the mission-intake email pipeline. Kept dependency-free and
// side-effect-free (no network, no env reads) so they're directly unit
// testable -- see tests/mission-intake.test.js.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts common phone punctuation (+, spaces, dashes, parens, dots); the
// digit count (checked separately below) is what actually bounds validity.
const PHONE_RE = /^[+()\d\s.-]{1,25}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_PROVIDED = "NOT PROVIDED";
const ATTACHMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic"];
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB total
const MAX_ATTACHMENT_COUNT = 10;

// Per-field character caps, enforced both here (server, authoritative) and
// as `maxlength` on the corresponding index.html inputs (advisory only --
// never trust the client). Chosen so the full intake JSON payload sent to
// the Azure endpoint comfortably stays under MAX_PAYLOAD_BYTES even in the
// worst case; see the explicit byte-length guard in mission-intake.js for
// the actual enforcement (character counts alone don't bound multi-byte
// UTF-8 input).
const FIELD_LIMITS = {
  client: 200,
  organization: 200,
  contact_name: 200,
  requested_window: 200,
  site_address: 500,
  mission_type: 120,
  contact_email: 254,
  contact_phone: 25,
  deliverables: 1000,
  site_access_notes: 1000,
  notes: 2000,
  // Not part of the Azure payload schema (free-text context shown only in
  // the backup email's prose summary), so it doesn't count toward
  // MAX_PAYLOAD_BYTES -- kept here anyway as the single source of truth.
  extraContext: 4000
};
const MAX_PAYLOAD_BYTES = 16 * 1024; // 16 KB, the full JSON sent to the intake endpoint

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

// 7-15 digits (E.164's own max is 15) within an overall 25-character string
// that may also carry +, spaces, parens, dashes, and dots.
function isValidPhone(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!PHONE_RE.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

function isValidUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function orNotProvided(value) {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const str = String(value).trim();
  return str.length ? str : NOT_PROVIDED;
}

// Azure's intake schema expects an empty string for "no value", not the
// human-readable "NOT PROVIDED" placeholder (sending the latter is what
// produced some of the 422s this was fixed in response to) -- NOT PROVIDED
// is only for display, in the backup email's prose summary.
function orEmptyString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Required: (client or organization) AND site_address AND mission_type AND
// contact_name AND (contact_email or contact_phone). Returns { valid, errors: string[] }.
function validateSubmission(fields) {
  const errors = [];
  const hasClientOrOrg = (fields.client || "").trim() || (fields.organization || "").trim();
  if (!hasClientOrOrg) errors.push("Provide your name or organization.");
  if (!(fields.site_address || "").trim()) errors.push("Site address is required.");
  if (!(fields.mission_type || "").trim()) errors.push("Mission type is required.");
  if (!(fields.contact_name || "").trim()) errors.push("Contact name is required.");

  const email = (fields.contact_email || "").trim();
  const phone = (fields.contact_phone || "").trim();
  if (!email && !phone) errors.push("Provide a contact email or phone number.");
  if (email && !isValidEmail(email)) errors.push("Contact email is not a valid email address.");
  if (phone && !isValidPhone(phone)) errors.push("Contact phone is not a valid phone number.");

  return { valid: errors.length === 0, errors };
}

function validateAttachments(attachments) {
  const errors = [];
  const list = Array.isArray(attachments) ? attachments : [];
  if (list.length > MAX_ATTACHMENT_COUNT) {
    errors.push(`No more than ${MAX_ATTACHMENT_COUNT} attachments allowed.`);
  }
  let total = 0;
  for (const att of list) {
    const name = String(att && att.filename || "");
    const ext = name.split(".").pop().toLowerCase();
    if (!ATTACHMENT_EXTENSIONS.includes(ext)) {
      errors.push(`Unsupported attachment type: ${name || "(unnamed)"}. Allowed: PDF, JPG, PNG, HEIC.`);
      continue;
    }
    const base64 = String(att && att.base64 || "");
    // base64 -> raw byte length, without decoding the whole buffer.
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes > MAX_ATTACHMENT_BYTES) {
      errors.push(`${name} exceeds the 10 MB per-file limit.`);
    }
    total += bytes;
  }
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
    errors.push("Total attachment size exceeds the 25 MB limit.");
  }
  return { valid: errors.length === 0, errors, totalBytes: total };
}

function buildSubject(fields) {
  const who = (fields.client || "").trim() || (fields.organization || "").trim() || NOT_PROVIDED;
  const missionType = (fields.mission_type || "").trim() || NOT_PROVIDED;
  return `[WEB INTAKE] ${who} – ${missionType}`;
}

// Builds the exact Part B JSON object per the intake spec. attachments is an
// array of filename strings (not file contents).
function buildIntakeJson(fields, { submissionId, submittedAtUtc }) {
  return {
    intake_channel: "website",
    submission_id: submissionId,
    submitted_at_utc: submittedAtUtc,
    client: orEmptyString(fields.client),
    organization: orEmptyString(fields.organization),
    site_address: orEmptyString(fields.site_address),
    mission_type: orEmptyString(fields.mission_type),
    requested_window: orEmptyString(fields.requested_window),
    deliverables: orEmptyString(fields.deliverables),
    contact_name: orEmptyString(fields.contact_name),
    contact_phone: orEmptyString(fields.contact_phone),
    contact_email: orEmptyString(fields.contact_email),
    site_access_notes: orEmptyString(fields.site_access_notes),
    notes: orEmptyString(fields.notes),
    attachments: Array.isArray(fields.attachmentFilenames) ? fields.attachmentFilenames : []
  };
}

// Backup/notification email body: Part A short readable summary, then Part B
// the SAME fenced JSON sent to the intake endpoint, plus two fields that
// only ever appear in this email -- intake_ref (the endpoint's internal
// reference, or "NOT LOGGED" if we never got one) and endpoint_status (what
// the primary endpoint call actually returned). Never sent to the browser.
function buildBackupEmailBody(fields, azurePayload, { intakeRef, endpointStatus }) {
  const lines = [
    "New mission request submitted through the DØi Labs website.",
    "",
    `Client/Organization: ${orNotProvided(fields.client)} / ${orNotProvided(fields.organization)}`,
    `Mission Type: ${orNotProvided(fields.mission_type)}`,
    `Site Address: ${orNotProvided(fields.site_address)}`,
    `Requested Window: ${orNotProvided(fields.requested_window)}`,
    `Deliverables: ${orNotProvided(fields.deliverables)}`,
    `Contact: ${orNotProvided(fields.contact_name)} — ${orNotProvided(fields.contact_email)} — ${orNotProvided(fields.contact_phone)}`,
    `Attachments: ${azurePayload.attachments.length ? azurePayload.attachments.join(", ") : "none"}`,
    `Intake endpoint status: ${endpointStatus}${intakeRef ? " (ref " + intakeRef + ")" : ""}`
  ];
  if (fields.extraContext) {
    lines.push("", "Additional project context (not part of the structured record below):", fields.extraContext);
  }
  const emailJson = {
    ...azurePayload,
    intake_ref: intakeRef || "NOT LOGGED",
    endpoint_status: String(endpointStatus)
  };
  lines.push(
    "",
    "--- Structured record (do not edit) ---",
    "```json",
    JSON.stringify(emailJson, null, 2),
    "```"
  );
  return lines.join("\n");
}

// Client-facing acknowledgement. Deliberately makes no promises about dates,
// availability, pricing, FAA/airspace approval, or results.
function buildClientConfirmationEmail(fields) {
  const name = (fields.client || "").trim();
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subject = "DØi Labs – Request Received";
  const text = [
    greeting,
    "",
    "Thanks for reaching out to DØi Labs. We've received your mission request and a member of our team will review it and follow up with you directly.",
    "",
    "If you need to reach us in the meantime, reply to this email or call 310.299.7401.",
    "",
    "— DØi Labs"
  ].join("\n");
  return { subject, text };
}

export {
  NOT_PROVIDED,
  ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES,
  isValidEmail,
  isValidPhone,
  isValidUuid,
  orNotProvided,
  orEmptyString,
  validateSubmission,
  validateAttachments,
  buildSubject,
  buildIntakeJson,
  buildBackupEmailBody,
  buildClientConfirmationEmail
};
