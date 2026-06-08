const QRCode = require("qrcode");
const { ethers } = require("ethers");
const { createInterface } = require("readline/promises");
const bip39 = require("bip39");
const {
  ETH_WS,
  POLYGON_WS,
  USDC_ETH,
  USDC_POLYGON,
  MNEMONIC,
} = require("../core/config");
const { createWallet, listWallets } = require("../core/db");
const { deriveEvm, deriveBtc } = require("../core/derive");
const { waitForUsdc } = require("../listeners/usdcListener");
const { waitForEth } = require("../listeners/ethListener");
const { waitForBtc } = require("../listeners/btcListener");
const { line } = require("../utils/printing");

function printWalletTable(wallets) {
  if (wallets.length === 0) {
    console.log("  No wallets yet.\n");
    return;
  }
  console.log(
    `\n  ${"#".padEnd(4)} ${"Label".padEnd(18)} ${"EVM Address".padEnd(44)} BTC Address`,
  );
  console.log(
    `  ${line("─", 4)} ${line("─", 18)} ${line("─", 44)} ${line("─", 34)}`,
  );
  for (const w of wallets) {
    const lbl = (w.label || "—").padEnd(18);
    console.log(
      `  ${String(w.index).padEnd(4)} ${lbl} ${deriveEvm(w.index).padEnd(44)} ${deriveBtc(w.index)}`,
    );
  }
  console.log();
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function actionList() {
  const wallets = listWallets();
  console.log(`\n${line()}\n  Wallets (${wallets.length} total)\n${line()}`);
  printWalletTable(wallets);
}

async function actionCreate(rl) {
  const label = (await rl.question("  Label (optional): ")).trim();
  const entry = createWallet(label);
  console.log(`\n  Created wallet #${entry.index}`);
  console.log(`  EVM Address : ${deriveEvm(entry.index)}`);
  console.log(`  BTC Address : ${deriveBtc(entry.index)}\n`);
}

async function actionPay(rl) {
  const wallets = listWallets();
  if (wallets.length === 0) {
    console.log("\n  No wallets. Create one first.\n");
    return;
  }

  console.log();
  printWalletTable(wallets);
  const idxInput = (await rl.question("  Select wallet # : ")).trim();
  const wallet = wallets.find((w) => String(w.index) === idxInput);
  if (!wallet) {
    console.log("  Invalid wallet.\n");
    return;
  }

  console.log(
    "\n  Select network:\n    1) ETH — USDC\n    2) Polygon — USDC\n    3) Bitcoin — BTC",
  );
  const chain = { 1: "eth", 2: "polygon", 3: "btc" }[
    (await rl.question("\n  Network [1/2/3]: ")).trim()
  ];
  if (!chain) {
    console.log("  Invalid choice.\n");
    return;
  }

  const currency = chain === "btc" ? "BTC" : "USDC";
  const amountRaw = (await rl.question(`  Amount (${currency}): `)).trim();
  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) {
    console.log("  Invalid amount.\n");
    return;
  }

  let address, qrContent, networkLabel;
  if (chain === "btc") {
    address = deriveBtc(wallet.index);
    qrContent = `bitcoin:${address}?amount=${amountRaw}`;
    networkLabel = "Bitcoin";
  } else {
    address = deriveEvm(wallet.index);
    qrContent = `ethereum:${address}?contractAddress=${chain === "eth" ? USDC_ETH : USDC_POLYGON}`;
    networkLabel = chain === "eth" ? "Ethereum" : "Polygon";
  }

  console.log(`\n${line()}`);
  console.log(
    `  Wallet  : #${wallet.index}${wallet.label ? ` (${wallet.label})` : ""}`,
  );
  console.log(`  Network : ${networkLabel}`);
  console.log(`  Amount  : ${amountRaw} ${currency}`);
  console.log(`  Address : ${address}`);
  console.log(line());
  console.log(
    await QRCode.toString(qrContent, { type: "terminal", small: true }),
  );
  console.log(`  Waiting for ${amountRaw} ${currency}...\n`);

  let result;
  try {
    if (chain === "eth") {
      result = await waitForUsdc(
        "Ethereum",
        ETH_WS,
        USDC_ETH,
        address,
        ethers.parseUnits(amountRaw, 6),
      );
    } else if (chain === "polygon") {
      result = await waitForUsdc(
        "Polygon",
        POLYGON_WS,
        USDC_POLYGON,
        address,
        ethers.parseUnits(amountRaw, 6),
      );
    } else {
      result = await waitForBtc(address, Math.round(amount * 1e8));
    }
  } catch (err) {
    console.error(`\n  Listener error: ${err.message}\n`);
    return;
  }

  console.log(`\n  ✓ PAYMENT CONFIRMED\n${line()}`);
  console.log(`  Network  : ${result.network}`);
  console.log(`  Amount   : ${result.amount} ${result.currency}`);
  if (result.from) console.log(`  From     : ${result.from}`);
  if (result.txHash) console.log(`  Tx Hash  : ${result.txHash}`);
  if (result.block) console.log(`  Block    : ${result.block}`);
  if (result.status) console.log(`  Status   : ${result.status}`);
  console.log(`${line()}\n`);
}

async function main() {
  if (!MNEMONIC) {
    console.error("Error: PHRASE not set in .env");
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║       Crypto Wallet Manager          ║");
  console.log("╚══════════════════════════════════════╝");

  while (true) {
    console.log(
      "\n  1) List wallets\n  2) Create new wallet\n  3) Process payment\n  4) Exit\n",
    );
    const choice = (await rl.question("  > ")).trim();
    if (choice === "1") await actionList();
    else if (choice === "2") await actionCreate(rl);
    else if (choice === "3") await actionPay(rl);
    else if (choice === "4") break;
    else console.log("  Invalid choice.");
  }

  console.log("\n  Goodbye.\n");
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
