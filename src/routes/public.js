const express = require("express");
const axios = require("axios");
const { requireApiAuth } = require("../middleware/apiAuth");

const {
  emailLogin,
  requestOTP,
  verifyOTP,
  getMerchantId,
  startMutasiListener,
  stopMutasiListener,
  sessionStatus
} = require("../gobizEngine");

const router = express.Router();

router.get("/me", requireApiAuth, async (req, res) => {
  const userId = req.auth.userId;
  res.json({ ok: true, userId, session: sessionStatus(userId) });
});

router.post("/auth/email", requireApiAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "MISSING_EMAIL_OR_PASSWORD" });

    await emailLogin(userId, String(email), String(password));
    res.json({ ok: true, userId, session: sessionStatus(userId) });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/auth/otp/request", requireApiAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { phone, countryCode } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: "MISSING_PHONE" });

    const data = await requestOTP(userId, String(phone), countryCode ? String(countryCode) : "62");
    res.json({ ok: true, userId, otpToken: data?.otp_token || data?.otpToken || data });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/auth/otp/verify", requireApiAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { otp, otpToken } = req.body || {};
    if (!otp || !otpToken) return res.status(400).json({ ok: false, error: "MISSING_OTP_OR_OTP_TOKEN" });

    await verifyOTP(userId, String(otp), String(otpToken));
    res.json({ ok: true, userId, session: sessionStatus(userId) });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/merchant", requireApiAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const merchantId = await getMerchantId(userId);
    res.json({ ok: true, userId, merchantId });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

// SSE realtime
router.get("/mutasi/stream", requireApiAuth, async (req, res) => {
  const userId = req.auth.userId;
  const intervalMs = Number(req.query.intervalMs || 15000);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const ping = setInterval(() => send("ping", { t: Date.now() }), 25000);

  try {
    const merchantId = await getMerchantId(userId);
    send("ready", { ok: true, userId, merchantId });

    startMutasiListener(
      userId,
      merchantId,
      (tx) => send("tx", tx),
      Number.isFinite(intervalMs) && intervalMs >= 3000 ? intervalMs : 15000
    );
  } catch (e) {
    send("error", { ok: false, error: String(e?.message || e) });
  }

  req.on("close", () => {
    clearInterval(ping);
    res.end();
  });
});

// webhook push
router.post("/mutasi/webhook/start", requireApiAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { webhookUrl, intervalMs } = req.body || {};
  if (!webhookUrl) return res.status(400).json({ ok: false, error: "MISSING_WEBHOOK_URL" });

  try {
    const merchantId = await getMerchantId(userId);

    startMutasiListener(
      userId,
      merchantId,
      async (tx) => {
        try {
          await axios.post(String(webhookUrl), { userId, merchantId, tx }, { timeout: 10000 });
        } catch {}
      },
      Number.isFinite(Number(intervalMs)) ? Number(intervalMs) : 15000
    );

    res.json({ ok: true, userId, merchantId, webhookUrl: String(webhookUrl) });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/mutasi/webhook/stop", requireApiAuth, async (req, res) => {
  const userId = req.auth.userId;
  stopMutasiListener(userId);
  res.json({ ok: true, userId, stopped: true });
});

module.exports = router;
