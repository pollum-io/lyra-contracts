// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./interfaces/IInterestRateModel.sol";
import "./interfaces/ILiquidatePool.sol";
import "./rBRLL.sol";

contract rBRLLPool is rBRLL, AccessControl, Pausable {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

	bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

	uint256 public lastCheckpoint;
	// Used to calculate the interest base.
	uint256 public constant APR_COEFFICIENT = 1e8;
	// Used to calculate the fee base.
	uint256 public constant FEE_COEFFICIENT = 1e8;
	// Used to calculate shares of TSELIC deposited by users.
	uint256 public totalDepositedTSELIC;
	// Used to calculate total supply of rBRLL.
	uint256 public totalSupplyrBRLL;

	uint256 public safeCollateralRate = 101 * 1e18;
	uint256 public reserveFactor;

	// Used to record the user's TSELIC shares.
	mapping(address => uint256) public depositedTSELIC;
	// Used to record the user's loan shares of rBRLL.
	mapping(address => uint256) borrowedShares;
	uint256 public totalBorrowShares;
	uint256 public totalBorrowrBRLL;

	// Used to be a flash liquidate provider
	mapping(address => bool) liquidateProvider;

	// collateral token.
	IERC20 public tselic;
	// Used to mint rBRLL.
	IERC20 public drex;
	// interest rate model
	IInterestRateModel public interestRateModel;
	ILiquidatePool public liquidatePool;

	// the claimable fee for protocol
	// reserves will be claim with rBRLL.
	uint256 public totalUnclaimReserves;

	event SupplyTSELIC(address indexed user, uint256 amount, uint256 timestamp);
	event SupplyDREX(address indexed user, uint256 amount, uint256 timestamp);
	event Mint(address indexed user, uint256 amount, uint256 timestamp);
	event Burn(address indexed user, uint256 amount, uint256 timestamp);
	event WithdrawTSELIC(address indexed user, uint256 amount, uint256 timestamp);
	event WithdrawDREX(address indexed user, uint256 amount, uint256 timestamp);
	event BorrowDREX(address indexed user, uint256 amount, uint256 timestamp);
	event RepayDREX(address indexed user, uint256 amount, uint256 timestamp);

	event ReservesAdded(uint256 addAmount, uint256 newTotalUnclaimReserves);
	event LiquidationRecord(
		address liquidator,
		address indexed borrower,
		uint256 rBRLLAmount,
		uint256 timestamp
	);

	event SafeCollateralRateChanged(uint256 newSafeRatio);

	event NewLiquidateProvider(address user, bool status);

	event MintDebt(address indexed user, uint256 amount, uint256 shareAmount, uint256 timestamp);
	event BurnDebt(address indexed user, uint256 amount, uint256 shareAmount, uint256 timestamp);

	constructor(
		address admin,
		IERC20 _tselic,
		IERC20 _drex
	) ERC20("Interest-bearing BRL of Lyra Loans", "rBRLL") {
		_setupRole(DEFAULT_ADMIN_ROLE, admin);
		tselic = _tselic;
		drex = _drex;
	}

	modifier realizeInterest() {
		if (totalSupplyrBRLL != 0) {
			uint256 totalInterest = getSR().mul(block.timestamp.sub(lastCheckpoint));
			uint256 reserves = totalInterest.mul(reserveFactor).div(FEE_COEFFICIENT);

			totalSupplyrBRLL = totalSupplyrBRLL.add(totalInterest).sub(reserves);
			totalUnclaimReserves = totalUnclaimReserves.add(reserves);
			totalBorrowrBRLL = totalBorrowrBRLL.add(totalInterest);

			emit ReservesAdded(reserves, totalUnclaimReserves);
		}
		lastCheckpoint = block.timestamp;
		_;
	}

	/**
	 * @notice Pause the contract. Revert if already paused.
	 */
	function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
		_pause();
	}

	/**
	 * @notice Unpause the contract. Revert if already unpaused.
	 */
	function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
		_unpause();
	}

	/**
	 * @dev to set the liquidate pool
	 * @param _address the address of liquidate pool
	 */
	function initLiquidatePool(
		address _address
	) external onlyRole(DEFAULT_ADMIN_ROLE) realizeInterest {
		require(address(liquidatePool) == address(0), "initialized.");
		liquidatePool = ILiquidatePool(_address);
	}

	/**
	 * @dev claim protocol's reserves fee
	 * @param _receiver the address be used to receive reserves fee.
	 */
	function claimReservesFee(
		address _receiver
	) external realizeInterest onlyRole(DEFAULT_ADMIN_ROLE) {
		_mintrBRLL(_receiver, totalUnclaimReserves);
		totalUnclaimReserves = 0;
	}

	/**
	 * @dev to set the rate of manager fee
	 * @param _reserveFactor the rate. it should be multiply 10**6
	 */
	function setReserveFactor(
		uint256 _reserveFactor
	) external onlyRole(POOL_MANAGER_ROLE) realizeInterest {
		require(_reserveFactor <= FEE_COEFFICIENT, "reserve factor should be less than 100%.");
		reserveFactor = _reserveFactor;
	}

	/**
	 * @dev to set interest rate model
	 * @param _interestRateModel the model address
	 */
	function setInterestRateModel(
		IInterestRateModel _interestRateModel
	) external onlyRole(POOL_MANAGER_ROLE) realizeInterest {
		interestRateModel = _interestRateModel;
	}

	/**
	 * @notice  safeCollateralRate
	 */
	function setSafeCollateralRate(
		uint256 newSafeRatio
	) external onlyRole(POOL_MANAGER_ROLE) realizeInterest {
		require(newSafeRatio >= 101 * 1e18, "Safe CollateralRate should more than 101%");
		safeCollateralRate = newSafeRatio;
		emit SafeCollateralRateChanged(newSafeRatio);
	}

	/**
	 * @notice Supply DREX.
	 * Emits a `SupplyDREX` event.
	 *
	 * @param _amount the amount of DREX
	 */
	function supplyDREX(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Supply DREX should be more than 0.");
		drex.transferFrom(msg.sender, address(this), _amount);

		// convert to rBRLL.
		uint256 convertTorBRLL = _amount.mul(1e12);

		_mintrBRLL(msg.sender, convertTorBRLL);

		emit SupplyDREX(msg.sender, _amount, block.timestamp);
	}

	/**
	 * @notice Supply TSELIC.
	 * Emits a `SupplyTSELIC` event.
	 *
	 * @param _amount the amount of TSELIC.
	 */
	function supplyTSELIC(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Supply TSELIC should be more than 0.");
		_supplyTSELICFor(_amount, msg.sender);
	}

	/**
	 * @notice Supply TSELIC for others.
	 * Emits a `SupplyTSELIC` event.
	 *
	 * @param _amount the amount of TSELIC.
	 * @param _receiver receiver
	 */

	function supplyTSELICFor(
		uint256 _amount,
		address _receiver
	) external whenNotPaused realizeInterest {
		require(_amount > 0, "Supply TSELIC should be more than 0.");
		_supplyTSELICFor(_amount, _receiver);
	}

	function _supplyTSELICFor(uint256 _amount, address _receiver) internal {
		tselic.transferFrom(msg.sender, address(this), _amount);

		totalDepositedTSELIC += _amount;
		depositedTSELIC[_receiver] += _amount;

		emit SupplyTSELIC(_receiver, _amount, block.timestamp);
	}

	/**
	 * @notice Withdraw TSELIC to an address.
	 * Emits a `WithdrawTSELIC` event.
	 *
	 * @param _amount the amount of TSELIC.
	 */
	function withdrawTSELIC(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Withdraw TSELIC should be more than 0.");

		totalDepositedTSELIC -= _amount;
		depositedTSELIC[msg.sender] -= _amount;

		_requireIsSafeCollateralRate(msg.sender);
		tselic.transfer(msg.sender, _amount);

		emit WithdrawTSELIC(msg.sender, _amount, block.timestamp);
	}

	/**
	 * @notice Withdraw all TSELIC to an address.
	 * Emits a `WithdrawTSELIC` event.
	 *
	 */
	function withdrawAllTSELIC() external whenNotPaused realizeInterest {
		uint256 withdrawShares = depositedTSELIC[msg.sender];
		require(withdrawShares > 0, "Withdraw TSELIC should be more than 0.");

		totalDepositedTSELIC -= withdrawShares;
		depositedTSELIC[msg.sender] = 0;

		_requireIsSafeCollateralRate(msg.sender);
		tselic.transfer(msg.sender, withdrawShares);

		emit WithdrawTSELIC(msg.sender, withdrawShares, block.timestamp);
	}

	/**
	 * @notice Withdraw DREX to an address.
	 * rBRLL:DREX always 1:1.
	 * Emits a `WithdrawDREX` event.
	 *
	 * @param _amount the amount of DREX.
	 */
	function withdrawDREX(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Withdraw DREX should be more than 0.");

		// convert to rBRLL.
		uint256 convertTorBRLL = _amount.mul(10 ** 12);

		_burnrBRLL(msg.sender, convertTorBRLL);
		drex.transfer(msg.sender, _amount);

		emit WithdrawDREX(msg.sender, _amount, block.timestamp);
	}

	/**
	 * @notice Withdraw all DREX to an address.
	 * rBRLL:DREX always 1:1.
	 * Emits a `WithdrawDREX` event.
	 *
	 */
	function withdrawAllDREX() external whenNotPaused realizeInterest {
		uint256 _amount = balanceOf(msg.sender);
		require(_amount > 0, "Withdraw DREX should be more than 0.");

		// convert to DREX.
		uint256 convertToDREX = _amount.div(10 ** 12);

		_burnrBRLL(msg.sender, _amount);

		if (convertToDREX > 0) {
			drex.transfer(msg.sender, convertToDREX);
		}

		emit WithdrawDREX(msg.sender, convertToDREX, block.timestamp);
	}

	/**
	 * @notice Borrow DREX to an address.
	 * Emits a `BorrowDREX` event.
	 *
	 * @param _amount the amount of DREX.
	 */
	function borrowDREX(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Borrow DREX should be more thea 0.");

		// convert to rBRLL.
		uint256 convertTorBRLL = _amount.mul(10 ** 12);

		_mintrBRLLDebt(msg.sender, convertTorBRLL);
		_requireIsSafeCollateralRate(msg.sender);

		drex.safeTransfer(msg.sender, _amount);

		emit BorrowDREX(msg.sender, _amount, block.timestamp);
	}

	/**
	 * @notice Repay DREX from user
	 * Emits a `RepayDREX` event.
	 *
	 * @param _amount the amount of DREX.
	 */
	function repayDREX(uint256 _amount) external whenNotPaused realizeInterest {
		require(_amount > 0, "Repay DREX should be more than 0.");

		drex.transferFrom(msg.sender, address(this), _amount);
		// convert to rBRLL.
		uint256 convertTorBRLL = _amount.mul(1e12);

		_burnrBRLLDebt(msg.sender, convertTorBRLL);

		emit RepayDREX(msg.sender, _amount, block.timestamp);
	}

	/**
	 * @notice Repay all DREX from user
	 * Emits a `RepayDREX` event.
	 *
	 */
	function repayAll() external whenNotPaused realizeInterest {
		uint256 userBorrowShares = borrowedShares[msg.sender];
		require(userBorrowShares > 0, "Repay DREX should be more than 0.");

		uint256 repayrBRLL = getBorrowrBRLLAmountByShares(userBorrowShares);

		// convert to DREX.
		uint256 convertToDREX = repayrBRLL.div(1e12) + 1;
		drex.transferFrom(msg.sender, address(this), convertToDREX);

		_burnrBRLLDebt(msg.sender, repayrBRLL);

		emit RepayDREX(msg.sender, convertToDREX, block.timestamp);
	}

	/**
	 * @notice The sender liquidates the borrowers collateral by Uniswap.
	 * *Can be liquidated at any time*
	 * Emits a `LiquidationRecord` event.
	 *
	 * @param borrower The borrower be liquidated
	 * @param repayAmount The amount of the rBRLL to repay
	 * @param minReturn the minimum amount of return
	 */
	function flashLiquidateBorrow(
		address borrower,
		uint256 repayAmount,
		uint256 minReturn
	) external whenNotPaused realizeInterest {
		require(liquidateProvider[borrower], "borrower is not a provider.");
		_liquidateProcedure(borrower, repayAmount);
		liquidatePool.flashLiquidateTSELIC(repayAmount, minReturn, msg.sender);

		emit LiquidationRecord(msg.sender, borrower, repayAmount, block.timestamp);
	}

	function _liquidateProcedure(address borrower, uint256 repayAmount) internal {
		require(msg.sender != borrower, "don't liquidate self.");
		uint256 borrowedBRL = getBorrowrBRLLAmountByShares(borrowedShares[borrower]);
		require(borrowedBRL >= repayAmount, "repayAmount should be less than borrower's debt.");
		_burnrBRLL(msg.sender, repayAmount);

		_burnrBRLLDebt(borrower, repayAmount);

		// TODO verify the decimal places.
		uint256 liquidateTSELIC = repayAmount.div(_tselicPrice());

		require(
			depositedTSELIC[borrower] >= liquidateTSELIC,
			"repayAmount should be less than borrower's deposit."
		);
		totalDepositedTSELIC -= liquidateTSELIC;
		depositedTSELIC[borrower] -= liquidateTSELIC;

		tselic.transfer(address(liquidatePool), repayAmount);
	}

	/**
	 * @notice Admin add a provider
	 */
	function setLiquidateProvider(address user, bool status) external onlyRole(POOL_MANAGER_ROLE) {
		liquidateProvider[user] = status;
		emit NewLiquidateProvider(user, status);
	}

	/**
	 * @notice Get the borrowed shares of user
	 *
	 * @param user the address of borrower
	 */

	function getBorrowedSharesOf(address user) external view returns (uint256) {
		return borrowedShares[user];
	}

	/**
	 * @notice Get the borrowed amount of user
	 *
	 * @param user the address of borrower
	 */

	function getBorrowedAmount(address user) public view returns (uint256) {
		return getBorrowrBRLLAmountByShares(borrowedShares[user]);
	}

	/**
	 * @return the amount of borrow shares that corresponds to `_rBRLLAmount` protocol-borrowed rBRLL.
	 */
	function getBorrowSharesByrBRLLAmount(uint256 _rBRLLAmount) public view returns (uint256) {
		return
			totalBorrowrBRLL == 0 ? 0 : _rBRLLAmount.mul(totalBorrowShares).div(totalBorrowrBRLL);
	}

	/**
	 * @return the amount of borrow rBRLL that corresponds to `_sharesAmount` borrow shares.
	 */
	function getBorrowrBRLLAmountByShares(uint256 _sharesAmount) public view returns (uint256) {
		return
			totalBorrowShares == 0 ? 0 : _sharesAmount.mul(totalBorrowrBRLL).div(totalBorrowShares);
	}

	/**
	 * @dev mint rBRLL for _receiver.
	 * Emits`Mint` and `Transfer` event.
	 *
	 * @param _receiver the address be used to receive rBRLL.
	 * @param _amount the amount of rBRLL.
	 */
	function _mintrBRLL(address _receiver, uint256 _amount) internal {
		uint256 sharesAmount = getSharesByrBRLLAmount(_amount);
		if (sharesAmount == 0) {
			//rBRLL shares are 1:1 to DREX at first.
			sharesAmount = _amount;
		}
		_mintShares(_receiver, sharesAmount);
		totalSupplyrBRLL += _amount;
		emit Mint(msg.sender, _amount, block.timestamp);
		emit Transfer(address(0), _receiver, _amount);
	}

	/**
	 * @dev burn rBRLL from _receiver.
	 * Emits`Burn` and `Transfer` event.
	 *
	 * @param _account the address be used to burn rBRLL.
	 * @param _amount the amount of rBRLL.
	 */
	function _burnrBRLL(address _account, uint256 _amount) internal {
		uint256 sharesAmount = getSharesByrBRLLAmount(_amount);
		require(sharesAmount > 0, "shares should be more than 0.");
		_burnShares(_account, sharesAmount);
		totalSupplyrBRLL -= _amount;
		emit Burn(msg.sender, _amount, block.timestamp);
		emit Transfer(_account, address(0), _amount);
	}

	/**
	 * @dev mint rBRLL debt for _receiver.
	 *
	 * @param _receiver the address be used to receive rBRLL debt.
	 * @param _amount the amount of rBRLL.
	 */
	function _mintrBRLLDebt(address _receiver, uint256 _amount) internal {
		uint256 borrowShares = getBorrowSharesByrBRLLAmount(_amount);
		if (borrowShares == 0) {
			borrowShares = _amount;
		}
		borrowedShares[_receiver] += borrowShares;
		totalBorrowShares += borrowShares;

		totalBorrowrBRLL += _amount;

		require(totalBorrowrBRLL <= totalSupplyrBRLL, "shold be less than supply of rBRLL.");

		emit MintDebt(msg.sender, _amount, borrowShares, block.timestamp);
	}

	/**
	 * @dev burn rBRLL debt from _receiver.
	 *
	 * @param _account the address be used to burn rBRLL.
	 * @param _amount the amount of rBRLL.
	 */
	function _burnrBRLLDebt(address _account, uint256 _amount) internal {
		uint256 borrowShares = getBorrowSharesByrBRLLAmount(_amount);
		require(borrowShares > 0, "shares should be more than 0.");
		borrowedShares[_account] -= borrowShares;
		totalBorrowShares -= borrowShares;

		totalBorrowrBRLL -= _amount;

		emit BurnDebt(msg.sender, _amount, borrowShares, block.timestamp);
	}

	/**
	 * @notice total supply of rBRLL.
	 */
	function _getTotalSupplyrBRLL() internal view override returns (uint256) {
		return totalSupplyrBRLL;
	}

	/**
	 * @dev Return brl value of TSELIC
	 * it uses 18 decimal places for calculation propose.
	 */
	function _tselicPrice() internal view returns (uint256) {
		return interestRateModel.getUnitValue();
	}

	/**
	 * @dev The USD value of the collateral asset must be higher than safeCollateralRate.
	 */
	function _requireIsSafeCollateralRate(address user) internal view {
		uint256 borrowedAmount = getBorrowedAmount(user);
		if (borrowedAmount == 0) {
			return;
		}
		require(
			(depositedTSELIC[user].mul(_tselicPrice()).mul(100) / borrowedAmount) >=
				safeCollateralRate,
			"Cannot be lower than the safeCollateralRate."
		);
	}

	/**
	 * @dev Secondly Rate
	 */
	function getSR() public view returns (uint256) {
		if (block.timestamp > interestRateModel.getMaturity()) {
			return 0;
		}
		uint256 _totalSupplyrBRLL = _getTotalSupplyrBRLL();
		uint256 supplyInterestRate = interestRateModel.getSupplyInterestRate(
			_totalSupplyrBRLL,
			getrBRLLAmountByShares(totalBorrowShares)
		);

		return supplyInterestRate.mul(_totalSupplyrBRLL).div(365 days).div(APR_COEFFICIENT);
	}
}
