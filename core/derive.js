const bip39 = require("bip39");
const { hdkey } = require("ethereumjs-wallet");
const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const { BIP32Factory } = require("bip32");
const { MNEMONIC } = require("./config");

function deriveEvm(index) {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const master = hdkey.fromMasterSeed(seed);
  const child = master.derivePath(`m/44'/60'/0'/0/${index}`);
  return child.getWallet().getAddressString().toLowerCase();
}

function deriveBtc(index) {
  const bip32 = BIP32Factory(ecc);
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
  const child = root.derivePath(`m/84'/0'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: bitcoin.networks.bitcoin,
  });
  return address;
}

function indexFromDiscordId(discordIdStr) {
  return Number(BigInt(discordIdStr) % 2147483648n);
}

module.exports = { deriveEvm, deriveBtc, indexFromDiscordId };
