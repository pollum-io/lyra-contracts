require("@nomicfoundation/hardhat-toolbox")
require("@openzeppelin/hardhat-upgrades")
require("@nomiclabs/hardhat-vyper")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("./tasks/deployAutoConsumer")
require("./tasks/setAutoRequest")
require("./tasks/readConsumer")
require("./tasks/checkUpkeep")
require("./tasks/performUpkeep")
require("./tasks/subscriptionInfo")
const { networks } = require("./networks")
require("dotenv").config()
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.19",
				settings: {
					optimizer: {
						enabled: true,
						runs: 1000,
					},
				},
			},
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
	defaultNetwork: "localFunctionsTestnet",
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
