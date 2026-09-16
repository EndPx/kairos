import { network } from 'hardhat';

const SOURCE_CHAIN_ID = 10_143n;
const DEFAULT_FORK_BLOCK = 62_944_132n;
const MARKET = '0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9';
const IMPLEMENTATION = '0x72cae0a99c19b574e8a6de558f43fc1d019c9374';
const MARGIN_ACCOUNT = '0xd029C2D98ff85D8F64799017fE00a59B1159CE02';
const PUBLIC_RPC = 'https://rpc-testnet.monadinfra.com';

const forkBlock = BigInt(process.env.KURU_FORK_BLOCK ?? DEFAULT_FORK_BLOCK);
const rpcUrl = process.env.MONAD_RPC_URL ?? PUBLIC_RPC;

const { ethers } = await network.create({
  override: {
    chainId: 31_337,
    forking: {
      url: rpcUrl,
      blockNumber: forkBlock,
    },
  },
});

const sourceBlock = await ethers.provider.getBlock(forkBlock);
if (sourceBlock === null) {
  throw new Error(`Fork source block ${forkBlock} is unavailable`);
}

const localNetwork = await ethers.provider.getNetwork();
const implementationCode = await ethers.provider.getCode(IMPLEMENTATION);
const market = await ethers.getContractAt(
  [
    'function getMarketParams() view returns (uint32,uint96,address,uint256,address,uint256,uint32,uint96,uint96,uint256,uint256)',
    'function getL2Book() view returns (bytes)',
    'function getVaultParams() view returns (address,uint256,uint96,uint256,uint96,uint96,uint96,uint96)',
  ],
  MARKET,
);
const params = await market.getMarketParams();
const l2 = await market.getL2Book();
const vault = await market.getVaultParams();
const quoteToken = await ethers.getContractAt(
  ['function balanceOf(address) view returns (uint256)'],
  params[4],
);
const marginAccount = await ethers.getContractAt(
  ['function verifiedMarket(address) view returns (bool)'],
  MARGIN_ACCOUNT,
);
const [probeSigner] = await ethers.getSigners();
const balanceInterface = new ethers.Interface(['function balanceOf(address) view returns (uint256)']);
const balanceTrace = (await ethers.provider.send('debug_traceCall', [
  {
    to: params[4],
    data: balanceInterface.encodeFunctionData('balanceOf', [probeSigner.address]),
  },
  'latest',
  {},
])) as { structLogs?: Array<{ op: string; stack?: string[] }> };
const balanceSloads =
  balanceTrace.structLogs
    ?.filter((step) => step.op === 'SLOAD' && step.stack !== undefined)
    .map((step) => step.stack!.at(-1)!) ?? [];

async function optionalAddressGetter(signature: string): Promise<string | null> {
  try {
    const contract = await ethers.getContractAt([`function ${signature} view returns (address)`], params[4]);
    return (await contract[signature.slice(0, signature.indexOf('('))]()) as string;
  } catch {
    return null;
  }
}

async function canProbeSignerMint(): Promise<boolean> {
  const mintInterface = new ethers.Interface(['function mint(address,uint256)']);
  try {
    await ethers.provider.call({
      from: probeSigner.address,
      to: params[4],
      data: mintInterface.encodeFunctionData('mint', [probeSigner.address, 1n]),
    });
    return true;
  } catch {
    return false;
  }
}

console.log(
  JSON.stringify(
    {
      sourceChainId: SOURCE_CHAIN_ID.toString(),
      localChainId: localNetwork.chainId.toString(),
      blockNumber: sourceBlock.number,
      blockHash: sourceBlock.hash,
      market: MARKET,
      implementation: IMPLEMENTATION,
      implementationCodeBytes: (implementationCode.length - 2) / 2,
      pricePrecision: params[0].toString(),
      sizePrecision: params[1].toString(),
      baseAsset: params[2],
      quoteAsset: params[4],
      marginAccount: MARGIN_ACCOUNT,
      marginRecognizesMarket: await marginAccount.verifiedMarket(MARKET),
      marginQuoteBalance: (await quoteToken.balanceOf(MARGIN_ACCOUNT)).toString(),
      marginNativeBalance: (await ethers.provider.getBalance(MARGIN_ACCOUNT)).toString(),
      quoteTokenOwner: await optionalAddressGetter('owner()'),
      quoteTokenMasterMinter: await optionalAddressGetter('masterMinter()'),
      quoteTokenPermissionlessMintProbe: await canProbeSignerMint(),
      quoteTokenBalanceSloads: balanceSloads,
      l2PayloadBytes: (l2.length - 2) / 2,
      vault: vault[0],
      vaultBidOrderSize: vault[5].toString(),
      vaultAskOrderSize: vault[6].toString(),
    },
    null,
    2,
  ),
);
