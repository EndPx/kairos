# M0.7 CRE capability probe

Probe date: 2026-09-15

## Runtime result

| Check | Command | Result |
|---|---|---|
| CLI present | `cre --help` | PASS — CRE CLI exposes `init`, account management, workflow simulation, deploy, activate, pause, and delete commands |
| Installed version | `cre version` | `v1.0.10` |
| Current-version signal | `cre version` | CLI reports `v1.34.0` as latest; installed CLI is outdated |
| SDK registry check | `npm view @chainlink/cre-sdk version --json` | `1.21.1` |
| Account availability | `cre whoami` | BLOCKED — command returned empty organization ID and name |
| Simulation surface | `cre workflow --help` | Present, but no initialized workflow project or authenticated account is available |

## Receiver requirements confirmed from current Chainlink documentation

CRE onchain writes submit a signed report through a `KeystoneForwarder`, which calls a consumer's `onReport(bytes metadata, bytes report)`. A receiver must support ERC-165/IReceiver and validate provenance; workflow identity, report expiry, application nonce, payload format, and target policy remain Kairos responsibilities. Production metadata is documented as 64 bytes, so a receiver must not require exactly 62 bytes.

## Blockers and next action

1. Run `cre update`, record its resulting version, and pin it before scaffolding a workflow.
2. Authenticate with an authorized CRE account and confirm organization/key linkage; do not store credentials in the repository.
3. Verify Monad Testnet support and the exact forwarder address from Chainlink's current supported-networks/forwarder directory before writing a receiver configuration.
4. Then initialize a minimal workflow that reads one Kairos state value and one external market-data value, and run `cre workflow simulate`.

No workflow, report, forwarder, deployment, or simulation is claimed by this probe.

## M1 follow-up — 2026-09-15

The official `cre update` command downloaded CLI `v1.34.0`, but could not replace the active executable automatically on Windows. The previous executable was preserved as a local backup and the downloaded official binary was manually installed; `cre version` now reports `v1.34.0`.

`cre whoami` now confirms that an authenticated local account is available. Account identifiers and personal details are intentionally not recorded. This removes the prior local authentication blocker, but it does not establish a workflow project, target-network support, a Monad forwarder address, simulation, deployment authorization, or a deployed workflow.

Next: initialize no deployment until the current Chainlink supported-network/forwarder directory identifies the exact Monad environment and a minimal workflow can be simulated with no secret committed.
