const express = require("express");
const fs = require("fs");
const {
  MNEMONIC,
  API_KEY,
  DB_PATH,
  WALLETS_WEBHOOK_URL,
} = require("../core/config");
const { getPayment, listPayments } = require("../core/db");
const { createPayment, resumePending } = require("../payments/payments");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // no key set → open (dev mode)
  const header = req.headers["authorization"] ?? "";
  if (header === `Bearer ${API_KEY}`) return next();
  res.status(401).json({ error: "Unauthorised" });
}

app.use(requireApiKey);

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/payment
// Body: { amountEur: 90, chain: 'eth'|'eth_native'|'polygon'|'btc', webhookUrl?: string }
app.post("/api/payment", async (req, res) => {
  const { amountEur, chain, webhookUrl } = req.body;

  if (typeof amountEur !== "number" || amountEur <= 0)
    return res
      .status(400)
      .json({ error: "amountEur must be a positive number" });
  if (!["eth", "eth_native", "polygon", "btc"].includes(chain))
    return res
      .status(400)
      .json({ error: "chain must be eth, eth_native, polygon, or btc" });

  try {
    const payment = await createPayment({ amountEur, chain, webhookUrl });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/:id
app.get("/api/payment/:id", (req, res) => {
  const payment = getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json(payment);
});

// GET /api/payments?status=pending|confirmed|expired
app.get("/api/payments", (req, res) => {
  res.json(listPayments(req.query.status ?? null));
});

// ── Hourly wallets.json backup webhook ───────────────────────────────────────

async function sendWalletsBackup() {
  if (!WALLETS_WEBHOOK_URL) return;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    console.error("[backup] Failed to read wallets.json");
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const ts = new Date().toISOString();

  try {
    if (WALLETS_WEBHOOK_URL.includes("discord.com")) {
      // Discord requires multipart — send wallets.json as a file attachment
      const form = new FormData();
      form.append(
        "payload_json",
        JSON.stringify({ content: `Wallet backup — ${ts}` }),
      );
      form.append(
        "file",
        new Blob([json], { type: "application/json" }),
        "wallets.json",
      );
      const res = await fetch(WALLETS_WEBHOOK_URL, {
        method: "POST",
        body: form,
      });
      if (!res.ok)
        throw new Error(`Discord responded ${res.status}: ${await res.text()}`);
    } else {
      const res = await fetch(WALLETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "wallets.backup", timestamp: ts, data }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    }
    console.log(`[backup] wallets.json sent — ${ts}`);
  } catch (err) {
    console.error(`[backup] Failed: ${err.message}`);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

function start() {
  if (!MNEMONIC) {
    console.error("PHRASE not set in .env");
    process.exit(1);
  }

  resumePending();

  if (WALLETS_WEBHOOK_URL) {
    sendWalletsBackup();
    setInterval(sendWalletsBackup, 60 * 60 * 1000);
    console.log(`[backup] Hourly wallet backup → ${WALLETS_WEBHOOK_URL}`);
  }

  app.listen(PORT, () => {
    console.log(`\nPayment API running on http://localhost:${PORT}`);
    console.log(`  POST /api/payment          — create payment`);
    console.log(`  GET  /api/payment/:id      — check status`);
    console.log(`  GET  /api/payments?status= — list all`);
    console.log(
      `  Auth: ${API_KEY ? "API key required" : "open (set API_KEY in .env to enable)"}\n`,
    );
  });
}

start();
