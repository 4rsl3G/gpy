const crypto = require("crypto");

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function randomApiKey(prefix = "pk") {
  return `${prefix}_${crypto.randomBytes(32).toString("hex")}`;
}

function randomUserId() {
  return crypto.randomUUID();
}

module.exports = { sha256Hex, randomApiKey, randomUserId };
