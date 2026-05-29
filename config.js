require('dotenv').config();
const path = require('path');

module.exports = {
    MNEMONIC:     process.env.PHRASE,
    ETH_WS:       process.env.ETH_WS_URL     || "wss://eth-mainnet.g.alchemy.com/v2/1GAoxF5IWZyjbKNsFf9mb",
    POLYGON_WS:   process.env.POLYGON_WS_URL || "wss://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY_HERE",
    USDC_ETH:     "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDC_POLYGON: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    ERC20_ABI:    ["event Transfer(address indexed from, address indexed to, uint256 value)"],
    DB_PATH:      path.join(__dirname, 'wallets.json'),
};
