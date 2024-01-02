# Lyra Loans 🌌🔭
[![Lint](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/lint.yml)
[![Tests](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/pollum-io/lyra-contracts/actions/workflows/tests.yml)

<p align="center"> <img src="img/lyra.png" width="300" alt="Lyra Loans"> </p>

## Overview
O Lyra Loans é um protocolo de empréstimos descentralizado desenvolvido para o XRP Ledger Brasil Hackathon Nacional.

O protocolo permite o depósito de títulos públicos como garantia para tomar empréstimos em DREX de forma sobrecolateralizada. Os usuários podem emprestar seu DREX nessas pools para obter rendimentos lastreados nesses títulos.

## Contratos

**rBRLLPool**

Pool principal do protocolo que governa e controla a maior parte da lógica: aceita depósitos de colateral TSELIC e empréstimos DREX, calcula juros e taxas, mantém registros de posições e gerencia riscos via liquidações e recall de empréstimos.

**rBRLL**

Token ERC20 com mecanismo de rebase representando direitos de resgate dos usuários sobre saldos e rendimentos das pools. Expande conforme juros são acumulados. Resgatável 1:1 por DREX.

**LiquidatePool**

Contrato auxiliar que executa liquidações descentralizadas de posições via Uniswap quando acionado. Converte parte proporcional dos colaterais em DREX para recomprar dívida e liberar depositantes.

**InterestRateModel**

Determina taxas de juros variáveis das pools consultando dados de taxa Selic vigente via oráculos Chainlink. Define parâmetros de taxa de juros aplicados nas pools.

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