# M0.8 Privy capability probe

Probe date: 2026-09-15

## Documentation-backed integration surface

| Capability | Current primary-source finding | Kairos interpretation |
|---|---|---|
| React transaction flow | `useSendTransaction` from `@privy-io/react-auth` accepts an unsigned EVM transaction request and returns a broadcast hash | Kairos can use an explicit user wallet transaction for approval, create, cancel, and revoke actions. Delegated signing is neither assumed nor required. |
| Embedded wallet flow | Privy's React quickstart documents EVM embedded-wallet creation and prompting a user to sign/send | Wallet ownership and confirmation remain user-facing; this does not authorize server-held or escrowed funds. |
| Monad template prerequisites | Monad's Privy template requires a Privy account and `NEXT_PUBLIC_PRIVY_APP_ID`; its client ID is optional | The template is a reference only. Kairos will retain its own execution design and will not import it until its dependency/license state is pinned. |
| Allowed origin | Monad's template instructions require adding a deployed domain to Privy's allowed origins | A local development origin and the eventual production origin must be explicitly configured in the Privy dashboard before a browser proof is possible. |

Sources reviewed: [Privy React quickstart](https://docs.privy.io/basics/react/quickstart), [Privy EVM transaction API](https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction), and [Monad's Privy PWA template guide](https://docs.monad.xyz/templates/next-serwist-privy-embedded-wallet).

## Local configuration result

The presence-only inventory in M0.3 found neither `NEXT_PUBLIC_PRIVY_APP_ID` nor `NEXT_PUBLIC_PRIVY_CLIENT_ID`. No Privy dashboard configuration, test account, wallet, user login, approval, create, cancel, revoke, or transaction hash was accessed.

## Blockers and next action

1. Provide a Privy Web App ID through local environment configuration; keep it out of version control.
2. Configure the intended local and deployed allowed origins, login method, and user-owned EVM wallet behavior in the Privy dashboard.
3. Verify selected Monad chain configuration against current Privy support before implementation. The Monad template is not evidence of Kairos's exact chain configuration.
4. After the Kuru ABI and Kairos contract interfaces are verified, run browser-assisted tests for a user-confirmed ERC-20 approval, schedule creation, cancellation, and allowance revocation. Record each transaction hash separately.

This probe establishes a documented client integration path only. It does not establish Privy account access or a functioning onchain integration.
