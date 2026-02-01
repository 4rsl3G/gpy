const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth");
const { User, ApiKey } = require("../models");
const { sha256Hex, randomApiKey, randomUserId } = require("../crypto");
const { clearTokens } = require("../gobizEngine");

const router = express.Router();
router.use(requireAdmin);

// Create user + apiKey (apiKey tampil sekali)
router.post("/users", async (req, res) => {
  const name = String(req.body?.name || "").slice(0, 80) || null;

  const userId = randomUserId();
  await User.create({ id: userId });

  const apiKey = randomApiKey("pk");
  await ApiKey.create({ userId, keyHash: sha256Hex(apiKey), name });

  res.json({
    ok: true,
    userId,
    apiKey,
    note: "Simpan apiKey ini. DB hanya menyimpan hash, tidak bisa ditampilkan lagi."
  });
});

// List users
router.get("/users", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 200), 500);
  const users = await User.findAll({ order: [["createdAt", "DESC"]], limit });

  const activeKeys = await ApiKey.findAll({
    attributes: ["userId"],
    where: { revokedAt: null },
    raw: true
  });

  const map = new Map();
  for (const k of activeKeys) map.set(k.userId, (map.get(k.userId) || 0) + 1);

  res.json({
    ok: true,
    users: users.map(u => ({
      id: u.id,
      createdAt: u.createdAt,
      merchantId: u.merchantId || null,
      activeKeys: map.get(u.id) || 0
    }))
  });
});

// Create new apiKey for existing user
router.post("/users/:userId/keys", async (req, res) => {
  const userId = String(req.params.userId || "");
  const name = String(req.body?.name || "").slice(0, 80) || null;

  const u = await User.findByPk(userId);
  if (!u) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

  const apiKey = randomApiKey("pk");
  await ApiKey.create({ userId, keyHash: sha256Hex(apiKey), name });

  res.json({
    ok: true,
    userId,
    apiKey,
    note: "Simpan apiKey ini. DB hanya menyimpan hash."
  });
});

// List keys (tanpa key asli)
router.get("/keys", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 300), 800);
  const keys = await ApiKey.findAll({ order: [["createdAt", "DESC"]], limit });

  res.json({
    ok: true,
    keys: keys.map(k => ({
      id: k.id,
      userId: k.userId,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt
    }))
  });
});

// Revoke key
router.post("/keys/:id/revoke", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ ok: false, error: "BAD_ID" });

  const k = await ApiKey.findByPk(id);
  if (!k) return res.status(404).json({ ok: false, error: "KEY_NOT_FOUND" });

  if (!k.revokedAt) {
    k.revokedAt = new Date();
    await k.save();
  }

  res.json({ ok: true, id: k.id, revokedAt: k.revokedAt });
});

// Force logout user (hapus token terenkripsi di DB + drop session in-memory)
router.post("/users/:userId/logout", async (req, res) => {
  const userId = String(req.params.userId || "");
  const u = await User.findByPk(userId);
  if (!u) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

  // hapus token di DB + session
  await clearTokens(userId, { userId, seenTx: new Set() });

  res.json({ ok: true, userId, loggedOut: true });
});

module.exports = router;
