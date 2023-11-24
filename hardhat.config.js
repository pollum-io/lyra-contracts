require("@nomicfoundation/hardhat-toolbox")
require("@openzeppelin/hardhat-upgrades")
require("@nomiclabs/hardhat-vyper")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
const { networks } = require("./networks")
require("dotenv").config()
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.18",
				settings: {
					optimizer: {
						enabled: true,
						runs: 1000,
					},
				},
			},
			{
				version: "0.4.22",
			},
		],
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
