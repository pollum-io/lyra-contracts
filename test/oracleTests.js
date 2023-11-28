const { assert } = require("chai")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
// const { network } = require("hardhat")

// describe("Functions Consumer Unit Tests", async function () {
// 	// We define a fixture to reuse the same setup in every test.
// 	// We use loadFixture to run this setup once, snapshot that state,
// 	// and reset Hardhat Network to that snapshot in every test.

// 	it("reads s_lastResponse from AutomatedFunctionsConsumer contract", async () => {
// 		const AutomatedFunctionsConsumer = await ethers.getContractFactory(
// 			"AutomatedFunctionsConsumer"
// 		)
// 		const contractAddress = "0xfdEdFF6E45BdB0d3a3b89FDefCDc1fFec2CA9120" //TODO @dev replace with your contract address
// 		const contract = AutomatedFunctionsConsumer.attach(contractAddress)

// 		const lastResponse = await contract.selicRate()
// 		const unitValue = await contract.unitValue()
// 		const maturityTime = await contract.maturityTime()
// 		console.log("My Response", lastResponse, unitValue, maturityTime)
// 	})
// })
