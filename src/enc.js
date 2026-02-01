const crypto = require("crypto");

function currentKid() {
  return process.env.TOKEN_ENC_KID || "v1";
}

function getKeyByKid(kid) {
  const upper = String(kid || "").toUpperCase();
  const envName = `TOKEN_ENC_KEY_${upper}`;
  const hex = process.env[envName];
  if (!hex || hex.length !== 64) throw new Error(`Missing/invalid ${envName}`);
  return Buffer.from(hex, "hex");
}

// output: { kid, iv, tag, data } (iv/tag/data base64)
function encryptString(plaintext) {
  const kid = currentKid();
  const key = getKeyByKid(kid);

  const iv = crypto.randomBytes(12); // recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    kid,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

function decryptString(payload) {
  if (!payload || !payload.kid || !payload.iv || !payload.tag || !payload.data) {
    throw new Error("INVALID_ENC_PAYLOAD");
  }

  const key = getKeyByKid(payload.kid);

  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const data = Buffer.from(payload.data, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

function toEncJson(plaintext) {
  if (plaintext == null) return null;
  return JSON.stringify(encryptString(String(plaintext)));
}

function tryDecryptJson(jsonText) {
  if (!jsonText) return null;
  try {
    const payload = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
    return decryptString(payload);
  } catch {
    return null;
  }
}

module.exports = { encryptString, decryptString, toEncJson, tryDecryptJson };
