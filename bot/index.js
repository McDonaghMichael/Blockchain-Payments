const { Client, Events, GatewayIntentBits } = require("discord.js");
const commandHandler = require("./commands/commandHandler");
const path = require("path");
const { sendWalletsBackup } = require("../utils/backup");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const BOT_TOKEN = process.env.DISCORD_TOKEN;

client.setMaxListeners(50);

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot → ${client.user.tag} online`);
  try {
    await commandHandler(client, BOT_TOKEN);
    console.log(`✨ Bot is fully ready!`);
  } catch (err) {
    console.error(`❌ Command handler failed: ${err}`);
  }

  setInterval(
    async () => {
      await sendWalletsBackup();
    },
    60 * 60 * 1000,
  );
});

client.login(BOT_TOKEN).catch((err) => {
  console.error(`❌ Bot startup failure: ${err}`);
});
