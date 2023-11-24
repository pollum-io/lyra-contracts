# Lyra Loans 🌌🔭
[![Lint](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml)
[![Tests](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml)

<p align="center"> <img src="img/lyra.png" width="300" alt="Lyra Loans"> </p>

## Overview
O Lyra Loans é um protocolo de empréstimos descentralizado desenvolvido para o HACKATHON: Web3 – Tokenização do Tesouro Nacional.

O protocolo permite que instituições depositem títulos públicos como garantia para tomar empréstimos em DREX de forma sobrecolateralizada. Os usuários podem emprestar seu DREX nessas pools para obter rendimentos lastreados nesses títulos.

## Contratos
Breve explicação sobre os contratos

## Quick Start
Primeiro, clone o repositório e instale as dependências:
```shell
git clone https://github.com/pollum-io/lyra-contracts
cd lyra-contracts
yarn install
```

Para compilar os contratos:
```shell
npx hardhat compile
```
Isso irá gerar os arquivos compilados na pasta artifacts.

Para executar os testes:
```shell
npx hardhat test
```
Os testes executarão uma instância local da blockchain e testarão os contratos nessa rede de teste temporária.
