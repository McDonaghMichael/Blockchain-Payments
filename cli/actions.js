const { createWallet, listWallets } = require("../core/db");
const { deriveEvm, deriveBtc } = require("../core/derive");
const { waitForUsdc } = require("../listeners/usdcListener");
const { waitForEth } = require("../listeners/ethListener");
const { waitForBtc } = require("../listeners/btcListener");
const { line, printWalletTable } = require("../utils/printing");
const QRCode = require("qrcode");
const { ethers } = require("ethers");

const bip39 = require("bip39");
const {
  ETH_WS,
  POLYGON_WS,
  USDC_ETH,
  USDC_POLYGON,
  MNEMONIC,
} = require("../core/config");

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

module.exports = { actionCreate, actionPay, actionList };
