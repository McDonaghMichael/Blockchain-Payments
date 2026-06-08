const { ethers } = require("ethers");
const WebSocket = require("ws");
const { ERC20_ABI } = require("../core/config");

function waitForUsdc(label, wsUrl, contractAddr, depositAddr, minUnits) {
  return new Promise((resolve, reject) => {
    const provider = new ethers.WebSocketProvider(() => {
      const ws = new WebSocket(wsUrl);
      ws.on("error", (err) => reject(new Error(err.message)));
      return ws;
    });

    const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider);
    const filter = contract.filters.Transfer(null, depositAddr);

    contract.on(filter, async (...args) => {
      const payload = args[args.length - 1];
      const { from, value } = payload.args;
      if (value < minUnits) return;
      await contract.removeAllListeners();
      provider.destroy();
      resolve({
        network: label,
        currency: "USDC",
        amount: ethers.formatUnits(value, 6),
        from,
        txHash: payload.log.transactionHash,
        block: payload.log.blockNumber,
      });
    });
  });
}

module.exports = { waitForUsdc };
