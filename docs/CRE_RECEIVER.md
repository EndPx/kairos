# CRE receiver boundary

## Pinned interface source

Kairos follows the Chainlink CRE `IReceiver` and metadata layout from `smartcontractkit/cre-templates` revision `d0223f31182c76bc36b1cc9d47b13b18efcf2bf6`. The interface is `onReport(bytes metadata, bytes report)` plus ERC-165 support. Forwarder metadata is packed as `bytes32 workflowId`, `bytes10 workflowName`, and `address workflowOwner` (62 bytes total).

The reference template permits mutable validation fields. Kairos deliberately narrows that design:

- `trustedForwarder` and `activationAuthority` are immutable and nonzero;
- the receiver starts inactive;
- activation binds one deployed policy and complete nonzero workflow identity exactly once;
- no setter can disable or weaken forwarder/workflow validation;
- every accepted report calls the existing `KairosPolicy.execute` path, where nonce, lifecycle, cumulative release, budget, actual settlement, minimum fill, and price remain authoritative.

## Report encoding

The workflow report is a static ABI tuple matching `KairosPolicy.Proposal`:

```text
(uint256 orderId,
 uint64 nonce,
 uint64 validUntil,
 uint128 proposedInput,
 uint128 minimumOutput,
 bytes32 snapshotId)
```

The receiver requires the canonical 192-byte encoding, nonzero proposal fields, and a future `validUntil`. It records `keccak256(report)` before forwarding; a revert from the policy also reverts this marker. Identical delivery is rejected explicitly, while a different report that reuses the same order nonce is rejected by the policy.

## Evidence boundary

The local suite uses an EOA as a forwarder fixture and the existing fixture venue behind the real policy contract. This proves receiver validation and preservation of policy guardrails. It is not a signed CRE report, CRE simulation, workflow deployment, public transaction, or Kuru settlement proof.
