// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ILiquidatePool {
	function flashLiquidatetSELIC(
		uint256 tselicAmount,
		uint256 minReturn,
		address receiver
	) external;
}
