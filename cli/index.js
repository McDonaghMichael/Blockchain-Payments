const { createInterface } = require("readline/promises");
const { actionCreate, actionPay, actionList } = require("./actions");
const { MNEMONIC } = require("../core/config");
const { sendWalletsBackup } = require("../utils/backup");

async function main() {
  if (!MNEMONIC) {
    console.error("Error: MNEMONIC not set in .env");
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║       Blockchain Payment Manager     ║");
  console.log("╚══════════════════════════════════════╝");

  while (true) {
    console.log(
      "\n  1) List wallets\n  2) Create new wallet\n  3) Process payment\n  4) Send Wallet Backup\n  5) Exit\n",
    );
    const choice = (await rl.question("  > ")).trim();

    switch (choice) {
      case "1":
        await actionList();
        break;
      case "2":
        await actionCreate(rl);
        break;
      case "3":
        await actionPay(rl);
        break;
      case "4":
        await sendWalletsBackup();
        break;
      case "5":
        console.log("Exiting...");
        rl.close();
        process.exit(0);
      default:
        console.log("Invalid choice.");
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
