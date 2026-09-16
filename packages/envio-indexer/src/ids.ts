export function orderEntityId(chainId: number, policy: string, orderId: bigint): string {
  return `${chainId}:${policy.toLowerCase()}:${orderId}`;
}

export function eventEntityId(chainId: number, transactionHash: string, logIndex: number): string {
  return `${chainId}:${transactionHash.toLowerCase()}:${logIndex}`;
}

export function settlementKeyId(chainId: number, policy: string, orderId: bigint, nonce: bigint): string {
  return `${chainId}:${policy.toLowerCase()}:${orderId}:${nonce}`;
}

export function receiverEntityId(chainId: number, receiver: string): string {
  return `${chainId}:${receiver.toLowerCase()}`;
}
