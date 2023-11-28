const { ethers } = require("hardhat")
const bn = require("bignumber.js")
const { Pool, Position, nearestUsableTick } = require("@uniswap/v3-sdk")
const { Token } = require("@uniswap/sdk-core")
const { startLocalFunctionsTestnet, SubscriptionManager, buildRequestCBOR, } = require("@chainlink/functions-toolkit")
const FunctionsRouter = require("@chainlink/functions-toolkit/dist/v1_contract_sources/FunctionsRouter")
const LINK_AMOUNT = "100"
const process = require("process")
const path = require("path")
const fs = require("fs")
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

	await tselicToken
		.connect(deployer)
		.transfer(investor.address, ethers.utils.parseUnits("100", 18))
	await tselicToken
		.connect(deployer)
		.transfer(investor2.address, ethers.utils.parseUnits("100", 18))

	return { drexToken, tselicToken }
}

async function deployUniPoolFixture(deployer, tselicToken, drexToken) {
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
	endereco1 = drexToken.address
	endereco2 = tselicToken.address
	if (tselicToken.address > drexToken.address) {
		endereco1 = tselicToken.address
		endereco2 = drexToken.address
	}
	await nonfungiblePositionManager
		.connect(deployer)
		.createAndInitializePoolIfNecessary(
			endereco2,
			endereco1,
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
	let { amount0: amount0Desired, amount1: amount1Desired } = position.mintAmounts
	token1addr = drexToken.address
	token0addr = tselicToken.address
	if (tselicToken.address > drexToken.address) {
		amount0Desired = amount1Desired
		amount1Desired = amount0Desired
		token1addr = tselicToken.address
		token0addr = drexToken.address
	}

	params = {
		token0: token0addr,
		token1: token1addr,
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
	return swapRouter
}

async function deployLocalChainlinkFunctions(admin, deployer) {
	const requestConfigPath = path.join(process.cwd(), "Functions-request-config.js") // @dev Update this to point to your desired request config file
	const requestConfig = require(requestConfigPath)
	let secretsLocation, encryptedSecretsReference;
	const localFunctionsTestnetInfo = await startLocalFunctionsTestnet(admin, requestConfigPath)
	await localFunctionsTestnetInfo.getFunds(deployer.address, {
		weiAmount: ethers.utils.parseEther("1").toString(), // 1000 ETH
		juelsAmount: ethers.utils.parseEther("10000").toString(), // 1000 LINK
	})
	functionsAddresses = {
		functionsRouter: localFunctionsTestnetInfo.functionsRouterContract.address,
		linkToken: localFunctionsTestnetInfo.linkTokenContract.address,
		donId: localFunctionsTestnetInfo.donId,
	}
	const donIdBytes32 = hre.ethers.utils.formatBytes32String(functionsAddresses.donId)
	const functionsRouter = new ethers.Contract(
		functionsAddresses.functionsRouter,
		FunctionsRouter.FunctionsRouterSource.abi,
		admin
	)
	const autoConsumerContractFactory = await ethers.getContractFactory(
		"AutomatedFunctionsConsumer"
	)
	const autoConsumerContract = await autoConsumerContractFactory.deploy(
		functionsAddresses.functionsRouter,
		donIdBytes32
	)
	await autoConsumerContract.deployTransaction.wait(1)

	const consumerAddress = autoConsumerContract.address
	const allowlist = await functionsRouter.getAllowListId()
	const txOptions = { confirmations: 1 }
	const sm = new SubscriptionManager({ signer: admin, linkTokenAddress: functionsAddresses.linkToken, functionsRouterAddress: functionsAddresses.functionsRouter })
	await sm.initialize()
	const subscriptionId = await sm.createSubscription({ consumerAddress, txOptions })

	const juelsAmount = ethers.utils.parseUnits(LINK_AMOUNT, 18).toString()
	const fundTxReceipt = await sm.fundSubscription({ juelsAmount, subscriptionId, txOptions })
	const subInfo = await sm.getSubscriptionInfo(subscriptionId)
	// parse  balances into LINK for readability
	subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
	subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"

	const functionsRequestCBOR = buildRequestCBOR({
		codeLocation: requestConfig.codeLocation,
		codeLanguage: requestConfig.codeLanguage,
		source: requestConfig.source,
		args: requestConfig.args,
		secretsLocation,
		encryptedSecretsReference,
	})
	const setRequestTx = await autoConsumerContract.setRequest(
		subscriptionId,
		250000,
		5,
		functionsRequestCBOR
	)
	await setRequestTx.wait(1)
	// console.log("\nSet request Tx confirmed")
	return { functionsAddresses, autoConsumerContract }
}

async function deployrBRLLPoolFixture(admin, deployer, tselic, drex) {
	const rBRLLPool = await ethers.getContractFactory("rBRLLPool")
	let rbrllpool = await rBRLLPool
		.connect(deployer)
		.deploy(admin.address, tselic.address, drex.address)
	await rbrllpool.deployed()
	// SET ROLE
	let POOL_MANAGER_ROLE = await rbrllpool.POOL_MANAGER_ROLE()
	await rbrllpool.connect(admin).grantRole(POOL_MANAGER_ROLE, admin.address)
	return rbrllpool
}

async function deployInterestRateModelFixture(deployer, automatedFunctionsConsumer) {
	const InterestRateModel = await ethers.getContractFactory("InterestRateModel")
	let interestRateModel = await InterestRateModel.connect(deployer).deploy(
		automatedFunctionsConsumer.address
	)
	await interestRateModel.deployed()
	return interestRateModel
}

async function deployLiquidatePoolFixture(admin, deployer, rbrllpool, tselic, drex, swapRouter) {
	const LiquidatePool = await ethers.getContractFactory("LiquidatePool")

	let liquidatePool = await LiquidatePool.connect(deployer).deploy(
		admin.address,
		rbrllpool.address,
		tselic.address,
		drex.address,
		swapRouter.address
	)
	await liquidatePool.deployed()
	return liquidatePool
}

module.exports = {
	deployTokensFixture,
	deployUniPoolFixture,
	deployLocalChainlinkFunctions,
	deployrBRLLPoolFixture,
	deployLiquidatePoolFixture,
	deployInterestRateModelFixture,
}
