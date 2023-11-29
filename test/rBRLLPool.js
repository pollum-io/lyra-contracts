const { ethers } = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers

const {
	deployTokensFixture,
	deployUniPoolFixture,
	deployLocalChainlinkFunctions,
	deployMockPriceFeedFixture,
	deployrBRLLPoolFixture,
	deployLiquidatePoolFixture,
	deployInterestRateModelFixture,
	// deploySTBTTokensFixture,
	// ,
} = require("./common/allFixture")

const ONE_HOUR = 3600
const ONE_DAY = ONE_HOUR * 24
const ONE_WEEK = ONE_DAY * 7
const ONE_MONTH = ONE_DAY * 30
const ONE_YEAR = ONE_DAY * 365

const BIGNUMBER = new ethers.BigNumber.from(2).pow(200)
const TEST_CHAINLINK = false

const mineBlockWithTimestamp = async (provider, timestamp) => {
	await provider.send("evm_mine", [timestamp])
	return Promise.resolve()
}
// Function to wait for a certain amount of time
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("rBRLLPool", function () {
	let admin, deployer, drexInvestor, tselicInvestor, feeCollector
	let drexToken, tselicToken
	let swapRouter
	let autoConsumerContract, functionsAddresses, interestRateModel, reqId
	let rbrllpool, liquidatePool
	let now

	beforeEach("load fixture", async () => {
		// const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545")
		// ethers.provider = provider
		;[admin, deployer, drexInvestor, tselicInvestor, feeCollector] = await ethers.getSigners()
			// deploy tokens
			; ({ drexToken, tselicToken } = await deployTokensFixture(
				deployer,
				drexInvestor,
				tselicInvestor
			))
		swapRouter = await deployUniPoolFixture(deployer, tselicToken, drexToken)
		if (TEST_CHAINLINK) {
			; ({ functionsAddresses, autoConsumerContract } = await deployLocalChainlinkFunctions(
				admin,
				deployer
			))
		} else {
			; ({ autoConsumerContract } = await deployMockPriceFeedFixture(deployer))
		}

		rbrllpool = await deployrBRLLPoolFixture(admin, deployer, tselicToken, drexToken)
		liquidatePool = await deployLiquidatePoolFixture(
			admin,
			deployer,
			rbrllpool,
			tselicToken,
			drexToken,
			swapRouter
		)
		if (TEST_CHAINLINK) {
			const checkUpkeep = await autoConsumerContract.performUpkeep([])
			await checkUpkeep.wait(1)
			reqId = await autoConsumerContract.s_lastRequestId()
			await delay(5000)
		}
		interestRateModel = await deployInterestRateModelFixture(deployer, autoConsumerContract)
		await rbrllpool.connect(admin).initLiquidatePool(liquidatePool.address)
		await rbrllpool.connect(admin).setInterestRateModel(interestRateModel.address)
		await liquidatePool.connect(admin).setFeeCollector(feeCollector.address)
		now = (await ethers.provider.getBlock("latest")).timestamp
	})
	const amountToSupplyDrex = ethers.utils.parseUnits("14000", 6) // 100 DREX
	const amountToSupplyTSelic = ethers.utils.parseUnits("1", 18) // 1 TSELIC
	const amountToBorrowDrex = ethers.utils.parseUnits("13000", 6) // 98 DREX

	describe("Chainlink Automation", function () {
		it("Check automation run", async () => {
			expectedSelicRate = 12250000
			expectedMaturityTime = 1867014000 //Timestamp to maturity of SELIC2029 t-bond
			const lastResponse = await autoConsumerContract.selicRate()
			const unitValue = await autoConsumerContract.unitValue()
			const maturityTime = await autoConsumerContract.maturityTime()
			expect(lastResponse.toNumber()).to.be.equal(expectedSelicRate)
			expect(BigNumber.isBigNumber(unitValue)).to.be.true
			expect(maturityTime).to.be.equal(expectedMaturityTime)
		})
	})
	describe("Supply", function () {
		describe("Supply Drex", function () {
			it("Should be able to supply", async function () {
				await drexToken.connect(drexInvestor).approve(rbrllpool.address, amountToSupplyDrex)
				await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex)
				expect(await rbrllpool.balanceOf(drexInvestor.address)).to.be.equal(
					ethers.utils.parseUnits("14000", 18)
				)
			})

			it("Should fail if supply zero Drex", async function () {
				await expect(rbrllpool.connect(drexInvestor).supplyDREX(0)).to.be.revertedWith(
					"Supply DREX should be more than 0."
				)
			})
		})
		describe("Supply TSELIC", function () {
			it("Should be able to supply", async function () {
				await tselicToken
					.connect(tselicInvestor)
					.approve(rbrllpool.address, amountToSupplyTSelic)

				await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic)

				expect(await rbrllpool.depositedTSELIC(tselicInvestor.address)).to.be.equal(
					amountToSupplyTSelic
				)
			})

			it("Should fail if supply zero TSELIC", async function () {
				await expect(rbrllpool.connect(tselicInvestor).supplyTSELIC(0)).to.be.revertedWith(
					"Supply TSELIC should be more than 0."
				)
			})
		})
	})

	describe("Withdraw", function () {
		beforeEach(async () => {
			now = now + ONE_HOUR
			await mineBlockWithTimestamp(ethers.provider, now)
			await drexToken.connect(drexInvestor).approve(rbrllpool.address, amountToSupplyDrex)
			await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex)
			await tselicToken
				.connect(tselicInvestor)
				.approve(rbrllpool.address, amountToSupplyTSelic)
			await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic)
		})
		describe("Withdraw DREX", function () {
			it("Should be able to withdraw", async function () {
				const drexAmountBefore = await drexToken.balanceOf(drexInvestor.address)

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)
				await rbrllpool.connect(drexInvestor).withdrawDREX(amountToSupplyDrex)

				const drexAmountAfter = await drexToken.balanceOf(drexInvestor.address)

				expect(await rbrllpool.balanceOf(drexInvestor.address)).to.be.equal(0)
				expect(drexAmountAfter).to.be.equal(rbrllAmount.div(1e12).add(drexAmountBefore))
			})

			it("Should fail if withdraw zero DREX", async function () {
				await expect(rbrllpool.connect(drexInvestor).withdrawDREX(0)).to.be.revertedWith(
					"Withdraw DREX should be more than 0."
				)
			})

			it("Should fail if withdraw more than supply", async function () {
				await expect(
					rbrllpool.connect(drexInvestor).withdrawDREX(amountToSupplyDrex + 1)
				).to.be.revertedWith("BALANCE_EXCEEDED")
			})
		})
		describe("Withdraw TSELIC", function () {
			it("Should be able to withdraw", async function () {
				const tselicAmountBefore = await tselicToken.balanceOf(tselicInvestor.address)
				await rbrllpool.connect(tselicInvestor).withdrawTSELIC(amountToSupplyTSelic)

				const tselicAmountAfter = await tselicToken.balanceOf(tselicInvestor.address)

				expect(await rbrllpool.depositedTSELIC(tselicInvestor.address)).to.be.equal(0)
				expect(tselicAmountAfter).to.be.equal(amountToSupplyTSelic.add(tselicAmountBefore))
			})

			it("Should be able to withdraw all tselic", async function () {
				const tselicAmountBefore = await tselicToken.balanceOf(tselicInvestor.address)
				await rbrllpool.connect(tselicInvestor).withdrawAllTSELIC()

				const tselicAmountAfter = await tselicToken.balanceOf(tselicInvestor.address)

				expect(await rbrllpool.depositedTSELIC(tselicInvestor.address)).to.be.equal(0)
				expect(tselicAmountAfter).to.be.equal(amountToSupplyTSelic.add(tselicAmountBefore))
			})

			it("Should fail if supply zero TSELIC", async function () {
				await expect(
					rbrllpool.connect(tselicInvestor).withdrawTSELIC(0)
				).to.be.revertedWith("Withdraw TSELIC should be more than 0.")
			})

			it("Should fail if withdraw more than supply", async function () {
				await expect(
					rbrllpool.connect(tselicInvestor).withdrawTSELIC(amountToSupplyTSelic + 1)
				).to.be.reverted
			})
		})
	})
	describe("Borrow", function () {
		beforeEach(async () => {
			now = now + ONE_HOUR
			await mineBlockWithTimestamp(ethers.provider, now)
			await drexToken.connect(drexInvestor).approve(rbrllpool.address, amountToSupplyDrex)
			await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex)
			await tselicToken
				.connect(tselicInvestor)
				.approve(rbrllpool.address, amountToSupplyTSelic)
			await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic)
		})
		describe("Borrow Drex", function () {
			it("Should be able to borrow", async function () {
				const drexAmountBefore = await drexToken.balanceOf(tselicInvestor.address)

				const borrowShares = await rbrllpool.getSharesByrBRLLAmount(
					amountToBorrowDrex.mul(1e12)
				)
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToBorrowDrex)

				const drexAmountAfter = await drexToken.balanceOf(tselicInvestor.address)

				expect(await rbrllpool.getBorrowedSharesOf(tselicInvestor.address)).to.be.equal(
					borrowShares
				)
				expect(await rbrllpool.totalBorrowShares()).to.be.equal(borrowShares)
				expect(drexAmountAfter).to.be.equal(amountToBorrowDrex.add(drexAmountBefore))
			})

			it("Should fail if borrow zero DREX", async function () {
				await expect(rbrllpool.connect(tselicInvestor).borrowDREX(0)).to.be.revertedWith(
					"Borrow DREX should be more than 0."
				)
			})

			it("Should fail if borrow more than collateral", async function () {
				await expect(
					rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)
				).to.be.revertedWith("Cannot be lower than the safeCollateralRate.")
			})
		})
	})

	describe("Interest", function () {
		beforeEach(async () => {
			now = now + ONE_DAY
			await mineBlockWithTimestamp(ethers.provider, now)
			await drexToken.connect(drexInvestor).approve(rbrllpool.address, amountToSupplyDrex)
			await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex)
			await tselicToken
				.connect(tselicInvestor)
				.approve(rbrllpool.address, amountToSupplyTSelic.mul(2))
			await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic.mul(2))
		})
		describe("Gain interest", function () {
			it("Should be able to full interest when 100% utilization rate", async function () {
				// borrow all drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)

				// ~= 12.25% apr
				expect(rbrllAmount.div(1e12)).to.be.within(
					amountToSupplyDrex.mul(11215).div(10000),
					amountToSupplyDrex.mul(11235).div(10000)
				)
			})
			it("Should be able to half interest when 50% utilization rate", async function () {
				// borrow all drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex.div(2))
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)

				// ~= 6.125% apr
				expect(rbrllAmount.div(1e12)).to.be.within(
					amountToSupplyDrex.mul(10602).div(10000),
					amountToSupplyDrex.mul(10625).div(10000)
				)
			})
			it("Should be able to withdraw interest income", async function () {
				// borrow all drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)

				await drexToken
					.connect(tselicInvestor)
					.approve(rbrllpool.address, amountToSupplyDrex.mul(2))
				await rbrllpool.connect(tselicInvestor).supplyDREX(amountToSupplyDrex.mul(2))

				const drexAmountBefore = await drexToken.balanceOf(drexInvestor.address)

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)
				await rbrllpool.connect(drexInvestor).withdrawDREX(rbrllAmount.div(1e12))

				const drexAmountAfter = await drexToken.balanceOf(drexInvestor.address)

				expect(drexAmountAfter).to.be.equal(rbrllAmount.div(1e12).add(drexAmountBefore))
			})
			it("Should be able to get reserve fee", async function () {
				// set reserve 10%
				await rbrllpool.connect(admin).setReserveFactor(1000000)
				// borrow all drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)

				await rbrllpool.connect(admin).claimReservesFee(feeCollector.address)
				const feeBalance = await rbrllpool.balanceOf(feeCollector.address)
				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)
				// ~= 12.25% apr
				expect(rbrllAmount.add(feeBalance).div(1e12)).to.be.within(
					amountToSupplyDrex.mul(11215).div(10000),
					amountToSupplyDrex.mul(11235).div(10000)
				)
			})
			it("Should be able the same debt and brll supply when 100% utilization rate", async function () {
				const oldTotalSupplyrBRLL = await rbrllpool.totalSupplyrBRLL()
				// borrow all drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)
				const newTotalSupplyrBRLL = await rbrllpool.totalSupplyrBRLL()
				const totalBorrowrBRLL = await rbrllpool.totalBorrowrBRLL()

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)

				// ~= 12.25% apr
				expect(rbrllAmount.div(1e12)).to.be.within(
					amountToSupplyDrex.mul(11215).div(10000),
					amountToSupplyDrex.mul(11235).div(10000)
				)

				expect(totalBorrowrBRLL.sub(amountToSupplyDrex.mul(1e12))).to.be.equal(
					newTotalSupplyrBRLL.sub(oldTotalSupplyrBRLL)
				)
			})
			it("Should be able the same debt and brll supply when 50% utilization rate", async function () {
				const oldTotalSupplyrBRLL = await rbrllpool.totalSupplyrBRLL()
				// borrow 50% drex
				await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex.div(2))
				now = now + ONE_YEAR
				await mineBlockWithTimestamp(ethers.provider, now)

				// to realize interest
				await rbrllpool.connect(admin).setReserveFactor(0)
				const newTotalSupplyrBRLL = await rbrllpool.totalSupplyrBRLL()
				const totalBorrowrBRLL = await rbrllpool.totalBorrowrBRLL()

				const rbrllAmount = await rbrllpool.balanceOf(drexInvestor.address)

				// // ~= 6.25% apr
				// expect(rbrllAmount.div(1e12)).to.be.within(
				// 	amountToSupplyDrex.mul(10602).div(10000),
				// 	amountToSupplyDrex.mul(10625).div(10000)
				// )

				expect(totalBorrowrBRLL.sub(amountToSupplyDrex.div(2).mul(1e12))).to.be.equal(
					newTotalSupplyrBRLL.sub(oldTotalSupplyrBRLL)
				)
			})
		})
	})

	describe("Repay", function () {
		beforeEach(async () => {
			now = now + ONE_HOUR
			await mineBlockWithTimestamp(ethers.provider, now)
			// await interestRateModel.connect(deployer).setAPR(0)
			await drexToken.connect(drexInvestor).approve(rbrllpool.address, amountToSupplyDrex)
			await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex)
			await tselicToken
				.connect(tselicInvestor)
				.approve(rbrllpool.address, amountToSupplyTSelic)
			await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic)

			await rbrllpool.connect(tselicInvestor).borrowDREX(amountToBorrowDrex)
			await drexToken.connect(tselicInvestor).approve(rbrllpool.address, BIGNUMBER)
			now = now + ONE_YEAR
			await mineBlockWithTimestamp(ethers.provider, now)
			// to realize interest
			await rbrllpool.connect(admin).setReserveFactor(0)
		})
		describe("Repay DREX", function () {
			it("Should be able to repay 50%", async function () {
				const drexAmountBefore = await drexToken.balanceOf(tselicInvestor.address)

				const borrowrBRLL = (await rbrllpool.getBorrowedAmount(tselicInvestor.address)).div(
					2
				)

				const borrowDREX = borrowrBRLL.div(1e12)

				await rbrllpool.connect(tselicInvestor).repayDREX(borrowDREX)

				const drexAmountAfter = await drexToken.balanceOf(tselicInvestor.address)
				const borrowSharesAfter = await rbrllpool.getBorrowedSharesOf(
					tselicInvestor.address
				)

				expect(await rbrllpool.totalBorrowShares()).to.be.equal(borrowSharesAfter)
				expect(drexAmountBefore).to.be.equal(drexAmountAfter.add(borrowDREX))
			})
			it("Should be able to repay 100%", async function () {
				const drexAmountBefore = await drexToken.balanceOf(tselicInvestor.address)

				const borrowrBRLL = await rbrllpool.getBorrowedAmount(tselicInvestor.address)

				const borrowDREX = borrowrBRLL.div(1e12)

				await rbrllpool.connect(tselicInvestor).repayDREX(borrowDREX)

				const drexAmountAfter = await drexToken.balanceOf(tselicInvestor.address)
				const borrowSharesAfter = await rbrllpool.getBorrowedSharesOf(
					tselicInvestor.address
				)

				expect(await rbrllpool.totalBorrowShares()).to.be.equal(borrowSharesAfter)
				expect(drexAmountBefore).to.be.equal(drexAmountAfter.add(borrowDREX))
			})

			it("Should fail if repay zero DREX", async function () {
				await expect(rbrllpool.connect(tselicInvestor).repayDREX(0)).to.be.revertedWith(
					"Repay DREX should be more than 0."
				)
			})
		})
	})
	describe("Flash liquidate", function () {
		beforeEach(async () => {
			now = now + ONE_HOUR
			await mineBlockWithTimestamp(ethers.provider, now)
			await drexToken
				.connect(drexInvestor)
				.approve(rbrllpool.address, amountToSupplyDrex.mul(10))
			await rbrllpool.connect(drexInvestor).supplyDREX(amountToSupplyDrex.mul(10))
			await tselicToken
				.connect(tselicInvestor)
				.approve(rbrllpool.address, amountToSupplyTSelic.mul(2))
			await rbrllpool.connect(tselicInvestor).supplyTSELIC(amountToSupplyTSelic.mul(2))
			await rbrllpool.connect(tselicInvestor).borrowDREX(amountToSupplyDrex)

			await rbrllpool.connect(admin).setLiquidateProvider(tselicInvestor.address, true)
		})

		it(`Should be able to liquidate `, async () => {
			const liquidateDREX = amountToSupplyDrex.div(10)
			const beforeBRLLAmount = await rbrllpool.balanceOf(drexInvestor.address)

			const beforeBalance = await drexToken.balanceOf(drexInvestor.address)
			await rbrllpool
				.connect(drexInvestor)
				.flashLiquidateBorrow(tselicInvestor.address, liquidateDREX, amountToSupplyTSelic)
			const afterBalance = await drexToken.balanceOf(drexInvestor.address)
			const afterBRLLAmount = await rbrllpool.balanceOf(drexInvestor.address)
			expect(afterBalance.sub(beforeBalance)).to.be.equal(liquidateDREX)
			// There are some err in interest.
			expect(beforeBRLLAmount.sub(afterBRLLAmount).div(10 ** 13)).to.be.within(
				liquidateDREX.mul(99999).div(100000),
				liquidateDREX.mul(100001).div(100000)
			)
		})

		it("Should be not able to more than user owns.", async () => {
			const liquidateTSELIC = await rbrllpool.balanceOf(admin.address)
			await expect(
				rbrllpool
					.connect(admin)
					.flashLiquidateBorrow(tselicInvestor.address, liquidateTSELIC.add(100), 0)
			).to.be.revertedWith("BALANCE_EXCEEDED")
		})

		it("Should be not able to liquidate self", async () => {
			const liquidateTSELIC = await rbrllpool.balanceOf(tselicInvestor.address)
			await expect(
				rbrllpool
					.connect(tselicInvestor)
					.flashLiquidateBorrow(tselicInvestor.address, liquidateTSELIC.add(100), 0)
			).to.be.revertedWith("don't liquidate self.")
		})

		it("Should be not able to more than borrower's debt.", async () => {
			// to realize interest
			await rbrllpool.connect(admin).setReserveFactor(0)
			const liquidateTSELIC = await rbrllpool.getBorrowedAmount(tselicInvestor.address)
			await expect(
				rbrllpool
					.connect(drexInvestor)
					.flashLiquidateBorrow(tselicInvestor.address, liquidateTSELIC.mul(2), 0)
			).to.be.revertedWith("repayAmount should be less than borrower's debt.")
		})
	})
})
