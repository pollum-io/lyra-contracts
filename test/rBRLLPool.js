const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
// const { ethers } = require("hardhat")
const { expect } = require("chai")

const {
	deployTokensFixture,
	deployUniPoolFixture,
	// deployMockPriceFeedFixture,
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

const mineBlockWithTimestamp = async (provider, timestamp) => {
	await provider.send("evm_mine", [timestamp])
	return Promise.resolve()
}

describe("rBRLLPool", function () {
	let admin, deployer, drexInvestor, tselicInvestor, feeCollector
	let drexToken, tselicToken
	let swapRouter
	let automatedFunctionsConsumer, interestRateModel
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
			; (swapRouter = await deployUniPoolFixture(deployer, tselicToken, drexToken))
			// ; ({ automatedFunctionsConsumer } = await deployMockPriceFeedFixture(deployer))
			; (rbrllpool = await deployrBRLLPoolFixture(admin, deployer, tselicToken, drexToken))
			; (liquidatePool = await deployLiquidatePoolFixture(
				admin,
				deployer,
				rbrllpool,
				tselicToken,
				drexToken,
				swapRouter,
			))
			; (interestRateModel = await deployInterestRateModelFixture(deployer, drexToken)) // TODO: change to automatedFunctionsConsumer address instead of drex token

		await rbrllpool.connect(admin).initLiquidatePool(liquidatePool.address)
		await rbrllpool.connect(admin).setInterestRateModel(interestRateModel.address)

		await liquidatePool.connect(admin).setFeeCollector(feeCollector.address)

		now = (await ethers.provider.getBlock("latest")).timestamp
	})
	// const amountToSupplyUSDC = ethers.utils.parseUnits("100", 6) // 100 USDC
	// const amountToSupplySTBT = ethers.utils.parseUnits("100", 18) // 100 STBT
	// const amountToBorrowUSDC = ethers.utils.parseUnits("98", 6) // 98 USDC
	describe("Supply", function () {
		describe("Supply USDC", function () {
			it("Should be able to supply", async function () {
				// await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
				// await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
				// expect(await rustpool.balanceOf(usdcInvestor.address)).to.be.equal(
				// 	ethers.utils.parseUnits("100", 18)
				// )
				expect(true)
			})

			it("Should fail if supply zero USDC", async function () {
				// await expect(rustpool.connect(usdcInvestor).supplyUSDC(0)).to.be.revertedWith(
				// 	"Supply USDC should more then 0."
				// )
				expect(true)
			})
		})
		// describe("Supply STBT", function () {
		// 	it("Should be able to supply", async function () {
		// await stbtToken.connect(stbtInvestor).approve(rustpool.address, amountToSupplySTBT)

		// const supplySTBTshares = await stbtToken.getSharesByAmount(amountToSupplySTBT)

		// await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT)

		// expect(await rustpool.depositedSharesSTBT(stbtInvestor.address)).to.be.equal(
		// 	supplySTBTshares
		// )
		// 	expect(true)
		// })

		// 		it("Should fail if supply zero STBT", async function () {
		// 			await expect(rustpool.connect(stbtInvestor).supplySTBT(0)).to.be.revertedWith(
		// 				"Supply STBT should more then 0."
		// 			)
		// 		})
		// 	})
		// })

		// describe("Withdraw", function () {
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
		// 		await stbtToken.connect(stbtInvestor).approve(rustpool.address, amountToSupplySTBT)
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT)
		// 	})
		// 	describe("Withdraw USDC", function () {
		// 		it("Should be able to withdraw", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(usdcInvestor.address)

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			await rustpool.connect(usdcInvestor).withdrawUSDC(amountToSupplyUSDC)

		// 			const usdcAmountAfter = await usdcToken.balanceOf(usdcInvestor.address)

		// 			expect(await rustpool.balanceOf(usdcInvestor.address)).to.be.equal(0)
		// 			expect(usdcAmountAfter).to.be.equal(rustpAmount.div(1e12).add(usdcAmountBefore))
		// 		})

		// 		it("Should be able to withdraw all usdc", async function () {
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToBorrowUSDC)
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)

		// 			// add interest
		// 			await usdcToken
		// 				.connect(deployer)
		// 				.transfer(rustpool.address, amountToBorrowUSDC.mul(2))

		// 			const usdcAmountBefore = await usdcToken.balanceOf(usdcInvestor.address)

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			await rustpool.connect(usdcInvestor).withdrawAllUSDC()

		// 			const usdcAmountAfter = await usdcToken.balanceOf(usdcInvestor.address)

		// 			expect(await rustpool.balanceOf(usdcInvestor.address)).to.be.equal(0)
		// 			expect(usdcAmountAfter).to.be.equal(rustpAmount.div(1e12).add(usdcAmountBefore))
		// 		})

		// 		it("Should fail if withdraw zero USDC", async function () {
		// 			await expect(rustpool.connect(usdcInvestor).withdrawUSDC(0)).to.be.revertedWith(
		// 				"Withdraw USDC should more then 0."
		// 			)
		// 		})

		// 		it("Should fail if withdraw more than supply", async function () {
		// 			await expect(
		// 				rustpool.connect(usdcInvestor).withdrawUSDC(amountToSupplyUSDC + 1)
		// 			).to.be.revertedWith("BALANCE_EXCEEDED")
		// 		})
		// 	})
		// 	describe("Withdraw STBT", function () {
		// 		it("Should be able to withdraw", async function () {
		// 			const stbtAmountBefore = await stbtToken.balanceOf(stbtInvestor.address)
		// 			await rustpool.connect(stbtInvestor).withdrawSTBT(amountToSupplySTBT)

		// 			const stbtAmountAfter = await stbtToken.balanceOf(stbtInvestor.address)

		// 			expect(await rustpool.depositedSharesSTBT(stbtInvestor.address)).to.be.equal(0)
		// 			expect(stbtAmountAfter).to.be.equal(amountToSupplySTBT.add(stbtAmountBefore))
		// 		})

		// 		it("Should be able to withdraw all stbt", async function () {
		// 			const stbtAmountBefore = await stbtToken.balanceOf(stbtInvestor.address)
		// 			await rustpool.connect(stbtInvestor).withdrawAllSTBT()

		// 			const stbtAmountAfter = await stbtToken.balanceOf(stbtInvestor.address)

		// 			expect(await rustpool.depositedSharesSTBT(stbtInvestor.address)).to.be.equal(0)
		// 			expect(stbtAmountAfter).to.be.equal(amountToSupplySTBT.add(stbtAmountBefore))
		// 		})

		// 		it("Should fail if supply zero STBT", async function () {
		// 			await expect(rustpool.connect(stbtInvestor).withdrawSTBT(0)).to.be.revertedWith(
		// 				"Withdraw STBT should more then 0."
		// 			)
		// 		})

		// 		it("Should fail if withdraw more than supply", async function () {
		// 			await expect(rustpool.connect(stbtInvestor).withdrawSTBT(amountToSupplySTBT + 1)).to
		// 				.be.reverted
		// 		})
		// 	})
		// })
		// describe("Borrow", function () {
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
		// 		await stbtToken.connect(stbtInvestor).approve(rustpool.address, amountToSupplySTBT)
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT)
		// 	})
		// 	describe("Borrow USDC", function () {
		// 		it("Should be able to borrow", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(stbtInvestor.address)

		// 			const borrowShares = await rustpool.getSharesByrUSTPAmount(
		// 				amountToBorrowUSDC.mul(1e12)
		// 			)
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToBorrowUSDC)

		// 			const usdcAmountAfter = await usdcToken.balanceOf(stbtInvestor.address)

		// 			expect(await rustpool.getBorrowedSharesOf(stbtInvestor.address)).to.be.equal(
		// 				borrowShares
		// 			)
		// 			expect(await rustpool.totalBorrowShares()).to.be.equal(borrowShares)
		// 			expect(usdcAmountAfter).to.be.equal(amountToBorrowUSDC.add(usdcAmountBefore))
		// 		})

		// 		it("Should be able to borrow more when STBT distribute", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(stbtInvestor.address)

		// 			const doubleBorrow = amountToBorrowUSDC.mul(2)
		// 			await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
		// 			await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
		// 			const totalSupplySTBT = await stbtToken.totalSupply()
		// 			await stbtToken.connect(deployer).distributeInterests(totalSupplySTBT, now, now + 1)

		// 			const borrowShares = await rustpool.getSharesByrUSTPAmount(doubleBorrow.mul(1e12))
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(doubleBorrow)

		// 			const usdcAmountAfter = await usdcToken.balanceOf(stbtInvestor.address)

		// 			expect(await rustpool.getBorrowedSharesOf(stbtInvestor.address)).to.be.equal(
		// 				borrowShares
		// 			)
		// 			expect(await rustpool.totalBorrowShares()).to.be.equal(borrowShares)
		// 			expect(usdcAmountAfter).to.be.equal(doubleBorrow.add(usdcAmountBefore))
		// 		})

		// 		it("Should fail if borrow zero USDC", async function () {
		// 			await expect(rustpool.connect(stbtInvestor).borrowUSDC(0)).to.be.revertedWith(
		// 				"Borrow USDC should more then 0."
		// 			)
		// 		})

		// 		it("Should fail if borrow more than collateral", async function () {
		// 			await expect(
		// 				rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 			).to.be.revertedWith("Cannot be lower than the safeCollateralRate.")
		// 		})
		// 	})
		// })

		// describe("Repay", function () {
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		// await interestRateModel.connect(deployer).setAPR(0)
		// 		await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
		// 		await stbtToken.connect(stbtInvestor).approve(rustpool.address, amountToSupplySTBT)
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT)

		// 		await rustpool.connect(stbtInvestor).borrowUSDC(amountToBorrowUSDC)
		// 		await usdcToken.connect(stbtInvestor).approve(rustpool.address, BIGNUMBER)
		// 		now = now + ONE_YEAR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		// to realize interest
		// 		await rustpool.connect(admin).setReserveFactor(0)
		// 		await interestRateModel.connect(deployer).setAPR(0)
		// 	})
		// 	describe("Repay USDC", function () {
		// 		it("Should be able to repay 50%", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(stbtInvestor.address)

		// 			const borrowSharesBefore = await rustpool.getBorrowedSharesOf(stbtInvestor.address)
		// 			const borrowiUSDP = (await rustpool.getBorrowedAmount(stbtInvestor.address)).div(2)

		// 			const borrowUSDC = borrowiUSDP.div(1e12)

		// 			const repayShares = await rustpool.getBorrowSharesByrUSTPAmount(borrowiUSDP)

		// 			await rustpool.connect(stbtInvestor).repayUSDC(borrowUSDC)

		// 			const usdcAmountAfter = await usdcToken.balanceOf(stbtInvestor.address)
		// 			const borrowSharesAfter = await rustpool.getBorrowedSharesOf(stbtInvestor.address)

		// 			expect(borrowSharesAfter).to.be.within(
		// 				borrowSharesBefore.sub(repayShares),
		// 				borrowSharesBefore.sub(repayShares).add(1e12)
		// 			)
		// 			expect(await rustpool.totalBorrowShares()).to.be.equal(borrowSharesAfter)
		// 			expect(usdcAmountBefore).to.be.equal(usdcAmountAfter.add(borrowUSDC))
		// 		})
		// 		it("Should be able to repay 100%", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(stbtInvestor.address)

		// 			const borrowSharesBefore = await rustpool.getBorrowedSharesOf(stbtInvestor.address)
		// 			const borrowiUSDP = await rustpool.getBorrowedAmount(stbtInvestor.address)

		// 			const borrowUSDC = borrowiUSDP.div(1e12)

		// 			const repayShares = await rustpool.getBorrowSharesByrUSTPAmount(borrowiUSDP)

		// 			await rustpool.connect(stbtInvestor).repayUSDC(borrowUSDC)

		// 			const usdcAmountAfter = await usdcToken.balanceOf(stbtInvestor.address)
		// 			const borrowSharesAfter = await rustpool.getBorrowedSharesOf(stbtInvestor.address)

		// 			expect(borrowSharesAfter).to.be.within(
		// 				borrowSharesBefore.sub(repayShares),
		// 				borrowSharesBefore.sub(repayShares).add(1e12)
		// 			)
		// 			expect(await rustpool.totalBorrowShares()).to.be.equal(borrowSharesAfter)
		// 			expect(usdcAmountBefore).to.be.equal(usdcAmountAfter.add(borrowUSDC))
		// 		})

		// 		it("Should be able to repay 100% and user could with all usdc", async function () {
		// 			const usdcAmountBefore = await usdcToken.balanceOf(stbtInvestor.address)
		// 			const borrowiUSDP = await rustpool.getBorrowedAmount(stbtInvestor.address)
		// 			const borrowUSDC = borrowiUSDP.div(1e12)
		// 			await rustpool.connect(stbtInvestor).repayAll()
		// 			const usdcAmountAfter = await usdcToken.balanceOf(stbtInvestor.address)
		// 			// at repayAll function, the repay usdc should be add 1.
		// 			expect(usdcAmountBefore).to.be.equal(usdcAmountAfter.add(borrowUSDC).add(1))
		// 			const interestUSDC = borrowUSDC.sub(amountToBorrowUSDC)

		// 			const balanceOfUserBefore = await usdcToken.balanceOf(usdcInvestor.address)
		// 			await rustpool.connect(usdcInvestor).withdrawAllUSDC()

		// 			const balanceOfUserAfter = await usdcToken.balanceOf(usdcInvestor.address)
		// 			expect(balanceOfUserAfter).to.be.equal(
		// 				balanceOfUserBefore.add(amountToSupplyUSDC).add(interestUSDC)
		// 			)
		// 		})
		// 		it("Should fail if repay zero USDC", async function () {
		// 			await expect(rustpool.connect(stbtInvestor).repayUSDC(0)).to.be.revertedWith(
		// 				"Repay USDC should more then 0."
		// 			)
		// 		})
		// 	})
		// })

		// describe("Interest", function () {
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		await usdcToken.connect(usdcInvestor).approve(rustpool.address, amountToSupplyUSDC)
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC)
		// 		await stbtToken
		// 			.connect(stbtInvestor)
		// 			.approve(rustpool.address, amountToSupplySTBT.mul(2))
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT.mul(2))
		// 	})
		// 	describe("Gain interest", function () {
		// 		it("Should be able to full interest when 100% utilization rate", async function () {
		// 			// borrow all usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 			// ~= 5.2% apr
		// 			expect(rustpAmount.div(1e12)).to.be.within(
		// 				amountToSupplyUSDC.mul(10510).div(10000),
		// 				amountToSupplyUSDC.mul(10530).div(10000)
		// 			)
		// 		})
		// 		it("Should be able to half interest when 50% utilization rate", async function () {
		// 			// borrow all usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC.div(2))
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 			// ~= 2.1% apr
		// 			expect(rustpAmount.div(1e12)).to.be.within(
		// 				amountToSupplyUSDC.mul(10255).div(10000),
		// 				amountToSupplyUSDC.mul(10265).div(10000)
		// 			)
		// 		})

		// 		it("Should be able to withdraw interest income", async function () {
		// 			// borrow all usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)

		// 			await usdcToken
		// 				.connect(stbtInvestor)
		// 				.approve(rustpool.address, amountToSupplyUSDC.mul(2))
		// 			await rustpool.connect(stbtInvestor).supplyUSDC(amountToSupplyUSDC.mul(2))

		// 			const usdcAmountBefore = await usdcToken.balanceOf(usdcInvestor.address)

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			await rustpool.connect(usdcInvestor).withdrawUSDC(rustpAmount.div(1e12))

		// 			const usdcAmountAfter = await usdcToken.balanceOf(usdcInvestor.address)

		// 			expect(usdcAmountAfter).to.be.equal(rustpAmount.div(1e12).add(usdcAmountBefore))
		// 		})
		// 		it("Should be able to get reserve fee", async function () {
		// 			// set reserve 10%
		// 			await rustpool.connect(admin).setReserveFactor(1000000)
		// 			// borrow all usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)

		// 			await rustpool.connect(admin).claimReservesFee(feeCollector.address)
		// 			const feeBalance = await rustpool.balanceOf(feeCollector.address)
		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			// ~= 5.2% apr
		// 			expect(rustpAmount.add(feeBalance).div(1e12)).to.be.within(
		// 				amountToSupplyUSDC.mul(10510).div(10000),
		// 				amountToSupplyUSDC.mul(10530).div(10000)
		// 			)
		// 		})
		// 		it("Should be able the same debt and ustp supply when 100% utilization rate", async function () {
		// 			const oldTotalSupplyrUSTP = await rustpool.totalSupplyrUSTP()
		// 			// borrow all usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)
		// 			const newTotalSupplyrUSTP = await rustpool.totalSupplyrUSTP()
		// 			const totalBorrowrUSTP = await rustpool.totalBorrowrUSTP()

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 			// ~= 5.2% apr
		// 			expect(rustpAmount.div(1e12)).to.be.within(
		// 				amountToSupplyUSDC.mul(10510).div(10000),
		// 				amountToSupplyUSDC.mul(10530).div(10000)
		// 			)

		// 			expect(totalBorrowrUSTP.sub(amountToSupplyUSDC.mul(1e12))).to.be.equal(
		// 				newTotalSupplyrUSTP.sub(oldTotalSupplyrUSTP)
		// 			)
		// 		})

		// 		it("Should be able the same debt and ustp supply when 50% utilization rate", async function () {
		// 			const oldTotalSupplyrUSTP = await rustpool.totalSupplyrUSTP()
		// 			// borrow 50% usdc
		// 			await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC.div(2))
		// 			now = now + ONE_YEAR
		// 			await mineBlockWithTimestamp(ethers.provider, now)

		// 			// to realize interest
		// 			await rustpool.connect(admin).setReserveFactor(0)
		// 			const newTotalSupplyrUSTP = await rustpool.totalSupplyrUSTP()
		// 			const totalBorrowrUSTP = await rustpool.totalBorrowrUSTP()

		// 			const rustpAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 			// ~= 2.1% apr
		// 			expect(rustpAmount.div(1e12)).to.be.within(
		// 				amountToSupplyUSDC.mul(10255).div(10000),
		// 				amountToSupplyUSDC.mul(10265).div(10000)
		// 			)

		// 			expect(totalBorrowrUSTP.sub(amountToSupplyUSDC.div(2).mul(1e12))).to.be.equal(
		// 				newTotalSupplyrUSTP.sub(oldTotalSupplyrUSTP)
		// 			)
		// 		})
		// 	})
		// })

		// describe("Liquidate", function () {
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		await usdcToken
		// 			.connect(usdcInvestor)
		// 			.approve(rustpool.address, amountToSupplyUSDC.mul(10))
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC.mul(10))
		// 		await stbtToken
		// 			.connect(stbtInvestor)
		// 			.approve(rustpool.address, amountToSupplySTBT.mul(2))
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT.mul(2))
		// 		await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)
		// 		await rustpool.connect(admin).setLiquidateProvider(stbtInvestor.address, true)
		// 		await liquidatePool.connect(admin).setRedemptionOption(true)
		// 	})

		// 	it(`Should be able to liquidate for with zero fee`, async () => {
		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		// There are some err in interest.
		// 		expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 			liquidateSTBT.mul(99999).div(100000),
		// 			liquidateSTBT.mul(100001).div(100000)
		// 		)

		// 		const mxpBalance = await stbtToken.balanceOf(mxpRedeemPool.address)
		// 		expect(mxpBalance).to.be.equal(liquidateSTBT)

		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken.connect(deployer).transfer(liquidatePool.address, amountToSupplyUSDC)
		// 		const beforeUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		await liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		const afterUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		expect(afterUSDCAmount.sub(beforeUSDCAmount)).to.be.equal(amountToSupplyUSDC)
		// 	})

		// 	it(`Should be able to liquidate for with fee`, async () => {
		// 		await liquidatePool.connect(admin).setLiquidateFeeRate(1000000)

		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		// There are some err in interest.
		// 		expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 			liquidateSTBT.mul(99999).div(100000),
		// 			liquidateSTBT.mul(100001).div(100000)
		// 		)

		// 		const mxpBalance = await stbtToken.balanceOf(mxpRedeemPool.address)
		// 		expect(mxpBalance).to.be.equal(liquidateSTBT)

		// 		const fee = amountToSupplyUSDC.mul(1000000).div(100000000)

		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken.connect(deployer).transfer(liquidatePool.address, amountToSupplyUSDC)
		// 		const beforeUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		await liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		const afterUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		expect(afterUSDCAmount.sub(beforeUSDCAmount)).to.be.equal(amountToSupplyUSDC.sub(fee))
		// 		const feeCollectorBalance = await usdcToken.balanceOf(feeCollector.address)
		// 		expect(feeCollectorBalance).to.be.equal(fee)
		// 	})

		// 	it(`Should be able to liquidate for with interest`, async () => {
		// 		now = now + ONE_YEAR
		// 		await mineBlockWithTimestamp(ethers.provider, now)

		// 		// to realize interest
		// 		await rustpool.connect(admin).setReserveFactor(0)

		// 		const liquidateSTBT = await rustpool.getBorrowedAmount(stbtInvestor.address)

		// 		// ~= 5.2% apr
		// 		expect(liquidateSTBT.div(1e12)).to.be.within(
		// 			amountToSupplyUSDC.mul(10510).div(10000),
		// 			amountToSupplyUSDC.mul(10530).div(10000)
		// 		)

		// 		const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		// There are some err in interest.
		// 		expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 			liquidateSTBT.mul(99999).div(100000),
		// 			liquidateSTBT.mul(100001).div(100000)
		// 		)

		// 		const mxpBalance = await stbtToken.balanceOf(mxpRedeemPool.address)
		// 		expect(mxpBalance).to.be.equal(liquidateSTBT)

		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken
		// 			.connect(deployer)
		// 			.transfer(liquidatePool.address, liquidateSTBT.div(1e12))
		// 		const beforeUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		await liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		const afterUSDCAmount = await usdcToken.balanceOf(usdcInvestor.address)
		// 		expect(afterUSDCAmount.sub(beforeUSDCAmount)).to.be.equal(liquidateSTBT.div(1e12))
		// 	})

		// 	it(`Should be able to finalizeLiquidationById for twice`, async () => {
		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken.connect(deployer).transfer(liquidatePool.address, amountToSupplyUSDC)
		// 		await liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		await expect(
		// 			liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		).to.be.revertedWith("Withdrawn")
		// 	})

		// 	it(`Should be able to finalizeLiquidationById from others`, async () => {
		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken.connect(deployer).transfer(liquidatePool.address, amountToSupplyUSDC)
		// 		await expect(
		// 			liquidatePool.connect(stbtInvestor).finalizeLiquidationById(liquidationIndex)
		// 		).to.be.revertedWith("Not yours.")
		// 	})

		// 	it(`Should be able to liquidate without otc`, async () => {
		// 		await liquidatePool.connect(admin).setRedemptionOption(false)
		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 		// There are some err in interest.
		// 		expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 			liquidateSTBT.mul(99999).div(100000),
		// 			liquidateSTBT.mul(100001).div(100000)
		// 		)

		// 		const mxpBalance = await stbtToken.balanceOf(mxpRedeemPool.address)
		// 		expect(mxpBalance).to.be.equal(liquidateSTBT)
		// 	})

		// 	it(`Should be not able to finalizeLiquidationById when the proccess not done yet.`, async () => {
		// 		await liquidatePool.connect(admin).setProcessPeriod(ONE_WEEK)
		// 		const liquidateSTBT = amountToSupplyUSDC.mul(1e12)
		// 		await rustpool
		// 			.connect(usdcInvestor)
		// 			.liquidateBorrow(stbtInvestor.address, liquidateSTBT)
		// 		const liquidationIndex = await liquidatePool.liquidationIndex()
		// 		await usdcToken.connect(deployer).transfer(liquidatePool.address, amountToSupplyUSDC)
		// 		await expect(
		// 			liquidatePool.connect(usdcInvestor).finalizeLiquidationById(liquidationIndex)
		// 		).to.be.revertedWith("Not done yet.")
		// 	})

		// 	it("Should be not able to more than user owns.", async () => {
		// 		const liquidateSTBT = await rustpool.balanceOf(admin.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(admin)
		// 				.liquidateBorrow(stbtInvestor.address, liquidateSTBT.add(100))
		// 		).to.be.revertedWith("BALANCE_EXCEEDED")
		// 	})

		// 	it("Should be not able to liquidate self", async () => {
		// 		const liquidateSTBT = await rustpool.balanceOf(stbtInvestor.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(stbtInvestor)
		// 				.liquidateBorrow(stbtInvestor.address, liquidateSTBT.add(100))
		// 		).to.be.revertedWith("don't liquidate self.")
		// 	})

		// 	it("Should be not able to more than borrower's debt.", async () => {
		// 		// to realize interest
		// 		await rustpool.connect(admin).setReserveFactor(0)
		// 		const liquidateSTBT = await rustpool.getBorrowedAmount(stbtInvestor.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(usdcInvestor)
		// 				.liquidateBorrow(stbtInvestor.address, liquidateSTBT.mul(2))
		// 		).to.be.revertedWith("repayAmount should be less than borrower's debt.")
		// 	})
		// })
		// describe("Set process period", function () {
		// 	it("Should be not able to set _processPeriod over 7 days", async () => {
		// 		await expect(
		// 			liquidatePool.connect(admin).setProcessPeriod(ONE_WEEK + 1)
		// 		).to.be.revertedWith("should be less than 7 days")
		// 	})
		// })

		// describe("Flash liquidate", function () {
		// 	let testList = [
		// 		{
		// 			tokenName: "DAI",
		// 			tokenIndex: 1,
		// 		},
		// 		{
		// 			tokenName: "USDC",
		// 			tokenIndex: 2,
		// 		},
		// 		{
		// 			tokenName: "USDT",
		// 			tokenIndex: 3,
		// 		},
		// 	]
		// 	beforeEach(async () => {
		// 		now = now + ONE_HOUR
		// 		await mineBlockWithTimestamp(ethers.provider, now)
		// 		await usdcToken
		// 			.connect(usdcInvestor)
		// 			.approve(rustpool.address, amountToSupplyUSDC.mul(10))
		// 		await rustpool.connect(usdcInvestor).supplyUSDC(amountToSupplyUSDC.mul(10))
		// 		await stbtToken
		// 			.connect(stbtInvestor)
		// 			.approve(rustpool.address, amountToSupplySTBT.mul(2))
		// 		await rustpool.connect(stbtInvestor).supplySTBT(amountToSupplySTBT.mul(2))
		// 		await rustpool.connect(stbtInvestor).borrowUSDC(amountToSupplyUSDC)

		// 		await rustpool.connect(stbtInvestor).applyFlashLiquidateProvider()
		// 		await rustpool.connect(admin).acceptFlashLiquidateProvider(stbtInvestor.address)
		// 	})

		// 	testList.forEach(({ tokenName, tokenIndex }, i) => {
		// 		it(`Should be able to flash liquidate for ${tokenName} with zero fee`, async () => {
		// 			const liquidateSTBT = amountToSupplyUSDC.mul(1e12)

		// 			const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			const liquidateOut = await liquidatePool.getFlashLiquidateAmountOutFromCurve(
		// 				liquidateSTBT,
		// 				tokenIndex
		// 			)

		// 			const beforeBalance = await tokens[i].balanceOf(usdcInvestor.address)
		// 			await rustpool
		// 				.connect(usdcInvestor)
		// 				.flashLiquidateBorrow(stbtInvestor.address, liquidateSTBT, tokenIndex, 0)
		// 			const afterBalance = await tokens[i].balanceOf(usdcInvestor.address)
		// 			const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			expect(afterBalance.sub(beforeBalance)).to.be.equal(liquidateOut)
		// 			// There are some err in interest.
		// 			expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 				liquidateSTBT.mul(99999).div(100000),
		// 				liquidateSTBT.mul(100001).div(100000)
		// 			)
		// 		})

		// 		it(`Should be able to flash liquidate for ${tokenName} with fee`, async () => {
		// 			await liquidatePool.connect(admin).setLiquidateFeeRate(1000000)
		// 			const liquidateSTBT = amountToSupplyUSDC.mul(1e12)

		// 			const beforeUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)

		// 			const liquidateOut = await liquidatePool.getFlashLiquidateAmountOutFromCurve(
		// 				liquidateSTBT,
		// 				tokenIndex
		// 			)
		// 			const fee = liquidateOut.mul(1000000).div(100000000)
		// 			const amountAfterFee = liquidateOut.sub(fee)

		// 			const beforeBalance = await tokens[i].balanceOf(usdcInvestor.address)
		// 			await rustpool
		// 				.connect(usdcInvestor)
		// 				.flashLiquidateBorrow(stbtInvestor.address, liquidateSTBT, tokenIndex, 0)
		// 			const afterBalance = await tokens[i].balanceOf(usdcInvestor.address)
		// 			expect(afterBalance.sub(beforeBalance)).to.be.equal(amountAfterFee)

		// 			const feeCollectorBalance = await tokens[i].balanceOf(feeCollector.address)
		// 			expect(feeCollectorBalance).to.be.equal(fee)
		// 			const afterUSDPAmount = await rustpool.balanceOf(usdcInvestor.address)
		// 			// There are some err in interest.
		// 			expect(beforeUSDPAmount.sub(afterUSDPAmount)).to.be.within(
		// 				liquidateSTBT.mul(99999).div(100000),
		// 				liquidateSTBT.mul(100001).div(100000)
		// 			)
		// 		})
		// 	})

		// 	it("Should be not able to more than user owns.", async () => {
		// 		const liquidateSTBT = await rustpool.balanceOf(admin.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(admin)
		// 				.flashLiquidateBorrow(stbtInvestor.address, liquidateSTBT.add(100), 1, 0)
		// 		).to.be.revertedWith("BALANCE_EXCEEDED")
		// 	})

		// 	it("Should be not able to liquidate self", async () => {
		// 		const liquidateSTBT = await rustpool.balanceOf(stbtInvestor.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(stbtInvestor)
		// 				.flashLiquidateBorrow(stbtInvestor.address, liquidateSTBT.add(100), 1, 0)
		// 		).to.be.revertedWith("don't liquidate self.")
		// 	})

		// 	it("Should be not able to more than borrower's debt.", async () => {
		// 		// to realize interest
		// 		await rustpool.connect(admin).setReserveFactor(0)
		// 		const liquidateSTBT = await rustpool.getBorrowedAmount(stbtInvestor.address)
		// 		await expect(
		// 			rustpool
		// 				.connect(usdcInvestor)
		// 				.flashLiquidateBorrow(stbtInvestor.address, liquidateSTBT.mul(2), 1, 0)
		// 		).to.be.revertedWith("repayAmount should be less than borrower's debt.")
		// 	})
	})
})
