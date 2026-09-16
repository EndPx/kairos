import {
  encodeDeployData,
  getAddress,
  getContractAddress,
  keccak256,
  parseEther,
  type Address,
  type Hex,
} from 'viem';

import {MONAD_TESTNET_CHAIN_ID} from './chain';
import {
  kairosPolicyBytecode,
  kairosPolicyConstructorAbi,
  kuruAdapterBoundaryBytecode,
  kuruAdapterBoundaryConstructorAbi,
} from './limited-deployment-artifacts';
import type {CreateOrderArguments, UnsignedKairosTransaction} from './transactions';

export const LIMITED_DEPLOYMENT = {
  chainId: MONAD_TESTNET_CHAIN_ID,
  deadExecutor: getAddress('0x000000000000000000000000000000000000dEaD'),
  inputToken: getAddress('0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570'),
  market: getAddress('0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9'),
  nativeOutput: getAddress('0x0000000000000000000000000000000000000000'),
  inputDecimals: 6,
  outputDecimals: 18,
  priceDecimals: 8,
  pricePrecision: 100_000_000,
  sizePrecision: 10_000_000_000n,
  approvalAmount: 1_000_000n,
  gasSpendCap: parseEther('0.23'),
  gasLimits: {
    adapter: 320_000n,
    policy: 1_500_000n,
    approve: 70_000n,
    create: 190_000n,
    cancel: 60_000n,
    revoke: 70_000n,
  },
} as const;

export interface LimitedDeploymentPlan {
  readonly deployer: Address;
  readonly nonce: bigint;
  readonly adapterAddress: Address;
  readonly policyAddress: Address;
  readonly adapterTransaction: UnsignedKairosTransaction;
  readonly policyTransaction: UnsignedKairosTransaction;
  readonly adapterInitCodeHash: Hex;
  readonly policyInitCodeHash: Hex;
}

export function prepareLimitedDeployment(deployer: Address, nonce: bigint): LimitedDeploymentPlan {
  if (nonce < 0n) throw new RangeError('Deployment nonce cannot be negative.');

  const normalizedDeployer = getAddress(deployer);
  const adapterAddress = getContractAddress({from: normalizedDeployer, nonce});
  const policyAddress = getContractAddress({from: normalizedDeployer, nonce: nonce + 1n});
  const adapterData = encodeDeployData({
    abi: kuruAdapterBoundaryConstructorAbi,
    bytecode: kuruAdapterBoundaryBytecode,
    args: [
      policyAddress,
      LIMITED_DEPLOYMENT.market,
      LIMITED_DEPLOYMENT.inputToken,
      LIMITED_DEPLOYMENT.inputDecimals,
      LIMITED_DEPLOYMENT.pricePrecision,
      LIMITED_DEPLOYMENT.sizePrecision,
    ],
  });
  const policyData = encodeDeployData({
    abi: kairosPolicyConstructorAbi,
    bytecode: kairosPolicyBytecode,
    args: [
      LIMITED_DEPLOYMENT.deadExecutor,
      LIMITED_DEPLOYMENT.market,
      LIMITED_DEPLOYMENT.inputToken,
      LIMITED_DEPLOYMENT.nativeOutput,
      adapterAddress,
      LIMITED_DEPLOYMENT.inputDecimals,
      LIMITED_DEPLOYMENT.outputDecimals,
      LIMITED_DEPLOYMENT.priceDecimals,
    ],
  });

  return {
    deployer: normalizedDeployer,
    nonce,
    adapterAddress,
    policyAddress,
    adapterTransaction: {
      chainId: LIMITED_DEPLOYMENT.chainId,
      data: adapterData,
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.adapter,
    },
    policyTransaction: {
      chainId: LIMITED_DEPLOYMENT.chainId,
      data: policyData,
      gasLimit: LIMITED_DEPLOYMENT.gasLimits.policy,
    },
    adapterInitCodeHash: keccak256(adapterData),
    policyInitCodeHash: keccak256(policyData),
  };
}

export function limitedLifecycleOrder(chainTimestamp: bigint): CreateOrderArguments {
  if (chainTimestamp < 0n) throw new RangeError('Chain timestamp cannot be negative.');
  return {
    budget: 1_000_000n,
    startTime: chainTimestamp,
    endTime: chainTimestamp + 3_600n,
    maxPerFill: 1_000_000n,
    minFill: 100_000n,
    maxEffectivePrice: 100_000_000_000n,
  };
}
