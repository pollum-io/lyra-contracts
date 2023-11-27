const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const FunctionsRouter = require("@chainlink/functions-toolkit/dist/v1_contract_sources/FunctionsRouter")
const { networks } = require("../networks")
const LINK_AMOUNT = "100"
;(async () => {
	;[signer] = await ethers.getSigners()
	if (network.name === "hardhat") {
		network.name = "localFunctionsTestnet"
	}
	const functionsRouterAddress = networks[network.name]["functionsRouter"]
	const linkTokenAddress = networks[network.name]["linkToken"]
	const myContract = new ethers.Contract(
		functionsRouterAddress,
		FunctionsRouter.FunctionsRouterSource.abi,
		signer
	)
	console.log("check myContract", myContract)
	const allowlist = await myContract.getAllowListId()
	console.log("check allowlist", allowlist)
	const linkAmount = LINK_AMOUNT
	const confirmations = linkAmount > 0 ? networks[network.name].confirmations : 1
	const consumerAddress = null
	const txOptions = { confirmations }

	const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
	await sm.initialize()

	console.log("\nCreating Functions billing subscription...")
	const subscriptionId = await sm.createSubscription({ consumerAddress, txOptions })
	console.log(`\nCreated Functions billing subscription: ${subscriptionId}`)

	console.log(`\nFunding subscription ${subscriptionId} with ${linkAmount} LINK...`)
	const juelsAmount = ethers.utils.parseUnits(linkAmount, 18).toString()
	const fundTxReceipt = await sm.fundSubscription({ juelsAmount, subscriptionId, txOptions })
	console.log(
		`\nSubscription ${subscriptionId} funded with ${linkAmount} LINK in Tx: ${fundTxReceipt.transactionHash}`
	)

	const subInfo = await sm.getSubscriptionInfo(subscriptionId)
	// parse  balances into LINK for readability
	subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
	subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"

	console.log("\nSubscription Info: ", subInfo)
})()
