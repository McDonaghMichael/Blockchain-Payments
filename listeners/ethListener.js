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

module.exports = { waitForEth };
