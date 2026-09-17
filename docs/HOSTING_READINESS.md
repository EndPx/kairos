# Frontend hosting readiness

Date: 2026-09-17

## Target and authorization boundary

The prepared target is a Vercel Next.js project connected to `EndPx/kairos` with project root `apps/web`, Node.js 22.x, and the committed `apps/web/vercel.json`. Vercel is selected because the application already uses Next.js server routes and a pnpm workspace. This document and configuration are deployment preparation only: no Vercel project, preview, production deployment, domain, or paid service has been created or authorized.

The prepared hosted configuration is a **read-only preview**. `NEXT_PUBLIC_KAIROS_DEPLOYMENT_MODE=lifecycle-only` is the fail-closed technical mode: the global preview notice is visible, wallet writes are blocked, and create-order navigation is hidden. The preview may read the separately verified public lifecycle history but must not present that testnet proof as a hosting deployment or suggest that a Kuru trade can execute. No Vercel deployment currently exists.

## Verified public deployment configuration

These public identities are receipt- or read-verified and may be configured for Preview and Production:

| Variable | Value / source | Exposure |
|---|---|---|
| `NEXT_PUBLIC_KAIROS_DEPLOYMENT_MODE` | `lifecycle-only` | Public safety mode |
| `NEXT_PUBLIC_MONAD_RPC_URL` | `https://rpc-testnet.monadinfra.com` or another verified public Monad Testnet RPC | Public browser read endpoint |
| `MONAD_RPC_URL` | A stable Monad Testnet RPC | Server only |
| `NEXT_PUBLIC_KURU_MARKET_ADDRESS` | `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9` | Public contract identity |
| `NEXT_PUBLIC_USDC_ADDRESS` | `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570` | Public token identity |
| `NEXT_PUBLIC_KAIROS_POLICY_ADDRESS` | `0x3cBdB8f7D91966AD543982b76CDb71a0283d3213` | Public lifecycle-only policy |
| `ENVIO_GRAPHQL_URL` | `https://indexer.dev.hyperindex.xyz/f319caf/v1/graphql` | Server-only public endpoint |
| `NEXT_PUBLIC_ENABLE_LIMITED_DEPLOYMENT` | `false` | Hides the completed local deployment tool |

`NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_PRIVY_CLIENT_ID` are public client identifiers, but their values should be copied from the Privy dashboard into Vercel environment settings rather than committed. They enable login and balance reads; lifecycle-only mode still blocks approve/create/cancel/revoke. Add the final preview and production origins in Privy before testing login.

Do not configure `NEXT_PUBLIC_KAIROS_RECEIVER_ADDRESS`: no public receiver deployment exists. Do not add `AURORA_API_KEY`, CRE credentials, deployer/executor private keys, or an Envio admin secret to this frontend project. The current public Envio endpoint requires no admin credential.

`NEXT_PUBLIC_*` values are compiled into the client bundle and require a rebuild after changes. Server-only values must never receive that prefix. Vercel project secrets should be scoped separately to Preview and Production.

## Build and release checks

Before any deployment authorization is requested:

```text
pnpm install --frozen-lockfile
pnpm web:test
pnpm web:typecheck
pnpm web:build
```

After a preview URL exists, add that exact HTTPS origin to Privy, rebuild the preview, then verify:

1. the read-only preview notice is visible on every route;
2. create-order navigation and all wallet write controls are unavailable;
3. `/orders`, `/orders/0`, and `/reports` read the live Envio endpoint;
4. order `0` remains `CANCELLED` and the index synchronization state is visible;
5. no receiver, Kuru settlement, CRE delivery, or Aurora funding claim appears.

Production promotion should reuse the validated preview artifact. A custom domain and production promotion remain separate user-authorized actions.

## References

- Vercel monorepos: `https://vercel.com/docs/monorepos`
- Vercel package managers: `https://vercel.com/docs/package-managers`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Lifecycle deployment evidence: `docs/evidence/M3_PRIVY_LIFECYCLE.md`
- Live Envio evidence: `docs/evidence/M3_ENVIO_LIVE.md`
