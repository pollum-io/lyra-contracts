// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IInterestRateModel {
	function getSupplyInterestRate(
		uint256 totalSupply,
		uint256 totalBorrow
	) external pure returns (uint256);

	function getUnitValue() external view returns (uint256);

	function getMaturity() external view returns (uint256);
}
