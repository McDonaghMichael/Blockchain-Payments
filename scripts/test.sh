#!/bin/bash

BASE="http://localhost:3000"
BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

header() { echo -e "\n${BOLD}${CYAN}── $1 ${RESET}"; }
ok()     { echo -e "${GREEN}✓ $1${RESET}"; }
err()    { echo -e "${RED}✗ $1${RESET}"; }

json() { echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"; }

# ── 1. Create ETH USDC payment ────────────────────────────────────────────────
header "POST /api/payment — 90 EUR in ETH USDC"
ETH_RES=$(curl -s -X POST "$BASE/api/payment" \
  -H "Content-Type: application/json" \
  -d '{"amountEur": 90, "chain": "eth"}')
json "$ETH_RES"
ETH_ID=$(echo "$ETH_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$ETH_ID" ] && ok "Payment ID: $ETH_ID" || err "Failed to parse payment ID"

# ── 2. Create Polygon USDC payment ───────────────────────────────────────────
header "POST /api/payment — 50 EUR in Polygon USDC"
POLY_RES=$(curl -s -X POST "$BASE/api/payment" \
  -H "Content-Type: application/json" \
  -d '{"amountEur": 50, "chain": "polygon", "webhookUrl": "https://webhook.site/test"}')
json "$POLY_RES"
POLY_ID=$(echo "$POLY_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$POLY_ID" ] && ok "Payment ID: $POLY_ID" || err "Failed to parse payment ID"

# ── 3. Create BTC payment ─────────────────────────────────────────────────────
header "POST /api/payment — 200 EUR in Bitcoin"
BTC_RES=$(curl -s -X POST "$BASE/api/payment" \
  -H "Content-Type: application/json" \
  -d '{"amountEur": 200, "chain": "btc"}')
json "$BTC_RES"
BTC_ID=$(echo "$BTC_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$BTC_ID" ] && ok "Payment ID: $BTC_ID" || err "Failed to parse payment ID"

# ── 4. Get payment by ID ──────────────────────────────────────────────────────
header "GET /api/payment/:id — status check on ETH payment"
if [ -n "$ETH_ID" ]; then
  STATUS_RES=$(curl -s "$BASE/api/payment/$ETH_ID")
  json "$STATUS_RES"
  STATUS=$(echo "$STATUS_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  ok "Status: $STATUS"
else
  err "Skipped — no ETH payment ID"
fi

# ── 5. List all pending payments ──────────────────────────────────────────────
header "GET /api/payments?status=pending"
json "$(curl -s "$BASE/api/payments?status=pending")"

# ── 6. List all payments ──────────────────────────────────────────────────────
header "GET /api/payments — all"
json "$(curl -s "$BASE/api/payments")"

# ── 7. Error: missing chain ───────────────────────────────────────────────────
header "POST /api/payment — bad chain (expect 400)"
BAD_RES=$(curl -s -w "\nHTTP %{http_code}" -X POST "$BASE/api/payment" \
  -H "Content-Type: application/json" \
  -d '{"amountEur": 10, "chain": "solana"}')
echo "$BAD_RES"

# ── 8. Error: invalid amount ──────────────────────────────────────────────────
header "POST /api/payment — negative amount (expect 400)"
BAD2_RES=$(curl -s -w "\nHTTP %{http_code}" -X POST "$BASE/api/payment" \
  -H "Content-Type: application/json" \
  -d '{"amountEur": -5, "chain": "eth"}')
echo "$BAD2_RES"

# ── 9. Error: payment not found ───────────────────────────────────────────────
header "GET /api/payment/fake-id (expect 404)"
curl -s -w "\nHTTP %{http_code}" "$BASE/api/payment/00000000-0000-0000-0000-000000000000"

echo -e "\n${BOLD}Done.${RESET}\n"
