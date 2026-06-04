// Fetches live EUR → crypto rates from CoinGecko (free, no key needed)

const COINGECKO_IDS = {
    eth:        'usd-coin', // USDC is USD-pegged; we get EUR/USD via USDC price
    polygon:    'usd-coin',
    btc:        'bitcoin',
    eth_native: 'ethereum',
};

async function eurToCrypto(amountEur, chain) {
    const id  = COINGECKO_IDS[chain];
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`);
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();

    const eurPerUnit = data[id].eur;
    const units      = amountEur / eurPerUnit;

    if (chain === 'btc')        return units.toFixed(8);
    if (chain === 'eth_native') return units.toFixed(6);
    return units.toFixed(2);
}

module.exports = { eurToCrypto };
