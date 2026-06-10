const { Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

function loadCommandFiles(dir, commands = new Collection()) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommandFiles(fullPath, commands);
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (command?.data?.name && typeof command.execute === "function") {
        commands.set(command.data.name, command);
        console.log(`📄 Loaded command: ${command.data.name}`);
      } else {
        console.warn(`⚠️ Invalid command file: ${fullPath}`);
      }
    }
  }
  return commands;
}

module.exports = async (client, token) => {
  const allowedGuilds = process.env.ALLOWED_GUILDS
    ? process.env.ALLOWED_GUILDS.split(",").map((id) => id.trim())
    : [];

  if (allowedGuilds.length === 0) {
    console.warn(
      "⚠️ No guild IDs found in ALLOWED_GUILDS. Commands won't be registered anywhere.",
    );
  }

  client.commands = loadCommandFiles(path.join(__dirname, "types"));

  if (!client.commands.size) {
    console.warn("⚠️ No commands loaded");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);

  const commandArray = [...client.commands.values()].map((cmd) =>
    cmd.data.toJSON(),
  );

  console.log(
    `🧩 Commands prepared for ${client.user.tag}:`,
    commandArray.map((c) => c.name),
  );

  if (!client.user?.id) {
    console.error("❌ client.user.id missing – aborting command registration");
    return;
  }

  for (const guildId of allowedGuilds) {
    try {
      console.log(`🛠 Registering commands for guild ${guildId}`);
      const result = await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commandArray },
      );
      console.log(`✅ ${result.length} commands registered for ${guildId}`);
    } catch (err) {
      console.error(`❌ Failed to register for ${guildId}`, err);
    }
  }

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guildId || !allowedGuilds.includes(interaction.guildId)) {
      console.warn(
        `🛑 Blocked command execution in unauthorized guild: ${interaction.guildId}`,
      );
      return interaction.reply({
        content:
          "This bot's commands are not authorized for use in this server.",
        ephemeral: true,
      });
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`❌ Error executing ${interaction.commandName}`, err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      }
    }
  });
};
