// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Faucet for TSELIC29 and DREX ERC20 tokens
/// @notice This contract allows users to claim TSELIC29 and DREX tokens every hour
contract DualTokenFaucet {
	/// Address of the TSELIC29 ERC20 token
	IERC20 public TSELIC29;

	/// @notice Address of the DREX ERC20 token
	IERC20 public DREX;

	/// @notice Mapping of address to last claim timestamp
	mapping(address => uint256) public lastClaimTime;

	/// @notice Time users need to wait between claims
	uint256 public constant claimWait = 1 hours;

	/// @notice Event emitted when tokens are claimed
	/// @param claimer The address of the user claiming the tokens
	event TokensClaimed(address indexed claimer);

	/// @notice Sets the token addresses for TSELIC29 and DREX
	/// @param _TSELIC29 Address of the TSELIC29 token
	/// @param _DREX Address of the DREX token
	constructor(address _TSELIC29, address _DREX) {
		TSELIC29 = IERC20(_TSELIC29);
		DREX = IERC20(_DREX);
	}

	/// @notice Claim TSELIC29 and DREX tokens
	/// @dev Requires the time since last claim to be greater than the claim wait time
	function claimTokens() public {
		require(block.timestamp - lastClaimTime[msg.sender] >= claimWait, "Wait 1 hour");
		require(TSELIC29.balanceOf(address(this)) >= 1e17, "Not enough TSELIC29");
		require(DREX.balanceOf(address(this)) >= 1000e18, "Not enough DREX");

		lastClaimTime[msg.sender] = block.timestamp;

		TSELIC29.transfer(msg.sender, 1e17);
		DREX.transfer(msg.sender, 1000e18);

		emit TokensClaimed(msg.sender);
	}
}
