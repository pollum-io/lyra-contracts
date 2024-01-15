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

## Protocol Mechanics

**Overview**

Lyra Loans is a decentralized lending protocol that facilitates liquidity and mass adoption of government bond-backed tokens using DeFi ecosystem features like composability and modularity. Users can deposit their bonds as collateral to take loans in Drex in an overcollateralized manner from liquidity pools, with customized risk parameters, interest rates, and liquidation, while users can lend their DREX to earn safe yields backed by government bonds. Our first launched pool will utilize Treasury SELIC 2029 (TSELIC29) as collateral in the protocol.

**Treasury Selic 2029 Pool**

This pool will allow authorized entities to deposit TSELIC29, the Treasury SELIC 2029 token, as collateralized collateral for borrowing DREX from users. The pool is specifically customized for the behavior of TSELIC29, including interest policy, LTV, and liquidation appropriate for the best user experience and security. The yield distributed to DREX liquidity providers in this pool will be determined based on market rates for Treasury SELIC 2029.

**Loans**

Users can deposit DREX in the pool to obtain real yield collateralized by Public Titles. Upon depositing in the pools, users receive rBRLL tokens (Interest-bearing BRL of Lyra Loans) representing their entered balances. rBRLL is the promissory note token designed to maintain a 1:1 parity with DREX, allowing users to redeem for the equivalent value in DREX at any time. Thus, DREX deposits have the opportunity to obtain real returns backed by custody guarantees, and users remain highly liquid on their balances and accumulated interest.

**Promissory Note Token**

When depositing Drex in the pools, rBRLL will be minted for users, acting as the promissory note token that represents the user's right over the deposits and interest accumulated by the protocol. The total supply of rBRLL exactly represents the total amount of DREX controlled by the protocol earning returns in the pools. Each user's rBRLL balance is proportional to their share in this total. As more interest is accumulated on the DREX deposits, the total supply of rBRLL expands through the rebase mechanism. This increases each depositor's rBRLL token balance proportionally. Users can redeem their rBRLL at a 1:1 ratio for DREX at any time. As a standard ERC20 token with rebase, rBRLL can also be transferred and used in other DeFi protocols.

**Borrowing**

Holders of TSELIC can deposit their tokens as collateral and take loans in DREX. DREX loans are only available in an overcollateralized manner, meaning that the borrowing user can only receive 99% of the value with which they used TSELIC as collateral. When users take a loan, using TSELIC as collateral, two internal events occur. First, the desired loan amount in DREX is converted to the corresponding representation in rBRLL, based on the fixed 1:1 parity established between these assets. Simultaneously, this converted amount of rBRLL is recorded as debt for the borrowing user. 
This represents their obligation to repay this debt plus the due interest. While the debt is recorded internally in rBRLL, the corresponding amount of the DREX asset is transferred from the pool's reserve directly to the borrower's account. As interest accumulates for the DREX deposit, the total amount of rBRLL tokens increases through its rebase mechanism. Consequently, the borrower's debt record also increases proportionally in terms of the rBRLL unit. This represents the accumulation of interest that this user owes on the amount they borrowed. 
Upon repayment, the deal is settled by transferring back the amount of DREX and converting this value back to the internal rBRLL unit. This erases the recorded debt, comprising both the principal and the automatically accrued interest due to the rebase of the token. To determine the interest rate to be applied, the protocol consults external data sources (Chainlink oracles) to obtain the current Selic rate. This market rate is then applied proportionally on the deposits that were allocated for loans, expanding the supply of rBRLL.

**Loan Recall Mechanism**

To ensure liquidity even with high loan rates, the protocol implements a recall mechanism that can be activated at any time by DREX depositors. When triggered, the recall mechanism will proportionally liquidate some of the TSELIC collaterals of the borrowers, in order to raise the necessary capital to reimburse depositors needing liquidity. The liquidated TSELIC are sold on the decentralized market via Uniswap, obtaining DREX that is used to buy back the positions of the depositors who invoked the recall. Thus, even with little idle capital due to high loans, the mechanism provides protection against a lack of liquidity by allowing a forced reimbursement via the sale of collateral in the market. 
Since the cost of the loan does not exceed the return of the TSELIC collateral, the net balance of the debtors remains positive under the proportional recall mechanism. In other words, the recall serves only to raise capital for liquidity, without negatively affecting the positions of the borrowers. The mechanism balances the protocol's risks by maximizing capital efficiency while ensuring reimbursements on demand.