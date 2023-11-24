const { ethers } = require("hardhat")
const bn = require("bignumber.js")
const { Pool, Position, nearestUsableTick } = require("@uniswap/v3-sdk")
const { Token } = require("@uniswap/sdk-core")
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })
const artifacts = {
	UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
	SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
	NFTDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json"),
	NonfungibleTokenPositionDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json"),
	NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
	UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
}

const linkLibraries = ({ bytecode, linkReferences }, libraries) => {
	Object.keys(linkReferences).forEach((fileName) => {
		Object.keys(linkReferences[fileName]).forEach((contractName) => {
			if (!libraries.hasOwnProperty(contractName)) {
				throw new Error(`Missing link library name ${contractName}`)
			}
			const address = ethers.utils.getAddress(libraries[contractName]).toLowerCase().slice(2)
			linkReferences[fileName][contractName].forEach(({ start, length }) => {
				const start2 = 2 + start * 2
				const length2 = length * 2
				bytecode = bytecode
					.slice(0, start2)
					.concat(address)
					.concat(bytecode.slice(start2 + length2, bytecode.length))
			})
		})
	})
	return bytecode
}

function encodePriceSqrt(reserve1, reserve0) {
	return ethers.BigNumber.from(
		new bn(reserve1.toString())
			.div(reserve0.toString())
			.sqrt()
			.multipliedBy(new bn(2).pow(96))
			.integerValue(3)
			.toString()
	)
}

async function getPoolData(poolContract) {
	const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
		poolContract.tickSpacing(),
		poolContract.fee(),
		poolContract.liquidity(),
		poolContract.slot0(),
	])

	return {
		tickSpacing: tickSpacing,
		fee: fee,
		liquidity: liquidity,
		sqrtPriceX96: slot0[0],
		tick: slot0[1],
	}
}

async function deployTokensFixture(deployer, investor, investor2) {
	const DREX = await ethers.getContractFactory("DREX")
	const TSELIC29 = await ethers.getContractFactory("TSELIC29")
	let drexToken = await DREX.connect(deployer).deploy()
	let tselicToken = await TSELIC29.connect(deployer).deploy()

	await drexToken.deployed()
	await tselicToken.deployed()

	await drexToken.connect(deployer).transfer(investor.address, ethers.utils.parseUnits("1000", 6))

	await drexToken
		.connect(deployer)
		.transfer(investor2.address, ethers.utils.parseUnits("1000", 6))

	return { drexToken, tselicToken }
}

async function deployUniPoolFixture(deployer, drexToken, tselicToken) {
	Weth = await ethers.getContractFactory("WETH9")
	weth = await Weth.deploy()
	await weth.deployed()

	const UniFactory = new ethers.ContractFactory(
		artifacts.UniswapV3Factory.abi,
		artifacts.UniswapV3Factory.bytecode,
		deployer
	)
	let uniFactory = await UniFactory.deploy()
	await uniFactory.deployed()

	const SwapRouter = new ethers.ContractFactory(
		artifacts.SwapRouter.abi,
		artifacts.SwapRouter.bytecode,
		deployer
	)
	let swapRouter = await SwapRouter.deploy(uniFactory.address, weth.address)
	await swapRouter.deployed()

	const NFTDescriptor = new ethers.ContractFactory(
		artifacts.NFTDescriptor.abi,
		artifacts.NFTDescriptor.bytecode,
		deployer
	)
	let nftDescriptor = await NFTDescriptor.deploy()
	await nftDescriptor.deployed()

	const linkedBytecode = linkLibraries(
		{
			bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
			linkReferences: {
				"NFTDescriptor.sol": {
					NFTDescriptor: [
						{
							length: 20,
							start: 1681,
						},
					],
				},
			},
		},
		{
			NFTDescriptor: nftDescriptor.address,
		}
	)

	const NonfungibleTokenPositionDescriptor = new ethers.ContractFactory(
		artifacts.NonfungibleTokenPositionDescriptor.abi,
		linkedBytecode,
		deployer
	)
	const nativeCurrencyLabelBytes = ethers.utils.formatBytes32String("WETH")
	let nonfungibleTokenPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(
		weth.address,
		nativeCurrencyLabelBytes
	)
	await nonfungibleTokenPositionDescriptor.deployed()

	const NonfungiblePositionManager = new ethers.ContractFactory(
		artifacts.NonfungiblePositionManager.abi,
		artifacts.NonfungiblePositionManager.bytecode,
		deployer
	)
	let nonfungiblePositionManager = await NonfungiblePositionManager.deploy(
		uniFactory.address,
		weth.address,
		nonfungibleTokenPositionDescriptor.address
	)
	await nonfungiblePositionManager.deployed()

	await nonfungiblePositionManager
		.connect(deployer)
		.createAndInitializePoolIfNecessary(
			tselicToken.address,
			drexToken.address,
			3000,
			encodePriceSqrt(13991000000, 1000000000000000000),
			{ gasLimit: 5000000 }
		)

	const poolAddress = await uniFactory
		.connect(deployer)
		.getPool(tselicToken.address, drexToken.address, 3000)

	tselicToken
		.connect(deployer)
		.approve(nonfungiblePositionManager.address, ethers.utils.parseUnits("1000000", 18))
	drexToken
		.connect(deployer)
		.approve(nonfungiblePositionManager.address, ethers.utils.parseUnits("1000000", 6))

	const poolContract = new ethers.Contract(
		poolAddress,
		artifacts.UniswapV3Pool.abi,
		ethers.provider
	)
	const poolData = await getPoolData(poolContract)

	const TselicToken = new Token(1337, tselicToken.address, 18, "TSELIC29", "TESOURO SELIC 2029")
	const DrexToken = new Token(1337, drexToken.address, 6, "DREX", "Real Digital X")

	const pool = new Pool(
		TselicToken,
		DrexToken,
		poolData.fee,
		poolData.sqrtPriceX96.toString(),
		poolData.liquidity.toString(),
		poolData.tick
	)

	const position = new Position({
		pool: pool,
		liquidity: ethers.utils.parseEther("1"),
		tickLower:
			nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
		tickUpper:
			nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
	})
	const { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts
	params = {
		token0: tselicToken.address,
		token1: drexToken.address,
		fee: poolData.fee,
		tickLower:
			nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
		tickUpper:
			nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
		amount0Desired: amount0Desired.toString(),
		amount1Desired: amount1Desired.toString(),
		amount0Min: 0,
		amount1Min: 0,
		recipient: deployer.address,
		deadline: Math.floor(Date.now() / 1000) + 60 * 10,
	}
	const tx = await nonfungiblePositionManager
		.connect(deployer)
		.mint(params, { gasLimit: "1000000" })
	await tx.wait()

	return { poolContract }
}

// async function deployMockPriceFeedFixture(deployer) {
// 	const PriceFeed = await ethers.getContractFactory("MockPriceFeed")
// 	let priceFeed = await PriceFeed.connect(deployer).deploy()
// 	await priceFeed.deployed()
// 	return { priceFeed }
// }

// async function deployrUSTPoolFixture(admin, deployer, stbt, usdc) {
// 	const rUSTPool = await ethers.getContractFactory("rUSTPool")
// 	let rustpool = await rUSTPool
// 		.connect(deployer)
// 		.deploy(admin.address, stbt.address, usdc.address)
// 	await rustpool.deployed()
// 	// SET ROLE
// 	let POOL_MANAGER_ROLE = await rustpool.POOL_MANAGER_ROLE()
// 	await rustpool.connect(admin).grantRole(POOL_MANAGER_ROLE, admin.address)
// 	return { rustpool }
// }

// async function deploywSTBTPoolFixture(admin, deployer, wstbt, usdc) {
// 	const wSTBTPool = await ethers.getContractFactory("wSTBTPool")
// 	let wstbtPool = await wSTBTPool
// 		.connect(deployer)
// 		.deploy(admin.address, wstbt.address, usdc.address)
// 	await wstbtPool.deployed()
// 	// SET ROLE
// 	let POOL_MANAGER_ROLE = await wstbtPool.POOL_MANAGER_ROLE()
// 	await wstbtPool.connect(admin).grantRole(POOL_MANAGER_ROLE, admin.address)
// 	return { wstbtPool }
// }

// async function deployInterestRateModelFixture(deployer) {
// 	const InterestRateModel = await ethers.getContractFactory("InterestRateModel")
// 	let interestRateModel = await InterestRateModel.connect(deployer).deploy()
// 	await interestRateModel.deployed()
// 	return { interestRateModel }
// }

// async function deployLiquidatePoolFixture(
// 	admin,
// 	deployer,
// 	rustpool,
// 	mxpRedeemPool,
// 	stbt,
// 	usdc,
// 	priceFeed,
// 	coins
// ) {
// 	const LiquidatePool = await ethers.getContractFactory("LiquidatePool")
// 	let liquidatePool = await LiquidatePool.connect(deployer).deploy(
// 		admin.address,
// 		rustpool.address,
// 		mxpRedeemPool.address,
// 		stbt.address,
// 		usdc.address,
// 		priceFeed.address,
// 		coins
// 	)
// 	await liquidatePool.deployed()
// 	return { liquidatePool }
// }

module.exports = {
	deployTokensFixture,
	deployUniPoolFixture,
	// deployMockPriceFeedFixture,
	// deployrUSTPoolFixture,
	// deployLiquidatePoolFixture,
	// deployInterestRateModelFixture,
	// deploywSTBTPoolFixture,
}