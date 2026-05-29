const { ethers }  = require('ethers');
const WebSocket   = require('ws');
const { ERC20_ABI } = require('./config');

function waitForUsdc(label, wsUrl, contractAddr, depositAddr, minUnits) {
    return new Promise((resolve, reject) => {
        const provider = new ethers.WebSocketProvider(() => {
            const ws = new WebSocket(wsUrl);
            ws.on('error', err => reject(new Error(err.message)));
            return ws;
        });

        const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider);
        const filter   = contract.filters.Transfer(null, depositAddr);

        contract.on(filter, async (...args) => {
            const payload = args[args.length - 1];
            const { from, value } = payload.args;
            if (value < minUnits) return;
            await contract.removeAllListeners();
            provider.destroy();
            resolve({
                network:  label,
                currency: 'USDC',
                amount:   ethers.formatUnits(value, 6),
                from,
                txHash:   payload.log.transactionHash,
                block:    payload.log.blockNumber,
            });
        });
    });
}

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

module.exports = { waitForUsdc, waitForBtc };
