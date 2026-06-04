# Payment API

Base URL: `http://localhost:3000` (set `PORT` in `.env` to change)

Start the server:
```bash
node server.js
```

---

## How detection works

When a payment is created, the server opens a persistent WebSocket to the relevant network node and subscribes to incoming transactions for that specific deposit address. No polling — the node pushes the event in real time (~1–2 seconds after broadcast).

- **ETH / Polygon USDC** — subscribes to the USDC smart contract `Transfer` event via Alchemy WebSocket, filtered to the deposit address
- **Bitcoin** — subscribes to the address via Mempool.space WebSocket, fires on both mempool (unconfirmed) and confirmed transactions

Once the expected amount arrives, the payment status updates to `confirmed` and the webhook fires (if configured).

Payments expire after **1 hour** if nothing is received. On server restart, listeners are automatically resumed for any `pending` payments that haven't expired.

---

## Payment object

All endpoints return payment objects with this shape:

```json
{
  "id":             "0f746b79-97cc-4dc6-921d-9ce8fdbc4b99",
  "walletIndex":    8,
  "chain":          "eth",
  "amountEur":      90,
  "amountCrypto":   "105.00",
  "currency":       "USDC",
  "address":        "0xf4567b9304ff6b59cc78343a7f787f2b9421ef7d",
  "status":         "pending",
  "createdAt":      "2026-05-30T00:00:00.000Z",
  "expiresAt":      "2026-05-30T01:00:00.000Z",
  "confirmedAt":    null,
  "amountReceived": null,
  "txHash":         null,
  "from":           null,
  "webhookUrl":     null
}
```

| Field            | Description |
|------------------|-------------|
| `id`             | UUID, use this to poll for status |
| `walletIndex`    | HD derivation index (never reused) |
| `chain`          | `eth`, `polygon`, or `btc` |
| `amountEur`      | Original EUR amount requested |
| `amountCrypto`   | Converted crypto amount the customer must send |
| `currency`       | `USDC` or `BTC` |
| `address`        | Deposit address to show the customer |
| `status`         | `pending`, `confirmed`, or `expired` |
| `confirmedAt`    | ISO timestamp, set when payment lands |
| `amountReceived` | Actual amount received (may differ from `amountCrypto`) |
| `txHash`         | Transaction hash / ID |
| `from`           | Sender address (EVM only) |
| `webhookUrl`     | POSTed to on confirmation (if provided) |

---

## Endpoints

### Create a payment

```
POST /api/payment
```

**Body**

| Field        | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `amountEur`  | number | yes      | Amount in EUR (e.g. `90`) |
| `chain`      | string | yes      | `eth`, `polygon`, or `btc` |
| `webhookUrl` | string | no       | URL to POST to when confirmed |

**Example**

```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{"amountEur": 90, "chain": "eth", "webhookUrl": "https://example.com/webhook"}'
```

**Response `200`**

Returns the full payment object. Show `address` and `amountCrypto` to the customer.

**Response `400`**

```json
{ "error": "amountEur must be a positive number" }
{ "error": "chain must be eth, polygon, or btc" }
```

**Response `500`**

```json
{ "error": "CoinGecko error: 429" }
```

---

### Get payment status

```
GET /api/payment/:id
```

Poll this after creating a payment to check whether it has been confirmed. Typical flow: poll every 5–10 seconds until `status` is `confirmed` or `expired`.

**Example**

```bash
curl http://localhost:3000/api/payment/0f746b79-97cc-4dc6-921d-9ce8fdbc4b99
```

**Response `200`** — returns the payment object

**Response `404`**

```json
{ "error": "Payment not found" }
```

---

### List payments

```
GET /api/payments
GET /api/payments?status=pending
GET /api/payments?status=confirmed
GET /api/payments?status=expired
```

Returns an array of payment objects. Omit `status` to return all.

**Example**

```bash
curl http://localhost:3000/api/payments?status=confirmed
```

---

## Webhook

If `webhookUrl` is set, the server sends a `POST` when the payment is confirmed.

**Headers**
```
Content-Type: application/json
```

**Body**
```json
{
  "event": "payment.confirmed",
  "payment": { ...full payment object... }
}
```

Use `amountReceived` rather than `amountCrypto` to verify the exact amount that landed.

---

## Authentication

Set `API_KEY` in `.env` to protect every endpoint. If the variable is not set the API runs open (useful for local dev).

**All requests must include the header:**

```
Authorization: Bearer <your-api-key>
```

**Example**

```bash
curl http://localhost:3000/api/payments \
  -H "Authorization: Bearer mysecretkey"
```

**Response `401`** — returned when the key is missing or wrong:

```json
{ "error": "Unauthorised" }
```

Generate a strong key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Hourly wallet backup

If `WALLETS_WEBHOOK_URL` is set, the server POSTs the full contents of `wallets.json` to that URL once on startup and then every hour.

**Payload**

```json
{
  "event": "wallets.backup",
  "timestamp": "2026-05-30T12:00:00.000Z",
  "data": { ...wallets.json contents... }
}
```

---

## Environment variables

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `PHRASE`              | yes      | BIP39 seed phrase |
| `API_KEY`             | no       | Bearer token to protect the API. Open if unset. |
| `PORT`                | no       | HTTP port, default `3000` |
| `ETH_WS_URL`          | no       | Alchemy Ethereum WebSocket URL |
| `POLYGON_WS_URL`      | no       | Alchemy Polygon WebSocket URL |
| `WALLETS_WEBHOOK_URL` | no       | URL to receive hourly `wallets.json` backup |

---

## Supported chains

| `chain`      | Currency | Network          | Contract |
|--------------|----------|------------------|----------|
| `eth`        | USDC     | Ethereum mainnet | `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| `eth_native` | ETH      | Ethereum mainnet | — (native transfer) |
| `polygon`    | USDC     | Polygon mainnet  | `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359` |
| `btc`        | BTC      | Bitcoin mainnet  | — |
