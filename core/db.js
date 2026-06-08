const fs = require("fs");
const { DB_PATH } = require("./config");
const { deriveEvm, deriveBtc } = require("./derive");

function readDb() {
  if (!fs.existsSync(DB_PATH))
    return { nextIndex: 0, wallets: [], payments: [] };
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (!db.payments) db.payments = [];
  return db;
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function allocateIndex() {
  const db = readDb();
  const index = db.nextIndex;
  db.nextIndex++;
  writeDb(db);
  return index;
}

function createWallet(label = "") {
  const db = readDb();
  const entry = {
    index: db.nextIndex,
    label,
    evmAddress: deriveEvm(db.nextIndex),
    btcAddress: deriveBtc(db.nextIndex),
    createdAt: new Date().toISOString(),
  };
  db.wallets.push(entry);
  db.nextIndex++;
  writeDb(db);
  return entry;
}

function listWallets() {
  return readDb().wallets;
}

function savePayment(payment) {
  const db = readDb();
  db.payments.push(payment);
  writeDb(db);
}

function getPayment(id) {
  return readDb().payments.find((p) => p.id === id) ?? null;
}

function updatePayment(id, fields) {
  const db = readDb();
  const p = db.payments.find((p) => p.id === id);
  if (!p) return null;
  Object.assign(p, fields);
  writeDb(db);
  return p;
}

function listPayments(status = null) {
  const payments = readDb().payments;
  return status ? payments.filter((p) => p.status === status) : payments;
}

module.exports = {
  allocateIndex,
  createWallet,
  listWallets,
  savePayment,
  getPayment,
  updatePayment,
  listPayments,
};
