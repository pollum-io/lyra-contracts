// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract LiquidatePool is AccessControl {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

	bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

	address public admin;
	// rbrllpool
	address public rbrllpool;
	// stbt address
	IERC20 public stbt;
	// usdc address
	IERC20 public usdc;
	// uniswap router
	ISwapRouter swapRouter;

	// Used to calculate the fee base.
	uint256 public constant FEE_COEFFICIENT = 1e8;
	// Max fee rates can't over then 1%
	uint256 public constant maxLiquidateFeeRate = FEE_COEFFICIENT / 100;

	// It's used when call liquidate method.
	uint256 public liquidateFeeRate;
	// Fee Collector, used to receive fee.
	address public feeCollector;

	event FeeCollectorChanged(address newFeeCollector);
	event LiquidateFeeRateChanged(uint256 newLiquidateFeeRate);
	event UniRouterChanged(address newUniRouter);

	constructor(
		address _admin,
		address _rbrllpool,
		address _stbt,
		address _usdc,
		ISwapRouter _swapRouter
	) {
		require(_admin != address(0), "!_admin");
		require(_rbrllpool != address(0), "!_rbrllpool");
		require(_stbt != address(0), "!_stbt");
		require(_usdc != address(0), "!_usdc");

		admin = _admin;
		rbrllpool = _rbrllpool;
		stbt = IERC20(_stbt);
		usdc = IERC20(_usdc);
		swapRouter = _swapRouter;

		_setRoleAdmin(POOL_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
		_setupRole(DEFAULT_ADMIN_ROLE, admin);
		_setupRole(POOL_MANAGER_ROLE, admin);
	}

	/**
	 * @dev to set the collector of fee
	 * @param _feeCollector the address of collector
	 */
	function setFeeCollector(address _feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
		require(_feeCollector != address(0), "!_feeCollector");
		feeCollector = _feeCollector;
		emit FeeCollectorChanged(feeCollector);
	}

	/**
	 * @dev to set the rate of liquidate fee
	 * @param _liquidateFeeRate the rate. it should be multiply 10**6
	 */
	function setLiquidateFeeRate(uint256 _liquidateFeeRate) external onlyRole(POOL_MANAGER_ROLE) {
		require(
			_liquidateFeeRate <= maxLiquidateFeeRate,
			"Liquidate fee rate should be less than 1%."
		);
		liquidateFeeRate = _liquidateFeeRate;
		emit LiquidateFeeRateChanged(liquidateFeeRate);
	}

	/**
	 * @dev to set the uniswap router
	 * @param _swapRouter the address of uniswap router
	 */
	function setUniRouter(address _swapRouter) external onlyRole(DEFAULT_ADMIN_ROLE) {
		require(_swapRouter != address(0), "!_swapRouter");
		swapRouter = ISwapRouter(_swapRouter);
		emit UniRouterChanged(_swapRouter);
	}

	/**
	 * @dev Transfer a give amout of stbt to matrixport's mint pool
	 * @param stbtAmount the amout of stbt
	 * @param minReturn the minimum amount of return
	 * @param receiver used to receive token
	 */
	function flashLiquidatetSELIC(
		uint256 stbtAmount,
		uint256 minReturn,
		address receiver
	) external {
		require(msg.sender == rbrllpool, "unauthorized");

		stbt.approve(address(swapRouter), stbtAmount);

		// We set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
			tokenIn: address(stbt),
			tokenOut: address(usdc),
			fee: 3000,
			recipient: msg.sender,
			deadline: block.timestamp,
			amountIn: stbtAmount,
			amountOutMinimum: minReturn,
			sqrtPriceLimitX96: 0
		});

		// The call to `exactInputSingle` executes the swap.
		uint256 amountOut = swapRouter.exactInputSingle(params);

		uint256 feeAmount = amountOut.mul(liquidateFeeRate).div(FEE_COEFFICIENT);
		uint256 amountAfterFee = amountOut.sub(feeAmount);
		usdc.safeTransfer(receiver, amountAfterFee);
		usdc.safeTransfer(feeCollector, feeAmount);
	}
}
