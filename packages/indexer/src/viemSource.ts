import { createPublicClient, http, type Address, type Hex, type PublicClient } from 'viem';
import { defineChain } from 'viem/utils';
import type { ChainSource } from './sync.js';
import type { RawChainLog } from './types.js';

export interface ViemSourceConfig {
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly policyAddress: Address;
  readonly receiverAddress: Address;
  readonly confirmations: bigint;
}

export class ViemChainSource implements ChainSource {
  private readonly client: PublicClient;

  constructor(private readonly config: ViemSourceConfig) {
    const chain = defineChain({
      id: config.chainId,
      name: `Kairos chain ${config.chainId}`,
      nativeCurrency: { name: 'Native', symbol: 'NATIVE', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });
    this.client = createPublicClient({ chain, transport: http(config.rpcUrl) });
  }

  async latestSafeBlock(): Promise<bigint> {
    const latest = await this.client.getBlockNumber();
    return latest > this.config.confirmations ? latest - this.config.confirmations : 0n;
  }

  async blockHash(blockNumber: bigint): Promise<Hex> {
    const block = await this.client.getBlock({ blockNumber });
    if (block.hash === null) throw new Error(`Block ${blockNumber} has no hash.`);
    return block.hash;
  }

  async logs(fromBlock: bigint, toBlock: bigint): Promise<readonly RawChainLog[]> {
    const logs = await this.client.getLogs({
      address: [this.config.policyAddress, this.config.receiverAddress],
      fromBlock,
      toBlock,
    });
    return logs.map((log) => {
      if (
        log.blockNumber === null ||
        log.blockHash === null ||
        log.transactionHash === null ||
        log.transactionIndex === null ||
        log.logIndex === null ||
        log.topics.length === 0
      ) {
        throw new Error('RPC returned an unmined or incomplete log.');
      }
      return {
        address: log.address,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.logIndex,
      };
    });
  }
}
