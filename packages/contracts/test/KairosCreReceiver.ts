import { expect } from 'chai';
import { network } from 'hardhat';

describe('KairosCreReceiver', function () {
  const workflowId = `0x${'ab'.repeat(32)}`;
  const workflowName = '0x6b6169726f732d763100' as const;
  const snapshotId = `0x${'11'.repeat(32)}`;

  async function deployFixture() {
    const { ethers } = await network.create();
    const [owner, forwarder, workflowOwner, attacker] = await ethers.getSigners();
    const input = await ethers.deployContract('MockERC20', ['Mock USD Coin', 'mUSDC', 6]);
    const output = await ethers.deployContract('MockERC20', ['Mock Monad', 'mMON', 18]);
    const adapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await output.getAddress()]);
    const receiver = await ethers.deployContract('KairosCreReceiver', [forwarder.address, owner.address]);
    const policy = await ethers.deployContract('KairosPolicy', [
      await receiver.getAddress(),
      '0x0000000000000000000000000000000000000001',
      await input.getAddress(),
      await output.getAddress(),
      await adapter.getAddress(),
      6,
      18,
      8,
    ]);
    await receiver.activate(await policy.getAddress(), workflowId, workflowName, workflowOwner.address);

    const block = await ethers.provider.getBlock('latest');
    const now = BigInt(block!.timestamp);
    const budget = 1_000_000_000n;
    await input.mint(owner.address, budget);
    await input.connect(owner).approve(await policy.getAddress(), budget);
    await policy.connect(owner).createOrder(budget, now - 100n, now + 1_000n, 500_000_000n, 10_000_000n, 250_000_000n);
    await adapter.configure(40_000_000n, 20_000_000_000_000_000_000n);

    const metadata = ethers.solidityPacked(
      ['bytes32', 'bytes10', 'address'],
      [workflowId, workflowName, workflowOwner.address],
    );
    const proposal = {
      orderId: 0n,
      nonce: 0n,
      validUntil: now + 60n,
      proposedInput: 50_000_000n,
      minimumOutput: 1n,
      snapshotId,
    };
    const report = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint64', 'uint64', 'uint128', 'uint128', 'bytes32'],
      Object.values(proposal),
    );
    return { ethers, owner, forwarder, workflowOwner, attacker, receiver, policy, adapter, metadata, proposal, report, now };
  }

  it('activates once and cannot weaken its immutable provenance boundary', async function () {
    const { ethers } = await network.create();
    const [owner, forwarder, workflowOwner, attacker] = await ethers.getSigners();
    const receiver = await ethers.deployContract('KairosCreReceiver', [forwarder.address, owner.address]);
    const input = await ethers.deployContract('MockERC20', ['Mock USD Coin', 'mUSDC', 6]);
    const output = await ethers.deployContract('MockERC20', ['Mock Monad', 'mMON', 18]);
    const adapter = await ethers.deployContract('MockVenueAdapter', [await input.getAddress(), await output.getAddress()]);
    const policy = await ethers.deployContract('KairosPolicy', [
      await receiver.getAddress(),
      '0x0000000000000000000000000000000000000001',
      await input.getAddress(),
      await output.getAddress(),
      await adapter.getAddress(),
      6,
      18,
      8,
    ]);

    await expect(
      receiver.connect(attacker).activate(await policy.getAddress(), workflowId, workflowName, workflowOwner.address),
    ).to.be.revertedWithCustomError(receiver, 'Unauthorized');
    await receiver.activate(await policy.getAddress(), workflowId, workflowName, workflowOwner.address);
    await expect(
      receiver.activate(await policy.getAddress(), workflowId, workflowName, workflowOwner.address),
    ).to.be.revertedWithCustomError(receiver, 'AlreadyActivated');
  });

  it('rejects unauthorized senders and malformed or mismatched provenance', async function () {
    const { ethers, forwarder, workflowOwner, attacker, receiver, metadata, report } = await deployFixture();
    await expect(receiver.connect(attacker).onReport(metadata, report)).to.be.revertedWithCustomError(receiver, 'Unauthorized');
    await expect(receiver.connect(forwarder).onReport('0x1234', report)).to.be.revertedWithCustomError(
      receiver,
      'InvalidMetadataLength',
    );
    await expect(receiver.connect(forwarder).onReport(metadata, '0x1234')).to.be.revertedWithCustomError(
      receiver,
      'InvalidReportLength',
    );

    const wrongId = ethers.solidityPacked(
      ['bytes32', 'bytes10', 'address'],
      [`0x${'cd'.repeat(32)}`, workflowName, workflowOwner.address],
    );
    await expect(receiver.connect(forwarder).onReport(wrongId, report)).to.be.revertedWithCustomError(
      receiver,
      'InvalidWorkflowId',
    );
    const wrongName = ethers.solidityPacked(
      ['bytes32', 'bytes10', 'address'],
      [workflowId, '0x77726f6e672d6e616d65', workflowOwner.address],
    );
    await expect(receiver.connect(forwarder).onReport(wrongName, report)).to.be.revertedWithCustomError(
      receiver,
      'InvalidWorkflowName',
    );
    const wrongOwner = ethers.solidityPacked(
      ['bytes32', 'bytes10', 'address'],
      [workflowId, workflowName, attacker.address],
    );
    await expect(receiver.connect(forwarder).onReport(wrongOwner, report)).to.be.revertedWithCustomError(
      receiver,
      'InvalidWorkflowOwner',
    );
  });

  it('rejects stale and duplicate reports while preserving policy nonce enforcement', async function () {
    const { ethers, forwarder, receiver, policy, metadata, proposal, report, now } = await deployFixture();
    const stale = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint64', 'uint64', 'uint128', 'uint128', 'bytes32'],
      [proposal.orderId, proposal.nonce, now, proposal.proposedInput, proposal.minimumOutput, proposal.snapshotId],
    );
    await expect(receiver.connect(forwarder).onReport(metadata, stale)).to.be.revertedWithCustomError(receiver, 'StaleReport');

    await expect(receiver.connect(forwarder).onReport(metadata, report))
      .to.emit(receiver, 'ReportForwarded')
      .withArgs(ethers.keccak256(report), workflowId, 0n, 0n, snapshotId);
    expect((await policy.getOrder(0)).executionNonce).to.equal(1n);
    await expect(receiver.connect(forwarder).onReport(metadata, report)).to.be.revertedWithCustomError(
      receiver,
      'DuplicateReport',
    );

    const changedSameNonce = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint64', 'uint64', 'uint128', 'uint128', 'bytes32'],
      [proposal.orderId, proposal.nonce, proposal.validUntil, proposal.proposedInput, 2n, proposal.snapshotId],
    );
    await expect(receiver.connect(forwarder).onReport(metadata, changedSameNonce)).to.be.revertedWithCustomError(
      policy,
      'Replay',
    );
  });

  it('forwards a valid report through the unchanged Kairos policy settlement path', async function () {
    const { forwarder, receiver, policy, metadata, report } = await deployFixture();
    await receiver.connect(forwarder).onReport(metadata, report);
    const order = await policy.getOrder(0);
    expect(order.spent).to.equal(40_000_000n);
    expect(order.received).to.equal(20_000_000_000_000_000_000n);
    expect(order.executionNonce).to.equal(1n);
  });
});
