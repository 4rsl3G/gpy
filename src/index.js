require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const { initDb } = require("./models");
const { buildAllowlist, ipAllowed, getClientIp } = require("./middleware/ipGuard");

const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

async function main() {
  // safety checks
  if (!process.env.TOKEN_ENC_KEY_V1) {
    throw new Error("Missing TOKEN_ENC_KEY_V1 (encryption key). Check .env");
  }

  await initDb();

  const app = express();
  app.set("trust proxy", true);

  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));
  app.use(morgan("combined"));

  const allowlist = buildAllowlist();

  // global ip allowlist (optional)
  app.use((req, res, next) => {
    const ip = getClientIp(req);
    if (!ipAllowed(ip, allowlist)) return res.status(403).json({ ok: false, error: "IP_NOT_ALLOWED" });
    next();
  });

  app.get("/health", (req, res) => res.json({ ok: true }));

  // public api
  app.use("/v1", publicRoutes);

  // hidden admin api
  const adminPath = process.env.ADMIN_PATH || "/admin";
  app.use(adminPath, adminRoutes);

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`✅ Server listening :${port}`);
    console.log(`🔐 Admin API path: ${adminPath}`);
  });
}

main().catch((e) => {
  console.error("BOOT_ERROR:", e);
  process.exit(1);
});
