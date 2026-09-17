import {createPublicClient, formatEther, http, keccak256, parseAbi, type Address, type Hash} from 'viem';

import {monadTestnet} from '../src/lib/chain';

const account = '0xa862d3a3FD15314D1632020F22d07d346b73E665' as Address;
const adapter = '0x2EE968D016bfF614a516E6e1D469769b9a771269' as Address;
const policy = '0x3cBdB8f7D91966AD543982b76CDb71a0283d3213' as Address;
const inputToken = '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570' as Address;

const hashes = process.argv.slice(2) as Hash[];
if (hashes.length === 0) throw new Error('Provide at least one lifecycle transaction hash.');

const client = createPublicClient({chain: monadTestnet, transport: http()});
const receipts = await Promise.all(hashes.map((hash) => client.getTransactionReceipt({hash})));
const transactions = await Promise.all(hashes.map((hash) => client.getTransaction({hash})));
const blocks = await Promise.all(receipts.map((receipt) => client.getBlock({blockNumber: receipt.blockNumber})));
const [chainId, adapterCode, policyCode, allowance, nextOrderId] = await Promise.all([
  client.getChainId(),
  client.getBytecode({address: adapter}),
  client.getBytecode({address: policy}),
  client.readContract({
    address: inputToken,
    abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
    functionName: 'allowance',
    args: [account, policy],
  }),
  client.readContract({
    address: policy,
    abi: parseAbi(['function nextOrderId() view returns (uint256)']),
    functionName: 'nextOrderId',
  }),
]);

const totalCost = receipts.reduce(
  (sum, receipt, index) => sum + receipt.gasUsed * transactions[index].gasPrice,
  0n,
);

console.log(JSON.stringify({
  chainId,
  account,
  adapter: {
    address: adapter,
    codeHash: adapterCode ? keccak256(adapterCode) : null,
    hasCode: Boolean(adapterCode && adapterCode !== '0x'),
  },
  policy: {
    address: policy,
    codeHash: policyCode ? keccak256(policyCode) : null,
    hasCode: Boolean(policyCode && policyCode !== '0x'),
    nextOrderId: nextOrderId.toString(),
  },
  allowance: allowance.toString(),
  receipts: receipts.map((receipt, index) => ({
    hash: receipt.transactionHash,
    status: receipt.status,
    transactionIndex: receipt.transactionIndex,
    blockNumber: receipt.blockNumber.toString(),
    blockHash: receipt.blockHash,
    blockTimestamp: blocks[index].timestamp.toString(),
    contractAddress: receipt.contractAddress,
    gasUsed: receipt.gasUsed.toString(),
    gasPriceWei: transactions[index].gasPrice.toString(),
    costWei: (receipt.gasUsed * transactions[index].gasPrice).toString(),
    costMon: formatEther(receipt.gasUsed * transactions[index].gasPrice),
    from: transactions[index].from,
    to: transactions[index].to,
    nonce: transactions[index].nonce,
    logCount: receipt.logs.length,
  })),
  totalCostWei: totalCost.toString(),
  totalCostMon: formatEther(totalCost),
}, null, 2));
