import { expect } from 'chai';
import { network } from 'hardhat';

describe('KuruAdapterBoundary', function () {
  it('uses the read-verified USDC-to-Kuru quote conversion and refuses execution', async function () {
    const { ethers } = await network.create();
    const [policy, other] = await ethers.getSigners();
    const boundary = await ethers.deployContract('KuruAdapterBoundary', [
      policy.address,
      '0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9',
      '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570',
      6,
      100_000_000,
      10_000_000_000,
    ]);

    expect(await boundary.quoteUnitsToKuruQuoteSize(2_000_000n)).to.equal(200_000_000n);
    await expect(boundary.connect(other).executeBuy(1n, 1n, other.address)).to.be.revertedWithCustomError(boundary, 'UnauthorizedPolicy');
    await expect(boundary.connect(policy).executeBuy(1n, 1n, policy.address)).to.be.revertedWithCustomError(boundary, 'KuruSettlementUnverified');
  });
});
