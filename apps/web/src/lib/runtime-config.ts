import {getAddress, isAddress, type Address} from 'viem';

function optionalAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined;
}

export type DeploymentMode = 'execution' | 'lifecycle-only';

export function parseDeploymentMode(value: string | undefined): DeploymentMode {
  return value === 'execution' ? 'execution' : 'lifecycle-only';
}

export const runtimeConfig = {
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || undefined,
  privyClientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined,
  policyAddress: optionalAddress(process.env.NEXT_PUBLIC_KAIROS_POLICY_ADDRESS),
  receiverAddress: optionalAddress(process.env.NEXT_PUBLIC_KAIROS_RECEIVER_ADDRESS),
  inputTokenAddress: optionalAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS),
  marketAddress: optionalAddress(process.env.NEXT_PUBLIC_KURU_MARKET_ADDRESS),
  limitedDeployment: process.env.NEXT_PUBLIC_ENABLE_LIMITED_DEPLOYMENT === 'true',
  deploymentMode: parseDeploymentMode(process.env.NEXT_PUBLIC_KAIROS_DEPLOYMENT_MODE),
} as const;

export const walletConfiguration = {
  privy: Boolean(runtimeConfig.privyAppId),
  policy: Boolean(runtimeConfig.policyAddress),
  inputToken: Boolean(runtimeConfig.inputTokenAddress),
  market: Boolean(runtimeConfig.marketAddress),
  transactions:
    runtimeConfig.deploymentMode === 'execution' &&
    Boolean(runtimeConfig.privyAppId) &&
    Boolean(runtimeConfig.policyAddress) &&
    Boolean(runtimeConfig.inputTokenAddress),
} as const;
