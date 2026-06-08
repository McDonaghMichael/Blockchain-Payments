const { listWallets } = require("../core/db");
const { deriveBtc, deriveEvm } = require("../core/derive");

function validateWallets() {
  const results = [];

  let mismatchDetected = false;

  for (const wallet of listWallets()) {
    const { index, label } = wallet;

    const storedEvm =
      typeof wallet.evmAddress === "object"
        ? wallet.evmAddress?.address
        : wallet.evmAddress;
    const storedBtc =
      typeof wallet.btcAddress === "object"
        ? wallet.btcAddress?.address
        : wallet.btcAddress;

    if (!storedEvm && !storedBtc) {
      results.push({ index, label, status: "⚠️  SKIPPED (no addresses)" });
      continue;
    }

    // Re-derive from master phrase
    const derivedEvm = storedEvm ? deriveEvm(index) : null;
    const derivedBtc = storedBtc ? deriveBtc(index) : null;

    const evmMatch = derivedEvm
      ? derivedEvm.address === storedEvm.toLowerCase()
      : null;
    const btcMatch = derivedBtc ? derivedBtc.address === storedBtc : null;

    const ok = evmMatch !== false && btcMatch !== false;

    if (!ok) {
      mismatchDetected = true;
    }

    results.push({
      index,
      label: label || " ",
      evmMatch: evmMatch === null ? ":" : evmMatch ? "✅" : "❌",
      btcMatch: btcMatch === null ? ":" : btcMatch ? "✅" : "❌",
      status: ok ? "✅ OK" : "🚨 MISMATCH",
    });
  }

  console.log("\nWallet Verification Report");
  console.log("=".repeat(55));
  for (const r of results) {
    if (r.status.includes("SKIPPED")) {
      console.log(`  [${r.index}] ${r.label} : ${r.status}`);
    } else {
      console.log(
        `  [${r.index}] ${r.label.padEnd(12)} EVM: ${r.evmMatch}  BTC: ${r.btcMatch}  ${r.status}`,
      );
    }
  }
  console.log("=".repeat(55));

  const mismatches = results.filter((r) => r.status.includes("MISMATCH"));
  if (mismatches.length === 0) {
    console.log("✅ All wallets verified against master phrase.\n");
  } else {
    console.log(`🚨 ${mismatches.length} mismatch(es) found!\n`);
  }

  return mismatchDetected;
}

module.exports = { validateWallets };
