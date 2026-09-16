export const KAIROS_EVENTS_ABI = [
  {
    type: 'event',
    name: 'OrderCreated',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'budget', type: 'uint128', indexed: false },
      { name: 'startTime', type: 'uint64', indexed: false },
      { name: 'endTime', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OrderCancelled',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ExecutionSettled',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'nonce', type: 'uint64', indexed: true },
      { name: 'actualInput', type: 'uint256', indexed: false },
      { name: 'actualOutput', type: 'uint256', indexed: false },
      { name: 'returnedInput', type: 'uint256', indexed: false },
      { name: 'snapshotId', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ReceiverActivated',
    inputs: [
      { name: 'policy', type: 'address', indexed: true },
      { name: 'workflowId', type: 'bytes32', indexed: true },
      { name: 'workflowName', type: 'bytes10', indexed: true },
      { name: 'workflowOwner', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ReportForwarded',
    inputs: [
      { name: 'reportHash', type: 'bytes32', indexed: true },
      { name: 'workflowId', type: 'bytes32', indexed: true },
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'nonce', type: 'uint64', indexed: false },
      { name: 'snapshotId', type: 'bytes32', indexed: false },
      { name: 'reportId', type: 'bytes2', indexed: false },
    ],
  },
] as const;
