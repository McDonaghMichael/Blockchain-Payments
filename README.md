# Blockchain Payments

**Blockchain Payments** is a cryptocurrency payment processing system that allows for external systems to make requests to generate payment invoices in a variety of different cryptocurrencies, receive payment status such as success, partial or failure.

### What inspired this project?
---
Existing payment software already exists such as [NowPayments](https://nowpayments.io/) however my issue with their software is that it requires setting up an account, there are fees for processing transactions, amongst other things.

Other alternatives such as [BTCPay](https://btcpayserver.org/) are great, but only support Ethereum/Polygon networks via third-party plugins. On top of that it requires running a full bitcoin node which can take upwards if 100GB disk space.

### Supported Networks
--- 
| Networks Support 	| Official Websites                           	|
|------------------	|---------------------------------------------	|
| Ethereum         	| [View Website](https://ethereum.org/)       	|
| Polygon          	| [View Website](https://polygon.technology/) 	|
| Bitcoin          	| [View Website](https://bitcoin.org/en/)     	|

### Enviormental Variable Setup

```bash
MNEMONIC="..." # BIP Phrase 24 Word Long
WALLETS_WEBHOOK_URL="..." # Discord Webhook URL for backup
PORT=... # Server Port for API
API_KEY=... # Authentication API Key

# Blockchain WebSocket API Keys
ETH_WS_URL=""
POLYGON_WS_URL=""
```

### Disclaimer
---
**Blockchain Payments** is not responsible for any unauthorised access, usage or loss of funds associated with this software. If you notice any bugs that may result in loss of funds, access, please open up an [issue here](https://github.com/McDonaghMichael/Blockchain-Payments/issues) to have it resolved. Include the steps taken, any supporting documents (screenshots, videos, etc) to help with recreating the issue.
