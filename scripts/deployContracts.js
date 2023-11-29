// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { networks } = require("../networks")
const hre = require("hardhat")
const createBilling = require("./createBilling");
const NEED_DEPLOY_BILLING = true;
const INTERVAL = 86400; //Value in seconds
require("dotenv").config()
async function main() {
	const networkName = network.name;
	//Deploy Drex and TSelic contracts
	const [admin] = await ethers.getSigners()
	const feeCollector = admin.address //TODO @dev replace with your fee collector address
	const DREX = await ethers.getContractFactory("DREX")
	const TSELIC29 = await ethers.getContractFactory("TSELIC29")
	let drexToken = await DREX.deploy()
	let tselicToken = await TSELIC29.deploy()
	let subscriptionId = null //TODO @dev replace with your subscription ID or set NEED_DEPLOY_BILLING to true
	await drexToken.deployed()
	await tselicToken.deployed()
	if (NEED_DEPLOY_BILLING) {
		// Run createBilling.js
		subscriptionId = await createBilling()
		console.log("Billing subscription created: ", subscriptionId)
	}
	//Deploy AutomatedFunctionsConsumer contract
	const autoConsumerAddress = await hre.run("functions-deploy-auto-consumer", {
		subid: subscriptionId.toString(),
		verify: true,
	})
	//Set automation request for auto-consumer contract
	await hre.run("functions-set-auto-request", {
		contract: autoConsumerAddress,
		subid: subscriptionId,
		interval: INTERVAL,
		simulate: false,
	})

	//Deploy rBRLLPool contract
	const rBRLLPool = await ethers.getContractFactory("rBRLLPool")
	let rbrllpool = await rBRLLPool.deploy(admin.address, tselicToken.address, drexToken.address)
	await rbrllpool.deployed()
	console.log("rBRLLPool address:", rbrllpool.address)
	//Grant roles to rBRLLPool contract
	let POOL_MANAGER_ROLE = await rbrllpool.POOL_MANAGER_ROLE()
	await rbrllpool.grantRole(POOL_MANAGER_ROLE, admin.address)

	//Deploy liquidate pool contract
	const LiquidatePool = await ethers.getContractFactory("LiquidatePool")

	let liquidatePool = await LiquidatePool.deploy(
		admin.address,
		rbrllpool.address,
		tselicToken.address,
		drexToken.address,
		networks[networkName]["uniswapV3Router"]
	)
	await liquidatePool.deployed()
	console.log("LiquidatePool address:", liquidatePool.address)

	//Deploy Interest Rate contract
	const InterestRateModel = await ethers.getContractFactory("InterestRateModel")
	let interestRateModel = await InterestRateModel.deploy(autoConsumerAddress)
	await interestRateModel.deployed()
	console.log("InterestRateModel address:", interestRateModel.address)

	await rbrllpool.initLiquidatePool(liquidatePool.address)
	await rbrllpool.setInterestRateModel(interestRateModel.address)
	await liquidatePool.setFeeCollector(feeCollector)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
