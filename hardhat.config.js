require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    // Hardhat's own built-in local blockchain (no extra install needed)
    hardhat: {},
    // Ganache — if you run Ganache GUI/CLI separately, it listens here by default
    ganache: {
      url: "http://127.0.0.1:7545",
      // chainId: 1337  // uncomment/adjust if your Ganache shows a different chain id
    },
  },
};
