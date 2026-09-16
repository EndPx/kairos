import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import { defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  chainDescriptors: {
    10143: {
      name: 'Monad Testnet',
      chainType: 'generic',
      hardforkHistory: {
        prague: { blockNumber: 0 },
      },
    },
  },
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: './src',
    tests: './test',
  },
});
