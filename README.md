# Lyra Loans 🌌🔭
[![Lint](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml)
[![Tests](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml)

<p align="center"> <img src="img/lyra.png" width="300" alt="Lyra Loans"> </p>

## Overview
Lyra Loans is a decentralized lending protocol developed for the HACKATHON: XRP Ledger Brazil.

The protocol allows institutions to deposit government bonds as collateral to take out overcollateralized loans in DREX. Users can lend their DREX in these pools to earn yields backed by these bonds.

## Contracts

**rBRLLPool**

The main pool of the protocol that governs and controls most of the logic: accepts TSELIC collateral deposits and DREX loans, calculates interest and fees, maintains position records, and manages risks via liquidations and loan recalls.

**rBRLL**

ERC20 token with rebase mechanism representing users' redemption rights over pool balances and earnings. Expands as interest accumulates. Redeemable 1:1 for DREX.

**LiquidatePool**

Auxiliary contract that executes decentralized liquidations of undercollateralized positions via Uniswap when triggered. Converts a proportional part of the collateral into DREX to repurchase debt and release depositors.

**InterestRateModel**

Determines variable interest rates of pools by consulting current Selic rate data via Chainlink oracles. Sets interest rate parameters applied in the pools.

## Quick Start
First, clone the repository and install the dependencies:
```shell
git clone https://github.com/pollum-io/lyra-contracts
cd lyra-contracts
yarn install
```

To compile the contracts:
```shell
npx hardhat compile
```
This will generate the compiled files in the artifacts folder.

To run the tests:
```shell
npx hardhat test
```
The tests will run a local instance of the blockchain and test the contracts on this temporary test network.