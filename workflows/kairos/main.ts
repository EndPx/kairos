import { Runner } from '@chainlink/cre-sdk';
import { workflowConfigSchema, type WorkflowConfig } from './src/config.js';
import { initWorkflow } from './src/workflow.js';

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>({ configSchema: workflowConfigSchema });
  await runner.run(initWorkflow);
}
