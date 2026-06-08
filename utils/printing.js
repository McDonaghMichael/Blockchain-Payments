const { deriveBtc, deriveEvm } = require("../core/derive");
const { getBTCBalance } = require("../listeners/btcListener");
const {
  getETHBalance,
  getTokensBalances,
} = require("../listeners/ethListener");

function line(char = "─", len = 56) {
  return char.repeat(len);
}

async function printWalletTable(wallets) {
  if (wallets.length === 0) {
    console.log("  No wallets yet.\n");
    return;
  }
  console.log(
    `\n  ${"#".padEnd(4)} ${"Label".padEnd(18)} ${"BTC Address".padEnd(44)} ${"BTC Bal".padEnd(10)} ${"ETH Address".padEnd(44)} ${"ETH Bal".padEnd(7)}`,
  );
  console.log(
    `  ${line("─", 4)} ${line("─", 18)} ${line("─", 42)} ${line("─", 11)} ${line("─", 44)}  ${line("─", 37)}`,
  );
  for (const w of wallets) {
    const lbl = (w.label || "—").padEnd(18);

    const btcAddress = deriveBtc(w.index).address;
    const evmAddress = deriveEvm(w.index).address;

    const [btcbal, ethbal, tokenBal] = await Promise.all([
      getBTCBalance(btcAddress),
      getETHBalance(evmAddress),
      getTokensBalances(evmAddress),
    ]);

    console.log(
      `  ${String(w.index).padEnd(4)} ${lbl.padEnd(4)} ${btcAddress.padEnd(42)} | ` +
        `BTC: ${btcbal.btc.toFixed(2)} | ` +
        `${evmAddress.padEnd(42)} | ` +
        `ETH: ${ethbal.eth.toFixed(2)} | ` +
        `USDC: ${tokenBal.usdc.toFixed(2)} | ` +
        `EURC: ${tokenBal.eurc.toFixed(2)} | ` +
        `${new Date(w.createdAt).toLocaleDateString("en-IE")} | `,
    );
  }
  console.log();
}

module.exports = { line, printWalletTable };
