import { expect } from 'chai';
import { network } from 'hardhat';

const SOURCE_CHAIN_ID = 10_143n;
const LOCAL_CHAIN_ID = 31_337n;
const FORK_BLOCK = 62_944_132n;
const PUBLIC_RPC = 'https://rpc-testnet.monadinfra.com';
const MARKET = '0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9';
const QUOTE = '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570';
const MARGIN_ACCOUNT = '0xd029C2D98ff85D8F64799017fE00a59B1159CE02';
const IMPLEMENTATION = '0x72cae0a99c19b574e8a6de558f43fc1d019c9374';
const FORK_BLOCK_HASH = '0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098';
const PRICE_PRECISION = 100_000_000;
const SIZE_PRECISION = 10_000_000_000n;
const ASK_PRICE = 5_000_000;
const ASK_SIZE = 4_000_000_000_000n; // 400 MON
const PROPOSED_INPUT = 30_000_000n; // 30 USDC; only 20 USDC can fill the controlled ask
const ACTUAL_INPUT = 20_000_000n;
const ACTUAL_OUTPUT = 400_000_000_000_000_000_000n;
const BUDGET = 100_000_000n;

const forkDescribe = process.env.RUN_KURU_FORK === '1' ? describe : describe.skip;

forkDescribe('KuruAdapter on fixed Monad Testnet fork', function () {
  this.timeout(120_000);

  async function createFork() {
    const connection = await network.create({
      override: {
        chainId: Number(LOCAL_CHAIN_ID),
        forking: {
          url: process.env.MONAD_RPC_URL ?? PUBLIC_RPC,
          blockNumber: FORK_BLOCK,
        },
      },
    });
    const { ethers } = connection;
    const sourceBlock = await ethers.provider.getBlock(FORK_BLOCK);
    expect(sourceBlock?.hash).to.equal(FORK_BLOCK_HASH);
    expect((await ethers.provider.getNetwork()).chainId).to.equal(LOCAL_CHAIN_ID);
    expect((await ethers.provider.getCode(IMPLEMENTATION)).length).to.equal(71_098);
    return connection;
  }

  async function setForkOnlyTokenBalance(
    ethers: Awaited<ReturnType<typeof createFork>>['ethers'],
    account: string,
    amount: bigint,
  ) {
    const balanceInterface = new ethers.Interface(['function balanceOf(address) view returns (uint256)']);
    const trace = (await ethers.provider.send('debug_traceCall', [
      { to: QUOTE, data: balanceInterface.encodeFunctionData('balanceOf', [account]) },
      'latest',
      {},
    ])) as { structLogs: Array<{ op: string; stack?: string[] }> };
    const balanceLoad = trace.structLogs.find((step) => step.op === 'SLOAD' && step.stack !== undefined);
    if (balanceLoad?.stack === undefined) throw new Error('Unable to locate the fork-only USDC balance slot');
    const balanceSlot = balanceLoad.stack.at(-1)!;
    await ethers.provider.send('hardhat_setStorageAt', [QUOTE, balanceSlot, ethers.toBeHex(amount, 32)]);
    await ethers.provider.send('evm_mine', []);
    const quote = await ethers.getContractAt(['function balanceOf(address) view returns (uint256)'], QUOTE);
    expect(await quote.balanceOf(account)).to.equal(amount);
    return balanceSlot;
  }

  async function setup(options: { fillOrKill?: boolean; minFill?: bigint; maxPrice?: bigint } = {}) {
    const { ethers } = await createFork();
    const [deployer, owner, executor, maker] = await ethers.getSigners();
    const quote = await ethers.getContractAt(
      [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address,address) view returns (uint256)',
        'function approve(address,uint256) returns (bool)',
        'function transfer(address,uint256) returns (bool)',
      ],
      QUOTE,
    );
    const margin = await ethers.getContractAt(
      [
        'function deposit(address,address,uint256) payable',
        'function getBalance(address,address) view returns (uint256)',
      ],
      MARGIN_ACCOUNT,
    );
    const market = await ethers.getContractAt(
      [
        'error InsufficientLiquidity()',
        'error SlippageExceeded()',
        'function addSellOrder(uint32,uint96,bool)',
        'function s_orderIdCounter() view returns (uint40)',
        'function s_orders(uint40) view returns (address,uint96,uint40,uint40,uint40,uint32,uint32,bool)',
        'function getL2Book() view returns (bytes)',
      ],
      MARKET,
    );

    const balanceSlot = await setForkOnlyTokenBalance(ethers, owner.address, 101_000_000n);
    await margin.connect(maker).deposit(maker.address, ethers.ZeroAddress, 500n * 10n ** 18n, {
      value: 500n * 10n ** 18n,
    });
    const previousOrderId = await market.s_orderIdCounter();
    await market.connect(maker).addSellOrder(ASK_PRICE, ASK_SIZE, true);
    const controlledOrderId = previousOrderId + 1n;
    expect((await market.s_orders(controlledOrderId))[1]).to.equal(ASK_SIZE);
    const bookWithControlledAsk = await market.getL2Book();
    expect(bookWithControlledAsk.length).to.be.greaterThan(130);

    const deployerNonce = await ethers.provider.getTransactionCount(deployer.address);
    const predictedAdapter = ethers.getCreateAddress({ from: deployer.address, nonce: deployerNonce });
    const predictedPolicy = ethers.getCreateAddress({ from: deployer.address, nonce: deployerNonce + 1 });
    const adapter = await ethers.deployContract(
      'KuruAdapter',
      [
        predictedPolicy,
        MARKET,
        QUOTE,
        6,
        PRICE_PRECISION,
        SIZE_PRECISION,
        options.fillOrKill ?? false,
        LOCAL_CHAIN_ID,
      ],
      deployer,
    );
    expect(await adapter.getAddress()).to.equal(predictedAdapter);
    const policy = await ethers.deployContract(
      'KairosPolicy',
      [executor.address, MARKET, QUOTE, ethers.ZeroAddress, predictedAdapter, 6, 18, 8],
      deployer,
    );
    expect(await policy.getAddress()).to.equal(predictedPolicy);

    const latest = await ethers.provider.getBlock('latest');
    const now = BigInt(latest!.timestamp);
    await quote.connect(owner).approve(await policy.getAddress(), BUDGET);
    await policy
      .connect(owner)
      .createOrder(
        BUDGET,
        now - 10_000n,
        now + 10_000n,
        PROPOSED_INPUT,
        options.minFill ?? 1_000_000n,
        options.maxPrice ?? 5_000_000n,
      );

    return {
      ethers,
      deployer,
      owner,
      executor,
      quote,
      margin,
      market,
      adapter,
      policy,
      now,
      balanceSlot,
      controlledOrderId,
      bookWithControlledAsk,
    };
  }

  function proposal(validUntil: bigint, minimumOutput = 1n, proposedInput = PROPOSED_INPUT) {
    return {
      orderId: 0n,
      nonce: 0n,
      validUntil,
      proposedInput,
      minimumOutput,
      snapshotId: FORK_BLOCK_HASH,
    };
  }

  function bookLevels(payload: string) {
    return payload.slice(66); // getL2Book prefixes the payload with the current block number
  }

  it('settles a non-FOK partial fill with actual accounting, refund, native forwarding, and no new residual', async function () {
    const {
      ethers,
      deployer,
      owner,
      executor,
      quote,
      margin,
      market,
      adapter,
      policy,
      now,
      balanceSlot,
      controlledOrderId,
      bookWithControlledAsk,
    } = await setup();
    const adapterAddress = await adapter.getAddress();
    const policyAddress = await policy.getAddress();

    await quote.connect(owner).transfer(adapterAddress, 1_000_000n);
    await deployer.sendTransaction({ to: adapterAddress, value: 2n * 10n ** 18n });
    const ownerQuoteBefore = await quote.balanceOf(owner.address);
    const ownerNativeBefore = await ethers.provider.getBalance(owner.address);
    const adapterQuoteBefore = await quote.balanceOf(adapterAddress);
    const adapterNativeBefore = await ethers.provider.getBalance(adapterAddress);

    await policy.connect(executor).execute(proposal(now + 1_000n));

    const order = await policy.getOrder(0);
    expect(order.spent).to.equal(ACTUAL_INPUT);
    expect(order.received).to.equal(ACTUAL_OUTPUT);
    expect(order.executionNonce).to.equal(1n);
    expect(await quote.balanceOf(owner.address)).to.equal(ownerQuoteBefore - ACTUAL_INPUT);
    expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerNativeBefore + ACTUAL_OUTPUT);
    expect(await quote.allowance(owner.address, policyAddress)).to.equal(BUDGET - PROPOSED_INPUT);
    expect(await quote.allowance(policyAddress, adapterAddress)).to.equal(0n);
    expect(await quote.allowance(adapterAddress, MARKET)).to.equal(0n);
    expect(await quote.balanceOf(policyAddress)).to.equal(0n);
    expect(await quote.balanceOf(adapterAddress)).to.equal(adapterQuoteBefore);
    expect(await ethers.provider.getBalance(adapterAddress)).to.equal(adapterNativeBefore);
    expect(await margin.getBalance(adapterAddress, QUOTE)).to.equal(0n);
    const bookAfter = await market.getL2Book();
    expect(bookAfter).not.to.equal(bookWithControlledAsk);
    expect(bookAfter.length).to.equal(130);

    console.log(
      JSON.stringify({
        sourceChainId: SOURCE_CHAIN_ID.toString(),
        sourceBlock: FORK_BLOCK.toString(),
        sourceBlockHash: FORK_BLOCK_HASH,
        localChainId: LOCAL_CHAIN_ID.toString(),
        localMutations: {
          usdcBalanceStorageSlot: balanceSlot,
          seededOwnerUsdc: '101000000',
          makerNativeMarginDeposit: (500n * 10n ** 18n).toString(),
          controlledAskPrice: ASK_PRICE.toString(),
          controlledAskSize: ASK_SIZE.toString(),
          preExistingAdapterUsdc: '1000000',
          preExistingAdapterNative: (2n * 10n ** 18n).toString(),
        },
        observed: {
          actualInput: order.spent.toString(),
          actualOutput: order.received.toString(),
          returnedInput: (PROPOSED_INPUT - order.spent).toString(),
          executionNonce: order.executionNonce.toString(),
          adapterQuoteResidualFromCall: '0',
          adapterNativeResidualFromCall: '0',
          activeBookPayloadBytesAfter: ((bookAfter.length - 2) / 2).toString(),
          restingControlledAsk: false,
          staleFilledOrderMappingSize: (await market.s_orders(controlledOrderId))[1].toString(),
        },
      }),
    );
  });

  it('settles a successful FOK full fill without an input refund or new residual', async function () {
    const { ethers, owner, executor, quote, margin, market, adapter, policy, now, bookWithControlledAsk } =
      await setup({ fillOrKill: true });
    const adapterAddress = await adapter.getAddress();
    const policyAddress = await policy.getAddress();
    const ownerQuoteBefore = await quote.balanceOf(owner.address);
    const ownerNativeBefore = await ethers.provider.getBalance(owner.address);
    const adapterQuoteBefore = await quote.balanceOf(adapterAddress);
    const adapterNativeBefore = await ethers.provider.getBalance(adapterAddress);

    await policy.connect(executor).execute(proposal(now + 1_000n, ACTUAL_OUTPUT, ACTUAL_INPUT));

    const order = await policy.getOrder(0);
    expect(order.spent).to.equal(ACTUAL_INPUT);
    expect(order.received).to.equal(ACTUAL_OUTPUT);
    expect(order.executionNonce).to.equal(1n);
    expect(await quote.balanceOf(owner.address)).to.equal(ownerQuoteBefore - ACTUAL_INPUT);
    expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerNativeBefore + ACTUAL_OUTPUT);
    expect(await quote.allowance(owner.address, policyAddress)).to.equal(BUDGET - ACTUAL_INPUT);
    expect(await quote.allowance(policyAddress, adapterAddress)).to.equal(0n);
    expect(await quote.allowance(adapterAddress, MARKET)).to.equal(0n);
    expect(await quote.balanceOf(policyAddress)).to.equal(0n);
    expect(await quote.balanceOf(adapterAddress)).to.equal(adapterQuoteBefore);
    expect(await ethers.provider.getBalance(adapterAddress)).to.equal(adapterNativeBefore);
    expect(await margin.getBalance(adapterAddress, QUOTE)).to.equal(0n);
    const bookAfter = await market.getL2Book();
    expect(bookAfter).not.to.equal(bookWithControlledAsk);
    expect(bookAfter.length).to.equal(130);
  });

  it('reverts FOK when controlled capacity cannot consume the full quote input', async function () {
    const { owner, executor, quote, market, policy, now, bookWithControlledAsk } = await setup({ fillOrKill: true });
    const allowanceBefore = await quote.allowance(owner.address, await policy.getAddress());
    await expect(policy.connect(executor).execute(proposal(now + 1_000n))).to.be.revertedWithCustomError(
      market,
      'InsufficientLiquidity',
    );
    expect((await policy.getOrder(0)).executionNonce).to.equal(0n);
    expect(await quote.allowance(owner.address, await policy.getAddress())).to.equal(allowanceBefore);
    expect(bookLevels(await market.getL2Book())).to.equal(bookLevels(bookWithControlledAsk));
  });

  it('reverts atomically when Kuru minimum output exceeds the controlled fill', async function () {
    const { owner, executor, quote, market, policy, now, bookWithControlledAsk } = await setup();
    const ownerQuoteBefore = await quote.balanceOf(owner.address);
    const ownerNativeBefore = await owner.provider.getBalance(owner.address);
    await expect(policy.connect(executor).execute(proposal(now + 1_000n, ACTUAL_OUTPUT + 1n))).to.be.revertedWithCustomError(
      market,
      'SlippageExceeded',
    );
    expect((await policy.getOrder(0)).executionNonce).to.equal(0n);
    expect(await quote.balanceOf(owner.address)).to.equal(ownerQuoteBefore);
    expect(await owner.provider.getBalance(owner.address)).to.equal(ownerNativeBefore);
    expect(bookLevels(await market.getL2Book())).to.equal(bookLevels(bookWithControlledAsk));
  });

  it('rolls Kuru state back when actual input is below policy minFill', async function () {
    const { owner, executor, quote, market, policy, now, bookWithControlledAsk } = await setup({ minFill: 25_000_000n });
    const allowanceBefore = await quote.allowance(owner.address, await policy.getAddress());
    await expect(policy.connect(executor).execute(proposal(now + 1_000n))).to.be.revertedWithCustomError(
      policy,
      'MinimumFillNotMet',
    );
    expect((await policy.getOrder(0)).executionNonce).to.equal(0n);
    expect(await quote.allowance(owner.address, await policy.getAddress())).to.equal(allowanceBefore);
    expect(bookLevels(await market.getL2Book())).to.equal(bookLevels(bookWithControlledAsk));
  });

  it('rolls Kuru state back when actual effective price exceeds policy', async function () {
    const { owner, executor, quote, market, policy, now, bookWithControlledAsk } = await setup({ maxPrice: 4_000_000n });
    const allowanceBefore = await quote.allowance(owner.address, await policy.getAddress());
    await expect(policy.connect(executor).execute(proposal(now + 1_000n))).to.be.revertedWithCustomError(
      policy,
      'PriceLimitExceeded',
    );
    expect((await policy.getOrder(0)).executionNonce).to.equal(0n);
    expect(await quote.allowance(owner.address, await policy.getAddress())).to.equal(allowanceBefore);
    expect(bookLevels(await market.getL2Book())).to.equal(bookLevels(bookWithControlledAsk));
  });
});
