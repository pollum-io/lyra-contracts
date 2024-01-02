// All supported networks and related contract addresses are defined here.
//
// LINK token addresses: https://docs.chain.link/resources/link-token-contracts/
// Price feeds addresses: https://docs.chain.link/data-feeds/price-feeds/addresses
// Chain IDs: https://chainlist.org/?testnets=true

// Loads environment variables from .env.enc file (if it exists)
require("dotenv").config()
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2

const npmCommand = process.env.npm_lifecycle_event
const isTestEnvironment = npmCommand == "test" || npmCommand == "test:unit"

// Set EVM private keys (required)
const PRIVATE_KEY =
	process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"

// TODO @dev - set this to run the accept.js task.
const SECOND_PRIVATE_KEY = process.env.SECOND_PRIVATE_KEY

if (!isTestEnvironment && !PRIVATE_KEY) {
	throw Error("Set the PRIVATE_KEY environment variable with your EVM wallet private key")
}

const accounts = []
if (PRIVATE_KEY) {
	accounts.push(PRIVATE_KEY)
}
if (SECOND_PRIVATE_KEY) {
	accounts.push(SECOND_PRIVATE_KEY)
}

const networks = {
	ethereum: {
		url: "https://rpc-evm-sidechain.xrpl.org",
		gasPrice: undefined,
		nonce: undefined,
		accounts,
		verifyApiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
		chainId: 1440002,
		confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
		nativeCurrencySymbol: "XRP",
	},
	polygonMumbai: {
		url: process.env.POLYGON_MUMBAI_RPC_URL || "UNSET",
		gasPrice: 20_000_000_000,
		nonce: undefined,
		accounts,
		verifyApiKey: process.env.POLYGONSCAN_API_KEY || "UNSET",
		chainId: 80001,
		confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
		nativeCurrencySymbol: "MATIC",
		linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
		linkPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528", // LINK/MATIC
		functionsRouter: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
		donId: "fun-polygon-mumbai-1",
		gatewayUrls: [
			"https://01.functions-gateway.testnet.chain.link/",
			"https://02.functions-gateway.testnet.chain.link/",
		],
		uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
	},
}

module.exports = {
	networks,
}
