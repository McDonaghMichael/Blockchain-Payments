const { ethers } = require("ethers");
const WebSocket = require("ws");
const { ERC20_ABI } = require("../core/config");

function waitForEth(wsUrl, address, minWei) {
  return new Promise((resolve, reject) => {
    const provider = new ethers.WebSocketProvider(() => {
      const ws = new WebSocket(wsUrl);
      ws.on("error", (err) => reject(new Error(err.message)));
      return ws;
    });

    provider.on("block", async (blockNumber) => {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block) return;
        for (const tx of block.prefetchedTransactions) {
          if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;
          if (tx.value < minWei) continue;
          provider.removeAllListeners();
          provider.destroy();
          resolve({
            network: "Ethereum",
            currency: "ETH",
            amount: ethers.formatEther(tx.value),
            from: tx.from,
            txHash: tx.hash,
            block: blockNumber,
          });
          break;
        }
      } catch (_) {}
    });
  });
}

async function getETHBalance(address) {
  try {
    const response = await fetch(process.env.ETH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const wei = BigInt(data.result);

    // Convert Wei to ETH (Divide by 10^18)
    const eth = Number(wei) / 1_000_000_000_000_000_000;

    return {
      wei: wei.toString(),
      eth: eth,
    };
  } catch (error) {
    console.error("Failed to fetch ETH balance:", error);
    throw error;
  }
}

async function getTokensBalances(address) {
  try {
    const response = await fetch(process.env.ETH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [
          address,
          [
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c",
          ],
          { maxCount: 100 },
        ],
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const balances = { usdc: 0, eurc: 0 };

    if (data.result && data.result.tokenBalances) {
      for (const token of data.result.tokenBalances) {
        const contract = token.contractAddress.toLowerCase();

        const rawHex = token.tokenBalance === "0x" ? "0x0" : token.tokenBalance;
        const bigIntValue = BigInt(rawHex);

        const formattedValue = Number(bigIntValue) / 1_000_000;

        if (contract === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48") {
          balances.usdc = formattedValue;
        } else if (contract === "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c") {
          balances.eurc = formattedValue;
        }
      }
    }

    return balances;
  } catch (error) {
    console.error("Failed to fetch Token balances:", error.message);
    return { usdc: 0, eurc: 0 };
  }
}

module.exports = { waitForEth, getETHBalance, getTokensBalances };
