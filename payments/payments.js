const { randomUUID } = require("crypto");
const { ethers } = require("ethers");
const {
  ETH_WS,
  POLYGON_WS,
  USDC_ETH,
  USDC_POLYGON,
  PAYMENT_TOLERANCE,
} = require("../core/config");
const {
  allocateIndex,
  savePayment,
  getPayment,
  updatePayment,
  listPayments,
} = require("../core/db");
const { deriveEvm, deriveBtc } = require("../core/derive");
const { waitForUsdc } = require("../listeners/usdcListener");
const { waitForEth } = require("../listeners/ethListener");
const { waitForBtc } = require("../listeners/btcListener");
const { eurToCrypto } = require("./prices");

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const active = new Map();

async function createPayment({ amountEur, chain, webhookUrl = null }) {
  const walletIndex = allocateIndex();
  const address =
    chain === "btc" ? deriveBtc(walletIndex) : deriveEvm(walletIndex);
  const amountCrypto = await eurToCrypto(amountEur, chain);
  const currency = chain === "btc" ? "BTC" : "USDC";

  const payment = {
    id: randomUUID(),
    walletIndex,
    chain,
    amountEur,
    amountCrypto,
    currency,
    address,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
    confirmedAt: null,
    amountReceived: null,
    txHash: null,
    from: null,
    webhookUrl,
  };

  savePayment(payment);
  _startListener(payment);
  return payment;
}

function _startListener(payment) {
  const { id, chain, address, amountCrypto } = payment;

  // Auto-expire after deadline
  const expiresIn = Math.max(new Date(payment.expiresAt) - Date.now(), 0);
  const expiryTimer = setTimeout(() => {
    if (!active.has(id)) return;
    active.delete(id);
    updatePayment(id, { status: "expired" });
    console.log(`[payments] ${id} expired`);
  }, expiresIn);

  active.set(id, { expiryTimer });

  // Build the appropriate listener promise, applying tolerance floor
  const toleranceFactor = BigInt(Math.round((1 - PAYMENT_TOLERANCE) * 1000));
  let listenerPromise;
  if (chain === "btc") {
    const minSats = Math.floor(
      parseFloat(amountCrypto) * 1e8 * (1 - PAYMENT_TOLERANCE),
    );
    listenerPromise = waitForBtc(address, minSats);
  } else if (chain === "eth_native") {
    const minWei = (ethers.parseEther(amountCrypto) * toleranceFactor) / 1000n;
    listenerPromise = waitForEth(ETH_WS, address, minWei);
  } else {
    const wsUrl = chain === "eth" ? ETH_WS : POLYGON_WS;
    const contractAddr = chain === "eth" ? USDC_ETH : USDC_POLYGON;
    const networkLabel = chain === "eth" ? "Ethereum" : "Polygon";
    const minUnits =
      (ethers.parseUnits(amountCrypto, 6) * toleranceFactor) / 1000n;
    listenerPromise = waitForUsdc(
      networkLabel,
      wsUrl,
      contractAddr,
      address,
      minUnits,
    );
  }

  listenerPromise
    .then((result) => {
      if (!active.has(id)) return; // already expired
      clearTimeout(active.get(id).expiryTimer);
      active.delete(id);

      const confirmed = updatePayment(id, {
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
        amountReceived: result.amount,
        txHash: result.txHash,
        from: result.from ?? null,
      });

      console.log(
        `[payments] ${id} confirmed — ${result.amount} ${payment.currency}`,
      );
      _fireWebhook(confirmed);
    })
    .catch((err) => {
      console.error(`[payments] listener error (${id}): ${err.message}`);
      active.delete(id);
    });
}

function _fireWebhook(payment) {
  if (!payment.webhookUrl) return;
  fetch(payment.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "payment.confirmed", payment }),
  }).catch((err) => console.error(`[webhook] ${err.message}`));
}

// Called on server start — resumes listeners for any payments that survived a restart
function resumePending() {
  const pending = listPayments("pending");
  for (const p of pending) {
    if (new Date(p.expiresAt) <= new Date()) {
      updatePayment(p.id, { status: "expired" });
    } else {
      _startListener(p);
      console.log(`[payments] resumed listener for ${p.id}`);
    }
  }
}

module.exports = { createPayment, resumePending };
