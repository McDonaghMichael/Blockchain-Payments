const fs = require("fs");
const { DB_PATH, WALLETS_WEBHOOK_URL } = require("../core/config");

async function sendWalletsBackup() {
  if (!WALLETS_WEBHOOK_URL) return;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    console.error("[BACKUP] Failed to read wallets.json");
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
    console.log(`[BACKUP] wallets.json sent — ${ts}`);
  } catch (err) {
    console.error(`[BACKUP] Failed: ${err.message}`);
  }
}

module.exports = { sendWalletsBackup };
