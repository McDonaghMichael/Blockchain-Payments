const bip39 = require("bip39");
const { hdkey } = require("ethereumjs-wallet");
const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const { BIP32Factory } = require("bip32");
const { MNEMONIC } = require("./config");
const { encrypt } = require("../utils/encryption");

const LTC_NETWORK = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

function deriveEvm(index) {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const master = hdkey.fromMasterSeed(seed);
  const child = master.derivePath(`m/44'/60'/0'/0/${index}`);
  const wallet = child.getWallet();
  return {
    address: wallet.getAddressString().toLowerCase(),
    privateKey: encrypt(wallet.getPrivateKeyString()),
  };
}

function deriveLTC(index) {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const root = bitcoin.bip32.fromSeed(seed, LTC_NETWORK);
  const child = root.derivePath(`m/44'/2'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2pkh({
    pubkey: child.publicKey,
    network: LTC_NETWORK,
  });
  return {
    address,
    privateKey: encrypt(child.toWIF()),
  };
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
  return {
    address,
    privateKey: encrypt(child.toWIF()),
  };
}

function indexFromDiscordId(discordIdStr) {
  return Number(BigInt(discordIdStr) % 2147483648n);
}

module.exports = { deriveEvm, deriveBtc, indexFromDiscordId, deriveLTC };
