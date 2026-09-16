import { z } from 'zod';

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const unsignedInteger = z.string().regex(/^(0|[1-9][0-9]*)$/);

const fixturePolicySchema = z.object({
  owner: address,
  executor: address,
  tokenIn: address,
  tokenOut: address,
  recipient: address,
  budget: unsignedInteger,
  spent: unsignedInteger,
  received: unsignedInteger,
  startTime: unsignedInteger,
  endTime: unsignedInteger,
  maxPerFill: unsignedInteger,
  minFill: unsignedInteger,
  maxEffectivePrice: unsignedInteger,
  executionNonce: unsignedInteger,
  cancelled: z.boolean(),
  releasedBudget: unsignedInteger,
  availableToSpend: unsignedInteger,
  walletBalance: unsignedInteger,
  tokenAllowance: unsignedInteger,
});

export const workflowConfigSchema = z.object({
  schedule: z.string().min(1),
  chainSelectorName: z.literal('monad-testnet'),
  chainId: unsignedInteger,
  rpcUrl: z.string().regex(/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?(?:\/.*)?$/),
  blockTag: z.string().regex(/^(latest|0x[0-9a-fA-F]+)$/),
  marketAddress: address,
  policyAddress: address,
  receiverAddress: address,
  orderId: unsignedInteger,
  gasLimit: unsignedInteger,
  marketDataSource: z.enum(['RPC_L2', 'FIXTURE_L2']),
  fixtureAsks: z.array(z.object({ price: unsignedInteger, size: unsignedInteger })).optional(),
  policySource: z.enum(['RPC_POLICY', 'FIXTURE_POLICY']),
  fixturePolicy: fixturePolicySchema.optional(),
  submitReports: z.boolean(),
  sourceRevision: z.string().min(1),
});

export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
