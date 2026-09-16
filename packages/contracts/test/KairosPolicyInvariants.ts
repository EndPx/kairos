import { expect } from 'chai';
import { network } from 'hardhat';

describe('KairosPolicy invariants (fixture-only venue)', function () {
  async function setup(startOffset = -10_000n, endOffset = 10_000n) {
    const { ethers } = await network.create();
    const [owner, executor] = await ethers.getSigners();
    const input = await ethers.deployContract('MockERC20', ['Mock USD Coin', 'mUSDC', 6]);
    const output = await ethers.deployContract('MockERC20', ['Mock Monad', 'mMON', 18]);
    const adapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await output.getAddress()]);
    const policy = await ethers.deployContract('KairosPolicy', [executor.address, '0x0000000000000000000000000000000000000001', await input.getAddress(), await output.getAddress(), await adapter.getAddress(), 6, 18, 8]);
    const now = BigInt((await ethers.provider.getBlock('latest'))!.timestamp);
    const budget = 1_000_000_000n;
    await input.mint(owner.address, budget);
    await input.connect(owner).approve(await policy.getAddress(), budget);
    await policy.connect(owner).createOrder(budget, now + startOffset, now + endOffset, 100_000_000n, 10_000_000n, 250_000_000n);
    return { ethers, owner, executor, input, output, adapter, policy, now, budget };
  }

  function p(nonce: bigint, validUntil: bigint, proposedInput = 50_000_000n) {
    return { orderId: 0n, nonce, validUntil, proposedInput, minimumOutput: 1n, snapshotId: `0x${'22'.repeat(32)}` };
  }

  it('keeps repeated actual spend below released budget and total budget', async function () {
    const { executor, adapter, policy, now, budget } = await setup();
    for (let nonce = 0n; nonce < 12n; nonce++) {
      await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
      await policy.connect(executor).execute(p(nonce, now + 1_000n));
      const order = await policy.getOrder(0);
      const released = await policy.releasedBudget(0, BigInt((await (await network.create()).ethers.provider.getBlock('latest'))!.timestamp));
      expect(order.spent).to.be.lte(released);
      expect(order.spent).to.be.lte(budget);
    }
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await expect(policy.connect(executor).execute(p(12n, now + 1_000n))).to.be.revertedWithCustomError(policy, 'ReleaseExceeded');
  });

  it('reports allowance and balance failures before attempting venue settlement', async function () {
    const { executor, owner, input, adapter, policy, now } = await setup();
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await input.connect(owner).approve(await policy.getAddress(), 0n);
    await expect(policy.connect(executor).execute(p(0n, now + 1_000n))).to.be.revertedWithCustomError(policy, 'InsufficientAllowance');

    await input.connect(owner).approve(await policy.getAddress(), 50_000_000n);
    await input.connect(owner).transfer('0x0000000000000000000000000000000000000002', 960_000_001n);
    await expect(policy.connect(executor).execute(p(0n, now + 1_000n))).to.be.revertedWithCustomError(policy, 'InsufficientBalance');
  });

  it('derives strict expiry and leaves allowance unchanged on cancellation', async function () {
    const { executor, owner, input, policy, now } = await setup(-20n, -1n);
    await expect(policy.connect(executor).execute(p(0n, now + 60n))).to.be.revertedWithCustomError(policy, 'OrderNotActive');

    const active = await setup();
    const before = await active.input.allowance(active.owner.address, await active.policy.getAddress());
    await active.policy.connect(active.owner).cancelOrder(0);
    expect(await active.input.allowance(active.owner.address, await active.policy.getAddress())).to.equal(before);
  });

  it('does not attribute pre-existing adapter balances to a new receipt', async function () {
    const { executor, owner, input, output, adapter, policy, now } = await setup();
    await input.mint(await adapter.getAddress(), 999_999_999n);
    await output.mint(await adapter.getAddress(), 777_000_000_000_000_000_000n);
    const ownerInputBefore = await input.balanceOf(owner.address);
    const ownerOutputBefore = await output.balanceOf(owner.address);
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await policy.connect(executor).execute(p(0n, now + 1_000n));
    expect(await input.balanceOf(owner.address)).to.equal(ownerInputBefore - 40_000_000n);
    expect(await output.balanceOf(owner.address)).to.equal(ownerOutputBefore + 20_000_000_000_000_000_000n);
    expect((await policy.getOrder(0)).received).to.equal(20_000_000_000_000_000_000n);
  });

  it('rejects ambiguous same-token accounting and unsafe decimal exponents at deployment', async function () {
    const { ethers } = await network.create();
    const [executor] = await ethers.getSigners();
    const input = await ethers.deployContract('MockERC20', ['Mock USD Coin', 'mUSDC', 6]);
    const output = await ethers.deployContract('MockERC20', ['Mock Monad', 'mMON', 18]);
    const sameTokenAdapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await input.getAddress()]);
    const policyFactory = await ethers.getContractFactory('KairosPolicy');
    const sameTokenArgs = [executor.address, '0x0000000000000000000000000000000000000001', await input.getAddress(), await input.getAddress(), await sameTokenAdapter.getAddress(), 6, 6, 8];
    await expect(policyFactory.deploy(...sameTokenArgs)).to.be.revertedWithCustomError(policyFactory, 'InvalidAddress');

    const validAdapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await output.getAddress()]);
    const unsafeDecimalsArgs = [executor.address, '0x0000000000000000000000000000000000000001', await input.getAddress(), await output.getAddress(), await validAdapter.getAddress(), 6, 18, 78];
    await expect(policyFactory.deploy(...unsafeDecimalsArgs)).to.be.revertedWithCustomError(policyFactory, 'InvalidDecimals');
  });
});
