# M0 credential inventory

This file names configuration only. Never commit values, tokens, private keys, or access URLs containing credentials.

| Variable | Purpose | Status after local presence check |
|---|---|---|
| `MONAD_RPC_URL` | Read-only RPC and later authorized testnet calls | Missing |
| `NEXT_PUBLIC_MONAD_CHAIN_ID` | Explicit selected network configuration | Missing; set only after M0.4 |
| `NEXT_PUBLIC_KURU_MARKET_ADDRESS` | Verified selected Kuru market | Missing; set only after M0.5 |
| `NEXT_PUBLIC_USDC_ADDRESS` | Verified Kuru input token | Missing; set only after M0.5 |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy browser client configuration | Missing |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Optional Privy client identifier documented by Monad template | Missing |
| `CRE_API_KEY` | Placeholder only; exact CRE credential name remains to be verified in M0.7 | Missing / unverified name |
| `AURORA_API_KEY` | Placeholder only; exact requirement remains to be verified in M0.9 | Missing / unverified name |
| `KAIROS_DEPLOYER_PRIVATE_KEY` | Test-only deployment signer, never required for read probes | Missing |
| `KAIROS_EXECUTOR_PRIVATE_KEY` | Test-only executor signer, never required for read probes | Missing |

The local session has Colosseum Copilot variables, but they are research tooling outside Kairos runtime configuration and are deliberately excluded from `.env.example`.
