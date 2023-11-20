// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Interest rate model for Lyra Loans.
 *
 * linear function
 *
 */
contract InterestRateModel is AccessControl {
	constructor() {
		// _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
	}

	/**
	 * @notice get APR from chainlink functions?
	 * TODO: implement function
	 */
	function getInterestRate() public view returns (uint256) {
		return 0;
	}

	/**
	 * @notice Calculates the current supply interest rate.
	 * @param totalSupply The amount of supply.
	 * @param totalBorrow The amount of borrows.
	 * @return The supply rate percentage.
	 */
	function getSupplyInterestRate(
		uint256 totalSupply,
		uint256 totalBorrow
	) public view returns (uint) {
		uint256 apr = getInterestRate();

		if (totalBorrow == 0) {
			return 0;
		} else if (totalBorrow >= totalSupply) {
			return apr;
		}
		return ((totalBorrow * apr) / totalSupply);
	}
}
