function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

function buildAllowlist() {
  return (process.env.IP_ALLOWLIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function ipAllowed(ip, allowlist) {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(ip);
}

module.exports = { getClientIp, buildAllowlist, ipAllowed };
