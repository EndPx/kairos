import { expect } from 'chai';
import { network } from 'hardhat';

describe('KairosPolicy (fixture-only venue)', function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [owner, executor, attacker] = await ethers.getSigners();
    const input = await ethers.deployContract('MockERC20', ['Mock USD Coin', 'mUSDC', 6]);
    const output = await ethers.deployContract('MockERC20', ['Mock Monad', 'mMON', 18]);
    const adapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await output.getAddress()]);
    const policy = await ethers.deployContract('KairosPolicy', [
      executor.address,
      '0x0000000000000000000000000000000000000001',
      await input.getAddress(),
      await output.getAddress(),
      await adapter.getAddress(),
      6,
      18,
      8,
    ]);
    const block = await ethers.provider.getBlock('latest');
    const now = BigInt(block!.timestamp);
    const budget = 1_000_000_000n;
    await input.mint(owner.address, budget);
    await input.connect(owner).approve(await policy.getAddress(), budget);
    await policy.connect(owner).createOrder(budget, now - 100n, now + 1_000n, 500_000_000n, 10_000_000n, 250_000_000n);
    return { ethers, owner, executor, attacker, input, output, adapter, policy, now, budget };
  }

  function proposal(validUntil: bigint, input = 50_000_000n, minOutput = 1n) {
    return { orderId: 0n, nonce: 0n, validUntil, proposedInput: input, minimumOutput: minOutput, snapshotId: `0x${'11'.repeat(32)}` };
  }

  it('restricts creation and cancellation to the order owner', async function () {
    const { owner, attacker, policy, now } = await deployFixture();
    await expect(policy.connect(attacker).cancelOrder(0)).to.be.revertedWithCustomError(policy, 'Unauthorized');
    await policy.connect(owner).cancelOrder(0);
    expect(await policy.statusOf(0)).to.equal(2n);
    await expect(policy.connect(owner).cancelOrder(0)).to.be.revertedWithCustomError(policy, 'OrderNotActive');
    expect(await policy.releasedBudget(0, now + 500n)).to.equal(545_454_545n);
  });

  it('allows only the immutable executor and rejects replay', async function () {
    const { executor, attacker, adapter, policy, now } = await deployFixture();
    const p = proposal(now + 60n);
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await expect(policy.connect(attacker).execute(p)).to.be.revertedWithCustomError(policy, 'Unauthorized');
    await policy.connect(executor).execute(p);
    await expect(policy.connect(executor).execute(p)).to.be.revertedWithCustomError(policy, 'Replay');
  });

  it('accounts for actual input and forwards unused input/output atomically in the fixture', async function () {
    const { executor, owner, input, output, adapter, policy, now } = await deployFixture();
    const ownerInputBefore = await input.balanceOf(owner.address);
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await policy.connect(executor).execute(proposal(now + 60n));
    const order = await policy.getOrder(0);
    expect(order.spent).to.equal(40_000_000n);
    expect(order.received).to.equal(20_000_000_000_000_000_000n);
    expect(await input.balanceOf(owner.address)).to.equal(ownerInputBefore - 40_000_000n);
    expect(await output.balanceOf(owner.address)).to.equal(20_000_000_000_000_000_000n);
    expect(await input.balanceOf(await policy.getAddress())).to.equal(0n);
  });

  it('enforces release, actual minimum fill, expiry, and effective price onchain', async function () {
    const { executor, adapter, policy, now } = await deployFixture();
    await adapter.configure(50_000_000n, 20_000_000_000_000_000_000n);
    await expect(policy.connect(executor).execute(proposal(now + 60n, 500_000_001n))).to.be.revertedWithCustomError(policy, 'MinimumFillNotMet');
    await adapter.configure(9_999_999n, 20_000_000_000_000_000_000n);
    await expect(policy.connect(executor).execute(proposal(now + 60n))).to.be.revertedWithCustomError(policy, 'MinimumFillNotMet');
    await adapter.configure(40_000_000n, 10_000_000_000_000_000_000n);
    await expect(policy.connect(executor).execute(proposal(now + 60n))).to.be.revertedWithCustomError(policy, 'PriceLimitExceeded');
    await expect(policy.connect(executor).execute(proposal(now - 1n))).to.be.revertedWithCustomError(policy, 'ProposalExpired');
  });

  it('rejects adapter callback reentrancy without double spending', async function () {
    const { executor, adapter, policy, now } = await deployFixture();
    const p = proposal(now + 60n);
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);
    await adapter.configureReentry(policy.interface.encodeFunctionData('execute', [p]));
    await policy.connect(executor).execute(p);
    expect((await policy.getOrder(0)).spent).to.equal(40_000_000n);
  });
});
