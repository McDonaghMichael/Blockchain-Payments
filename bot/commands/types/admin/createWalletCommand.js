const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { createWallet } = require("../../../../core/db");
const { deriveBtc, deriveEvm, deriveLTC } = require("../../../../core/derive");
const { validateWallets } = require("../../../../utils/security");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-wallet")
    .setDescription("Creates a wallet address")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Tag a user — their username will be used as the label")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("label")
        .setDescription("Custom label for the wallet")
        .setRequired(false),
    ),
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "You need administrator permissions to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const taggedUser = interaction.options.getUser("user");
    const customLabel = interaction.options.getString("label");

    let label;
    if (taggedUser) {
      label = taggedUser.username;
    } else if (customLabel) {
      label = customLabel;
    } else {
      label = "";
    }

    const entry = createWallet(label);
    const evm = deriveEvm(entry.index);
    const btc = deriveBtc(entry.index);
    const ltc = deriveLTC(entry.index);

    const embed = new EmbedBuilder()
      .setTitle(`Wallet #${entry.index}${label ? ` — ${label}` : ""}`)
      .setColor(0x5865f2)
      .setDescription(
        "> Wallet addresses are intended for one-time use cases. If you are unsure of what address to send to, please reach out to a member of staff.\n\nThe blockchain links below are used so you can see the live transaction into the wallet\n\n**WARNING** Send screenshot with transaction details **BEFORE** sending, as sending over the wrong network or address will result in loss of funds which cannot be recovered. This is your only warning.",
      )
      .addFields(
        {
          name: "Ethereum Address (ETH, USDC, EURC)",
          value: `\`${evm.address}\`\n\n> Address is support on networks **Ethereum**, **Base**, **Polygon** & **Arbitrum**.\n[Ethereum](https://www.blockchain.com/explorer/addresses/eth/${evm.address}) | [Base](https://basescan.org/address/${evm.address}) | [Polygon](https://polygonscan.com/address/${evm.address}) | [Arbiscan](https://arbiscan.io/address/${evm.address})`,
        },
        {
          name: "LTC Address",
          value: `\`${ltc.address}\`\n[LiteCoinSpace](https://litecoinspace.org/address/${ltc.address})`,
        },
        {
          name: "BTC Address",
          value: `\`${btc.address}\`\n[Blockchain](https://www.blockchain.com/explorer/addresses/btc/${btc.address})`,
        },
      )
      .setTimestamp();

    if (taggedUser) {
      embed.setFooter({
        text: `Created for ${taggedUser.tag}`,
        iconURL: taggedUser.displayAvatarURL(),
      });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
