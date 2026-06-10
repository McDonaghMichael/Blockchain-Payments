const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { listWallets } = require("../../../../core/db");
const { deriveEvm, deriveBtc } = require("../../../../core/derive");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-wallets")
    .setDescription("Lists all wallets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "You need administrator permissions to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const wallets = listWallets();

    if (!wallets.length) {
      return interaction.reply({
        content: "No wallets found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const PAGE_SIZE = 10;
    const pages = [];

    for (let i = 0; i < wallets.length; i += PAGE_SIZE) {
      const chunk = wallets.slice(i, i + PAGE_SIZE);
      const embed = new EmbedBuilder()
        .setTitle(`Wallets (${wallets.length} total)`)
        .setColor(0x5865f2)
        .setTimestamp();

      for (const wallet of chunk) {
        const evm = deriveEvm(wallet.index);
        const btc = deriveBtc(wallet.index);
        embed.addFields({
          name: `#${wallet.index}${wallet.label ? ` — ${wallet.label}` : ""}`,
          value: `EVM: \`${evm.address}\`\nBTC: \`${btc.address}\``,
        });
      }

      const pageNum = Math.floor(i / PAGE_SIZE) + 1;
      const totalPages = Math.ceil(wallets.length / PAGE_SIZE);
      embed.setFooter({ text: `Page ${pageNum}/${totalPages}` });
      pages.push(embed);
    }

    if (pages.length === 1) {
      return interaction.reply({
        embeds: [pages[0]],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Multi-page: send first page with prev/next buttons
    const {
      ActionRowBuilder,
      ButtonBuilder,
      ButtonStyle,
    } = require("discord.js");

    let page = 0;

    const row = (p) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === pages.length - 1),
      );

    const msg = await interaction.reply({
      embeds: [pages[0]],
      components: [row(0)],
      flags: MessageFlags.Ephemeral,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next") page++;
      else if (i.customId === "prev") page--;
      await i.update({ embeds: [pages[page]], components: [row(page)] });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
