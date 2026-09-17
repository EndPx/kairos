import {
  createPublicClient,
  formatEther,
  getAddress,
  http,
  type Address,
  type Hex,
} from 'viem';

import {monadTestnet} from '../src/lib/chain';
import {LIMITED_DEPLOYMENT, limitedLifecycleOrder, prepareLimitedDeployment} from '../src/lib/limited-deployment';
import {
  buildApprovalTransaction,
  buildCancelOrderTransaction,
  buildCreateOrderTransaction,
} from '../src/lib/transactions';

type Action = 'adapter' | 'approve' | 'cancel' | 'create' | 'policy' | 'revoke';

function requiredArgument(index: number, label: string): string {
  const value = process.argv[index];
  if (!value) throw new Error(`Missing ${label}.`);
  return value;
}

const action = requiredArgument(2, 'action') as Action;
const account = getAddress(requiredArgument(3, 'wallet address'));
const baseNonce = BigInt(requiredArgument(4, 'base deployment nonce'));
const plan = prepareLimitedDeployment(account, baseNonce);
const policyAddress = plan.policyAddress;

let transaction: {data: Hex; gasLimit: bigint; nonce?: number; to?: Address};
switch (action) {
  case 'adapter':
    transaction = {...plan.adapterTransaction, nonce: Number(baseNonce)};
    break;
  case 'policy':
    transaction = {...plan.policyTransaction, nonce: Number(baseNonce + 1n)};
    break;
  case 'approve':
    transaction = {
      ...buildApprovalTransaction(LIMITED_DEPLOYMENT.inputToken, policyAddress, LIMITED_DEPLOYMENT.approvalAmount),
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.approve,
    };
    break;
  case 'revoke':
    transaction = {
      ...buildApprovalTransaction(LIMITED_DEPLOYMENT.inputToken, policyAddress, 0n),
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.revoke,
    };
    break;
  case 'create': {
    const client = createPublicClient({chain: monadTestnet, transport: http()});
    const block = await client.getBlock();
    transaction = {
      ...buildCreateOrderTransaction(policyAddress, limitedLifecycleOrder(block.timestamp)),
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.create,
    };
    break;
  }
  case 'cancel':
    transaction = {
      ...buildCancelOrderTransaction(policyAddress, BigInt(requiredArgument(5, 'order ID'))),
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.cancel,
    };
    break;
  default:
    throw new Error(`Unsupported lifecycle action: ${action}`);
}

const client = createPublicClient({chain: monadTestnet, transport: http()});
const [block, chainId, gasPrice, currentNonce, balance, estimatedGas] = await Promise.all([
  client.getBlock(),
  client.getChainId(),
  client.getGasPrice(),
  client.getTransactionCount({address: account, blockTag: 'pending'}),
  client.getBalance({address: account}),
  client.estimateGas({
    account,
    data: transaction.data,
    nonce: transaction.nonce,
    to: transaction.to,
  }),
]);

const cappedCost = transaction.gasLimit * gasPrice;
const fullSequenceCost = 2_210_000n * gasPrice;
console.log(JSON.stringify({
  action,
  account,
  adapterAddress: plan.adapterAddress,
  policyAddress,
  chainId,
  blockNumber: block.number.toString(),
  blockHash: block.hash,
  baseNonce: baseNonce.toString(),
  currentPendingNonce: currentNonce,
  balanceWei: balance.toString(),
  balanceMon: formatEther(balance),
  gasPriceWei: gasPrice.toString(),
  estimatedGas: estimatedGas.toString(),
  gasLimitCap: transaction.gasLimit.toString(),
  cappedCostWei: cappedCost.toString(),
  cappedCostMon: formatEther(cappedCost),
  fullSequenceWorstCaseWei: fullSequenceCost.toString(),
  fullSequenceWorstCaseMon: formatEther(fullSequenceCost),
  withinActionGasCap: estimatedGas <= transaction.gasLimit,
  withinFullSequenceSpendCap: fullSequenceCost <= LIMITED_DEPLOYMENT.gasSpendCap,
}, null, 2));
