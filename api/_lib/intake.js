// Pure helpers for the mission-intake email pipeline. Kept dependency-free and
// side-effect-free (no network, no env reads) so they're directly unit
// testable -- see tests/mission-intake.test.js.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts common phone punctuation (+, spaces, dashes, parens, dots); the
// digit count (checked separately below) is what actually bounds validity.
const PHONE_RE = /^[+()\d\s.-]{1,25}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
// Used only by the legacy single-field fallback in resolveSiteAddress.
// Anchored to the END of the (trimmed) string, matching where a ZIP
// actually appears in a real "...City, ST 91351" address -- an
// unanchored "any 5 digits anywhere" check false-positives on a 5-digit
// street number (e.g. "19200 Soledad Canyon Road" has no ZIP at all, but
// "19200" would otherwise match). Still just a structural signal, not a
// full address parse (deliberately avoided -- no geocoding/address API,
// per spec).
const EMBEDDED_ZIP_RE = /\d{5}(?:-\d{4})?$/;

// 50 states + DC + the 5 inhabited territories, the standard USPS set.
const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI",
  "WY", "AS", "GU", "MP", "PR", "VI"
];

const NOT_PROVIDED = "NOT PROVIDED";
const ATTACHMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic"];
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB total
const MAX_ATTACHMENT_COUNT = 10;
const MAX_FILENAME_LENGTH = 255; // the intake endpoint 422s on names longer than this

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
  extraContext: 4000,
  // The four parts behind the server-composed site_address above (see
  // resolveSiteAddress) -- match the index.html input maxlengths exactly,
  // same convention as every other field here.
  site_street: 200,
  site_city: 100,
  site_state: 2,
  site_zip: 10
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

// Validates and composes the authoritative site_address from its four parts
// (street/city/state/zip) submitted in the request body, or -- when none of
// those parts are present at all -- falls back to accepting a legacy single
// site_address field for a stale cached page that predates this 4-part
// form. The legacy value is accepted only when it already contains a ZIP,
// since that's the one structural signal checkable without a full address
// parse (deliberately not attempted here -- no geocoding/address API).
//
// Returns { valid, errors, site_address }. When valid, site_address is
// always the server's OWN composed (or legacy-accepted) value -- a
// client-supplied site_address string is never trusted or passed through
// when the four parts are present, even if it disagrees with them.
function resolveSiteAddress(body) {
  const street = String((body && body.site_street) || "").trim();
  const city = String((body && body.site_city) || "").trim();
  const state = String((body && body.site_state) || "").trim().toUpperCase();
  const zip = String((body && body.site_zip) || "").trim();
  const hasAnyPart = Boolean(street || city || state || zip);

  if (!hasAnyPart) {
    const legacyAddress = String((body && body.site_address) || "").trim();
    if (EMBEDDED_ZIP_RE.test(legacyAddress)) {
      return { valid: true, errors: [], site_address: legacyAddress.slice(0, FIELD_LIMITS.site_address) };
    }
    return { valid: false, errors: ["Site address must include street, city, state and ZIP."], site_address: "" };
  }

  const errors = [];
  if (!street) errors.push("Site street address is required.");
  if (!city) errors.push("Site city is required.");
  if (!state) errors.push("Site state is required.");
  else if (!US_STATE_CODES.includes(state)) errors.push("Site state must be a valid US state or territory code.");
  if (!zip) errors.push("Site ZIP is required.");
  else if (!ZIP_RE.test(zip)) errors.push("Site ZIP must be 5 digits (or ZIP+4).");

  if (errors.length) return { valid: false, errors, site_address: "" };

  const site_address = `${street}, ${city}, ${state} ${zip}`.slice(0, FIELD_LIMITS.site_address);
  return { valid: true, errors: [], site_address };
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
// site_address itself is validated separately, before this runs -- see
// resolveSiteAddress -- so its specific per-part errors aren't duplicated
// here; fields.site_address is only ever non-empty once that's passed.
function validateSubmission(fields) {
  const errors = [];
  const hasClientOrOrg = (fields.client || "").trim() || (fields.organization || "").trim();
  if (!hasClientOrOrg) errors.push("Provide your name or organization.");
  if (!(fields.mission_type || "").trim()) errors.push("Mission type is required.");
  if (!(fields.contact_name || "").trim()) errors.push("Contact name is required.");

  const email = (fields.contact_email || "").trim();
  const phone = (fields.contact_phone || "").trim();
  if (!email && !phone) errors.push("Provide a contact email or phone number.");
  if (email && !isValidEmail(email)) errors.push("Contact email is not a valid email address.");
  if (phone && !isValidPhone(phone)) errors.push("Contact phone is not a valid phone number.");

  return { valid: errors.length === 0, errors };
}

// Truncates a filename to MAX_FILENAME_LENGTH, keeping the extension intact
// so type-detection (which reads the part after the last ".") still works
// on the truncated name. Falls back to a hard truncate if there's no
// usable extension to preserve.
function truncateFilename(name) {
  if (name.length <= MAX_FILENAME_LENGTH) return name;
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === name.length - 1) {
    return name.slice(0, MAX_FILENAME_LENGTH);
  }
  const ext = name.slice(dotIdx);
  const base = name.slice(0, dotIdx);
  return base.slice(0, Math.max(0, MAX_FILENAME_LENGTH - ext.length)) + ext;
}

function validateAttachments(attachments) {
  const errors = [];
  const list = Array.isArray(attachments) ? attachments : [];
  if (list.length > MAX_ATTACHMENT_COUNT) {
    errors.push(`No more than ${MAX_ATTACHMENT_COUNT} attachments allowed.`);
  }
  let total = 0;
  for (const att of list) {
    // Mutated in place (not just read) so every downstream consumer --
    // the Azure payload's attachments array and the actual email
    // attachment -- sees the same truncated name the endpoint will accept.
    if (att && typeof att.filename === "string" && att.filename.length > MAX_FILENAME_LENGTH) {
      att.filename = truncateFilename(att.filename);
    }
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
      errors.push(`${name} exceeds the 3 MB per-file limit.`);
    }
    total += bytes;
  }
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
    errors.push("Total attachment size exceeds the 3 MB limit.");
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
// attachmentResults, when given, is an array of { filename, ok, status }
// from the per-file attachment-endpoint uploads (see
// api/_lib/intake-attachment.js) -- rendered as one "stored"/"not stored
// (<status>)" line per file. Omitted (undefined) when uploads were never
// attempted (e.g. the intake record itself failed), in which case the
// attachment list falls back to the plain filename list it always had.
function buildBackupEmailBody(fields, azurePayload, { intakeRef, endpointStatus, attachmentResults }) {
  const attachmentLines = Array.isArray(attachmentResults)
    ? attachmentResults.map((r) => `  - ${r.filename}: ${r.ok ? "stored" : `not stored (${r.status})`}`)
    : null;

  const lines = [
    "New mission request submitted through the DØi Labs website.",
    "",
    `Client/Organization: ${orNotProvided(fields.client)} / ${orNotProvided(fields.organization)}`,
    `Mission Type: ${orNotProvided(fields.mission_type)}`,
    `Site Address: ${orNotProvided(fields.site_address)}`,
    `Requested Window: ${orNotProvided(fields.requested_window)}`,
    `Deliverables: ${orNotProvided(fields.deliverables)}`,
    `Contact: ${orNotProvided(fields.contact_name)} — ${orNotProvided(fields.contact_email)} — ${orNotProvided(fields.contact_phone)}`,
    attachmentLines
      ? `Attachments:\n${attachmentLines.join("\n")}`
      : `Attachments: ${azurePayload.attachments.length ? azurePayload.attachments.join(", ") : "none"}`,
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
  MAX_FILENAME_LENGTH,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES,
  US_STATE_CODES,
  isValidEmail,
  isValidPhone,
  isValidUuid,
  orNotProvided,
  orEmptyString,
  truncateFilename,
  resolveSiteAddress,
  validateSubmission,
  validateAttachments,
  buildSubject,
  buildIntakeJson,
  buildBackupEmailBody,
  buildClientConfirmationEmail
};
