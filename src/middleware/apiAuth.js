const { ApiKey, User } = require("../models");
const { sha256Hex } = require("../crypto");

async function requireApiAuth(req, res, next) {
  const userId = String(req.headers["x-user-id"] || "");
  const apiKey = String(req.headers["x-api-key"] || "");

  if (!userId || !apiKey) {
    return res.status(401).json({ ok: false, error: "MISSING_X_USER_ID_OR_X_API_KEY" });
  }

  const keyHash = sha256Hex(apiKey);

  const row = await ApiKey.findOne({
    where: { userId, keyHash, revokedAt: null }
  });

  if (!row) return res.status(401).json({ ok: false, error: "INVALID_API_KEY" });

  // ensure user exists
  await User.findOrCreate({ where: { id: userId }, defaults: { id: userId } });

  // best effort last used
  row.lastUsedAt = new Date();
  row.save().catch(() => {});

  req.auth = { userId, apiKeyId: row.id };
  next();
}

module.exports = { requireApiAuth };
