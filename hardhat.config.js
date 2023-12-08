require("@nomicfoundation/hardhat-toolbox")
require("@openzeppelin/hardhat-upgrades")
require("@nomiclabs/hardhat-vyper")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("./tasks")
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
	// defaultNetwork: "localFunctionsTestnet",
	networks: {
		...networks,
	},
	etherscan: {
		apiKey: {
			polygonMumbai: networks.polygonMumbai.verifyApiKey
		},
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
	},
}
