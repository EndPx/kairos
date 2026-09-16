import { bytesToBase64, ok, text, type HTTPSendRequester } from '@chainlink/cre-sdk';

interface JsonRpcResponse {
  readonly result?: unknown;
  readonly error?: { readonly code?: number; readonly message?: string };
}

export function jsonRpc(
  requester: HTTPSendRequester,
  rpcUrl: string,
  id: number,
  method: string,
  params: readonly unknown[],
): unknown {
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  const response = requester
    .sendRequest({
      url: rpcUrl,
      method: 'POST',
      body: bytesToBase64(new TextEncoder().encode(body)),
      multiHeaders: { 'content-type': { values: ['application/json'] } },
      timeout: '2s',
    })
    .result();
  if (!ok(response)) throw new Error(`JSON-RPC HTTP status ${response.statusCode}.`);

  const parsed = JSON.parse(text(response)) as JsonRpcResponse;
  if (parsed.error !== undefined) {
    throw new Error(`JSON-RPC ${method} failed with code ${parsed.error.code ?? 'unknown'}.`);
  }
  if (parsed.result === undefined) throw new Error(`JSON-RPC ${method} omitted result.`);
  return parsed.result;
}

export function rpcHex(result: unknown, method: string): `0x${string}` {
  if (typeof result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(result)) {
    throw new Error(`JSON-RPC ${method} returned non-hex data.`);
  }
  return result as `0x${string}`;
}
