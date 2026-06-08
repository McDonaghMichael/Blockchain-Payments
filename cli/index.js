const { createInterface } = require("readline/promises");

const { actionCreate, actionPay, actionList } = require("./actions");
const { MNEMONIC } = require("../core/config");

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
