// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract MockPriceFeed {
	// mock usdc to $1
	function latestAnswer() public pure returns (int256) {
		return 100000000;
	}

	function latestRoundData()
		public
		view
		returns (
			uint80 roundId,
			int256 answer,
			uint256 startedAt,
			uint256 updatedAt,
			uint80 answeredInRound
		)
	{
		return (1, 100000000, block.timestamp, block.timestamp, 1);
	}
}
