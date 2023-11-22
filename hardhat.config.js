require("@nomicfoundation/hardhat-toolbox")
require("@openzeppelin/hardhat-upgrades")
require("@nomiclabs/hardhat-vyper")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
const { networks } = require("./networks")
require("dotenv").config()
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  vyper: {
    compilers: [{ version: "0.3.7" }, { version: "0.2.4" }, { version: "0.2.15" }],
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    ...networks,
  },
  etherscan: {
    apiKey: {
      mainnet: networks.ethereum.verifyApiKey,
      avalanche: networks.avalanche.verifyApiKey,
      polygon: networks.polygon.verifyApiKey,
      sepolia: networks.ethereumSepolia.verifyApiKey,
      polygonMumbai: networks.polygonMumbai.verifyApiKey,
      avalancheFujiTestnet: networks.avalancheFuji.verifyApiKey,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
}
