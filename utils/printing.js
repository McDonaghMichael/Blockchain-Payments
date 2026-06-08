const { deriveBtc, deriveEvm } = require("../core/derive");

function line(char = "─", len = 56) {
  return char.repeat(len);
}

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

module.exports = { line, printWalletTable };
