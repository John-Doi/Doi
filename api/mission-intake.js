const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 2000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!process.env.POWER_AUTOMATE_WEBHOOK_URL) {
    return res.status(503).json({ success: false, error: "Service unavailable" });
  }

  try {
    const payload = req.body;

    const requiredFields = ["clientName", "clientEmail", "clientPhone", "missionType"];
    for (const field of requiredFields) {
      if (!payload[field]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    if (!EMAIL_RE.test(payload.clientEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    for (const [key, val] of Object.entries(payload)) {
      if (typeof val === "string" && val.length > MAX_LEN) {
        return res.status(400).json({ success: false, error: `Field too long: ${key}` });
      }
    }

    const response = await fetch(process.env.POWER_AUTOMATE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: "Power Automate request failed" });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
