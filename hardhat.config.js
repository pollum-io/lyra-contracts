require("@nomicfoundation/hardhat-toolbox")
require("@openzeppelin/hardhat-upgrades")
require("@nomiclabs/hardhat-vyper")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("dotenv").config()

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const DEPLOYER_KEY =
	process.env.DEPLOYER_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY

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
				version: "0.4.22"
			}
		]
	},
	networks: {
		hardhat: {
			chainId: 1337,
		},
		sepolia: {
			url: "https://eth-sepolia.g.alchemy.com/v2/" + ALCHEMY_API_KEY,
			chainId: 11155111,
			accounts: [DEPLOYER_KEY],
			confirmations: 2,
		},
	},
	etherscan: {
		apiKey: {
			sepolia: ETHERSCAN_API_KEY,
		},
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
	},
}
