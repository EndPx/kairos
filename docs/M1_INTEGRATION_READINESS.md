# M1 limited integration-readiness follow-up

This record updates readiness only. It does not start M3/M4 or claim a sponsor integration.

## CRE

- Local CLI is now `v1.34.0` from the official updater release.
- Local account authentication is confirmed without storing account identifiers.
- Still required: current primary confirmation of the exact Monad network and `KeystoneForwarder`, a workflow project, no-secret configuration, and a successful simulation. A simulation will remain distinct from deployment proof.

## Privy

- Required configuration remains: a Privy Web App, allowed local/deployed origins, chosen login method, user-owned EVM wallet configuration, selected-chain confirmation, and a test account.
- The app configuration must be kept only in local/server configuration. Do not commit app credentials, and do not treat an App ID as proof of browser transaction functionality.
- The initial wallet path remains explicit user confirmation for approve/create/cancel/revoke; delegated signing and gas sponsorship are not assumed.

## Aurora Intents

- API credentials alone are insufficient. The first safe route test must use authenticated token discovery to establish a supported source chain, a supported Monad destination network, and the **exact** destination token contract accepted by Kuru.
- If those match, the next safe request is a non-funding `dry: true` quote with a user-owned recipient/refund address and integer units. It must not create a deposit or Kairos order.
- No source/destination route has been asserted. In particular, Monad Testnet cannot be inferred from Kuru's testnet market.

## Credential handling

No credential values are stored in this repository, working-tree configuration, docs, or evidence. Any credentials shared outside the repository must be treated as sensitive; configure them through a local secret store or environment only, and rotate a secret that was exposed in a chat or other non-secret channel.
