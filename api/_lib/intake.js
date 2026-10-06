// Pure helpers for the mission-intake email pipeline. Kept dependency-free and
// side-effect-free (no network, no env reads) so they're directly unit
// testable -- see tests/mission-intake.test.js.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts common phone punctuation (+, spaces, dashes, parens, dots) and
// requires at least 7 digits -- loose on purpose, since international formats
// vary and this is a lead-gen form, not a billing system.
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

const NOT_PROVIDED = "NOT PROVIDED";
const ATTACHMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB total
const MAX_ATTACHMENT_COUNT = 10;

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

function isValidPhone(value) {
  return typeof value === "string" && PHONE_RE.test(value.trim()) && value.replace(/\D/g, "").length >= 7;
}

function orNotProvided(value) {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const str = String(value).trim();
  return str.length ? str : NOT_PROVIDED;
}

// Required: (client or organization) AND site_address AND mission_type AND
// (contact_email or contact_phone). Returns { valid, errors: string[] }.
function validateSubmission(fields) {
  const errors = [];
  const hasClientOrOrg = (fields.client || "").trim() || (fields.organization || "").trim();
  if (!hasClientOrOrg) errors.push("Provide your name or organization.");
  if (!(fields.site_address || "").trim()) errors.push("Site address is required.");
  if (!(fields.mission_type || "").trim()) errors.push("Mission type is required.");

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
    client: orNotProvided(fields.client),
    organization: orNotProvided(fields.organization),
    site_address: orNotProvided(fields.site_address),
    mission_type: orNotProvided(fields.mission_type),
    requested_window: orNotProvided(fields.requested_window),
    deliverables: orNotProvided(fields.deliverables),
    contact_name: orNotProvided(fields.contact_name),
    contact_phone: orNotProvided(fields.contact_phone),
    contact_email: orNotProvided(fields.contact_email),
    site_access_notes: orNotProvided(fields.site_access_notes),
    notes: orNotProvided(fields.notes),
    attachments: Array.isArray(fields.attachmentFilenames) ? fields.attachmentFilenames : []
  };
}

// Part A: short readable summary. Part B: fenced JSON block, exact shape.
function buildIntakeEmailBody(fields, intakeJson) {
  const who = orNotProvided(fields.client) !== NOT_PROVIDED ? fields.client : orNotProvided(fields.organization);
  const lines = [
    "New mission request submitted through the DØi Labs website.",
    "",
    `Client/Organization: ${orNotProvided(fields.client)} / ${orNotProvided(fields.organization)}`,
    `Mission Type: ${orNotProvided(fields.mission_type)}`,
    `Site Address: ${orNotProvided(fields.site_address)}`,
    `Requested Window: ${orNotProvided(fields.requested_window)}`,
    `Deliverables: ${orNotProvided(fields.deliverables)}`,
    `Contact: ${orNotProvided(fields.contact_name)} — ${orNotProvided(fields.contact_email)} — ${orNotProvided(fields.contact_phone)}`,
    `Attachments: ${intakeJson.attachments.length ? intakeJson.attachments.join(", ") : "none"}`
  ];
  if (fields.extraContext) {
    lines.push("", "Additional project context (not part of the structured record below):", fields.extraContext);
  }
  lines.push(
    "",
    "--- Structured record (do not edit) ---",
    "```json",
    JSON.stringify(intakeJson, null, 2),
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
  isValidEmail,
  isValidPhone,
  orNotProvided,
  validateSubmission,
  validateAttachments,
  buildSubject,
  buildIntakeJson,
  buildIntakeEmailBody,
  buildClientConfirmationEmail
};
