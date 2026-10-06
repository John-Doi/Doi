// Serves the PUBLIC Turnstile site key (safe to expose) so the static
// index.html never needs the key hardcoded at build time -- there is no
// build step on this site. Returns { siteKey: null } when Turnstile isn't
// configured, so the frontend can skip rendering the widget entirely.
export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ siteKey: process.env.TURNSTILE_SITE_KEY || null });
}
