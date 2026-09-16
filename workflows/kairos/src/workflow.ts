import {
  consensusIdenticalAggregation,
  CronCapability,
  EVMClient,
  getNetwork,
  handler,
  HTTPClient,
  prepareReportRequest,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk';
import { acquireAtOneBlock, type SerializedAcquisition } from './acquisition.js';
import type { WorkflowConfig } from './config.js';
import { evaluateAcquisition, serializableTrace } from './core.js';

export function onCronTrigger(runtime: Runtime<WorkflowConfig>) {
  const startedAt = runtime.now().getTime();
  const observedAt = BigInt(Math.floor(startedAt / 1_000));
  const serialized = new HTTPClient()
    .sendRequest(runtime, acquireAtOneBlock, consensusIdenticalAggregation<string>())(runtime.config, observedAt)
    .result();
  const runtimeNow = BigInt(Math.floor(runtime.now().getTime() / 1_000));
  const blockTimestamp = BigInt((JSON.parse(serialized) as SerializedAcquisition).block.timestamp);
  const evaluatedAt = runtimeNow < blockTimestamp ? blockTimestamp : runtimeNow;
  const evaluation = evaluateAcquisition(runtime.config, serialized, evaluatedAt);
  runtime.log(`Kairos decision ${evaluation.decision.kind}/${evaluation.decision.reason}.`);

  let submitted = false;
  if (evaluation.reportPayload !== undefined) {
    const report = runtime.report(prepareReportRequest(evaluation.reportPayload)).result();
    runtime.log('CRE report generated for an executable proposal.');
    if (runtime.config.submitReports) {
      const network = getNetwork({
        chainFamily: 'evm',
        chainSelectorName: runtime.config.chainSelectorName,
        isTestnet: true,
      });
      if (network === undefined) throw new Error(`Unsupported CRE network ${runtime.config.chainSelectorName}.`);
      const response = new EVMClient(network.chainSelector.selector)
        .writeReport(runtime, {
          receiver: runtime.config.receiverAddress,
          report,
          gasConfig: { gasLimit: runtime.config.gasLimit },
        })
        .result();
      if (response.txStatus !== TxStatus.SUCCESS) {
        throw new Error(`CRE report submission failed with status ${response.txStatus}.`);
      }
      submitted = true;
    }
  }

  const elapsedMs = runtime.now().getTime() - startedAt;
  return serializableTrace(evaluation, elapsedMs, submitted);
}

export function initWorkflow(config: WorkflowConfig) {
  const cron = new CronCapability();
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
}
