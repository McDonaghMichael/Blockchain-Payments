const { createInterface } = require("readline/promises");

const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { actionCreate, actionPay, actionList } = require("./actions");
const { MNEMONIC } = require("../core/config");
const { sendWalletsBackup } = require("../utils/backup");
const { validateWallets } = require("../utils/security");
const bip39 = require("bip39");

async function main() {
  if (!MNEMONIC) {
    console.error(
      "Error: MNEMONIC not set in .env. Below is a randomly generated mnemonic phrase.",
    );
    console.log(`> ${bip39.generateMnemonic(256)}`);
    process.exit(1);
  }

  const validatedWallets = await validateWallets();

  if (validatedWallets) process.exit(1);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║       Blockchain Payment Manager     ║");
  console.log("╚══════════════════════════════════════╝");

  const rl = readline.createInterface({ input, output });

  while (true) {
    console.log(
      "\n  1) List wallets\n  2) Create new wallet\n  3) Process payment\n  4) Send Wallet Backup\n  5) Exit\n",
    );
    const choice = (await rl.question("  > ")).trim();

    switch (choice) {
      case "1":
        await actionList(rl);
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
