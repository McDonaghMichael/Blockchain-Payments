const fs = require('fs');
const { DB_PATH } = require('./config');

function readDb() {
    if (!fs.existsSync(DB_PATH)) return { nextIndex: 0, wallets: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createWallet(label = '') {
    const db    = readDb();
    const entry = { index: db.nextIndex, label, createdAt: new Date().toISOString() };
    db.wallets.push(entry);
    db.nextIndex++;
    writeDb(db);
    return entry;
}

function listWallets() {
    return readDb().wallets;
}

module.exports = { createWallet, listWallets };
