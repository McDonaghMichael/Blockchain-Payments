const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY, "salt", 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(data) {
  const [iv, tag, encrypted] = data
    .split(":")
    .map((p) => Buffer.from(p, "hex"));
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

module.exports = { encrypt, decrypt };
