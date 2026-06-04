const path = require('path');

require('dotenv').config({ 
    path: path.resolve(__dirname, '../.env') 
});

module.exports = {
    MNEMONIC:          process.env.PHRASE,
    API_KEY:           process.env.API_KEY,
    ETH_WS:            process.env.ETH_WS_URL,
    POLYGON_WS:        process.env.POLYGON_WS_URL,
    USDC_ETH:          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDC_POLYGON:      "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    ERC20_ABI:         ["event Transfer(address indexed from, address indexed to, uint256 value)"],
    DB_PATH:           path.join(__dirname, 'wallets.json'),
    PAYMENT_TOLERANCE: 0.01,
    WALLETS_WEBHOOK_URL: process.env.WALLETS_WEBHOOK_URL || null,
};
