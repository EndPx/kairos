import {defineChain} from 'viem';
import {monadTestnet as viemMonadTestnet} from 'viem/chains';

export const MONAD_TESTNET_CHAIN_ID = 10_143;
export const DEFAULT_MONAD_RPC_URL = 'https://rpc-testnet.monadinfra.com';

export const monadTestnet = defineChain({
  ...viemMonadTestnet,
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || DEFAULT_MONAD_RPC_URL],
    },
  },
});
