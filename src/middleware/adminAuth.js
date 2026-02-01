function parseBasicAuth(req) {
  const h = String(req.headers.authorization || "");
  if (!h.startsWith("Basic ")) return null;

  const b64 = h.slice(6).trim();
  try {
    const raw = Buffer.from(b64, "base64").toString("utf8");
    const idx = raw.indexOf(":");
    if (idx === -1) return null;
    return { user: raw.slice(0, idx), pass: raw.slice(idx + 1) };
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const creds = parseBasicAuth(req);
  if (!creds) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).json({ ok: false, error: "ADMIN_AUTH_REQUIRED" });
  }

  if (creds.user !== process.env.ADMIN_USER || creds.pass !== process.env.ADMIN_PASS) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).json({ ok: false, error: "INVALID_ADMIN_CREDENTIALS" });
  }

  next();
}

module.exports = { requireAdmin };
