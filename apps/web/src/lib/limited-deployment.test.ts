import {encodeDeployData, getAddress, getContractAddress} from 'viem';
import {describe, expect, it} from 'vitest';

import {
  kairosPolicyBytecode,
  kairosPolicyConstructorAbi,
  kuruAdapterBoundaryBytecode,
  kuruAdapterBoundaryConstructorAbi,
} from './limited-deployment-artifacts';
import {LIMITED_DEPLOYMENT, limitedLifecycleOrder, prepareLimitedDeployment} from './limited-deployment';

const deployer = getAddress('0x3000000000000000000000000000000000000003');

describe('limited lifecycle deployment', () => {
  it('binds the disabled adapter to the immediately following dead-executor policy', () => {
    const plan = prepareLimitedDeployment(deployer, 7n);

    expect(plan.adapterAddress).toBe(getContractAddress({from: deployer, nonce: 7n}));
    expect(plan.policyAddress).toBe(getContractAddress({from: deployer, nonce: 8n}));
    expect(plan.adapterTransaction.to).toBeUndefined();
    expect(plan.policyTransaction.to).toBeUndefined();
    expect(plan.adapterTransaction.gasLimit).toBe(320_000n);
    expect(plan.policyTransaction.gasLimit).toBe(1_500_000n);
    expect(LIMITED_DEPLOYMENT.gasSpendCap).toBe(230_000_000_000_000_000n);
    expect(plan.adapterTransaction.data).toBe(
      encodeDeployData({
        abi: kuruAdapterBoundaryConstructorAbi,
        bytecode: kuruAdapterBoundaryBytecode,
        args: [
          plan.policyAddress,
          LIMITED_DEPLOYMENT.market,
          LIMITED_DEPLOYMENT.inputToken,
          6,
          100_000_000,
          10_000_000_000n,
        ],
      }),
    );
    expect(plan.policyTransaction.data).toBe(
      encodeDeployData({
        abi: kairosPolicyConstructorAbi,
        bytecode: kairosPolicyBytecode,
        args: [
          LIMITED_DEPLOYMENT.deadExecutor,
          LIMITED_DEPLOYMENT.market,
          LIMITED_DEPLOYMENT.inputToken,
          LIMITED_DEPLOYMENT.nativeOutput,
          plan.adapterAddress,
          6,
          18,
          8,
        ],
      }),
    );
  });

  it('prepares a valid one-hour, one-USDC lifecycle-only order', () => {
    expect(limitedLifecycleOrder(2_000_000_000n)).toEqual({
      budget: 1_000_000n,
      startTime: 2_000_000_000n,
      endTime: 2_000_003_600n,
      maxPerFill: 1_000_000n,
      minFill: 100_000n,
      maxEffectivePrice: 100_000_000_000n,
    });
  });

  it('rejects invalid nonce and timestamp inputs', () => {
    expect(() => prepareLimitedDeployment(deployer, -1n)).toThrow('nonce');
    expect(() => limitedLifecycleOrder(-1n)).toThrow('timestamp');
  });
});
