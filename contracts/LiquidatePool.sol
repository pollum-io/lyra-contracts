// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract LiquidatePool is AccessControl {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

	bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

	address public admin;
	// rbrllpool
	address public rbrllpool;
	// tselic address
	IERC20 public tselic;
	// drex address
	IERC20 public drex;
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
		address _tselic,
		address _drex,
		ISwapRouter _swapRouter
	) {
		require(_admin != address(0), "!_admin");
		require(_rbrllpool != address(0), "!_rbrllpool");
		require(_tselic != address(0), "!_tselic");
		require(_drex != address(0), "!_drex");

		admin = _admin;
		rbrllpool = _rbrllpool;
		tselic = IERC20(_tselic);
		drex = IERC20(_drex);
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
	 * @dev liquidate a give amout of tselic on UniswapV3
	 * @param drexAmount the amout of drex to be liquidated
	 * @param amountInMaximum the maximum amount of tselic to be liquidated
	 * @param receiver used to receive token
	 */
	function flashLiquidateTSELIC(
		uint256 drexAmount,
		uint256 amountInMaximum,
		address receiver
	) external returns (uint256 amountLiquidated) {
		require(msg.sender == rbrllpool, "unauthorized");

		tselic.approve(address(swapRouter), amountInMaximum);

		// We set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact output amount.
		ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
			tokenIn: address(tselic),
			tokenOut: address(drex),
			fee: 3000,
			recipient: address(this),
			deadline: block.timestamp,
			amountOut: drexAmount,
			amountInMaximum: amountInMaximum,
			sqrtPriceLimitX96: 0
		});

		// The call to `exactOutputSingle` executes the swap.
		amountLiquidated = swapRouter.exactOutputSingle(params);
		uint256 leftover = amountInMaximum.sub(amountLiquidated);
		uint256 feeAmount = drexAmount.mul(liquidateFeeRate).div(FEE_COEFFICIENT);
		uint256 amountAfterFee = drexAmount.sub(feeAmount);
		drex.safeTransfer(receiver, amountAfterFee);
		drex.safeTransfer(feeCollector, feeAmount);
		tselic.safeTransfer(address(rbrllpool), leftover);
	}
}
