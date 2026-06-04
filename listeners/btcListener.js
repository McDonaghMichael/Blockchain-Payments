const { ethers }  = require('ethers');
const WebSocket   = require('ws');
const { ERC20_ABI } = require('../core/config');

function waitForBtc(address, minSats) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://mempool.space/api/v1/ws');
        ws.on('open',  () => ws.send(JSON.stringify({ action: 'track-address', data: address })));
        ws.on('error', err => reject(new Error(err.message)));
        ws.on('message', (raw) => {
            const msg = JSON.parse(raw.toString());
            const txs = msg['address-transactions'] ?? msg['mempool-transactions'];
            if (!txs) return;
            for (const tx of txs) {
                const sats = tx.vout
                    .filter(o => o.scriptpubkey_address === address)
                    .reduce((s, o) => s + o.value, 0);
                if (sats < minSats) continue;
                ws.close();
                resolve({
                    network:  'Bitcoin',
                    currency: 'BTC',
                    amount:   (sats / 1e8).toFixed(8),
                    txHash:   tx.txid,
                    status:   tx.status?.confirmed
                        ? `Confirmed (block ${tx.status.block_height})`
                        : 'Unconfirmed (mempool)',
                });
                break;
            }
        });
    });
}

module.exports = { waitForBtc };
