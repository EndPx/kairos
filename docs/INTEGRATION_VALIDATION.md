# Integration validation — first milestone
Do executable bounded probes. Do not stop at collecting URLs.
Maintain a matrix: integration | network/chainId | token addresses | contract/API version | credentials needed | test performed | result | artifact.

## Kuru
Find official deployed MON/USDC market and source ABI. Verify code exists on selected chain.
Establish ERC20 input and native MON output handling, market size/price precision, tick/min/max size and fee units.
Prove market execution, minimum output revert, partial-fill behavior, refund destination and no persistent margin/resting balance.
Trace adapter as caller: recipient may be adapter, so implement atomic forwarding, not assumed direct user output.
Record whether minOut concerns proposed or actual input. Adapt price check to actual settlement.
Tests may use controlled liquidity; do not present fixtures as public live market behavior.

## CRE
Confirm SDK/runtime/CLI versions, account, supported target network and forwarder for simulation/production.
Build workflow that reads Kairos policy and external market API, computes proposal and produces/submits report.
Implement receiver provenance, payload validation, expiry and nonce. Test duplicate report and stale proposal.
Simulations accepted by bounty do not mean a deployed continuously running DON exists.
If CRE requires a bridge/HTTP relay design, document authority and verification, not an unexplained private key.

## Privy
Verify selected chain configuration and actual embedded-wallet approve/create/cancel/revoke.
Confirm wallet owner and output recipient.
No delegated signer required for basic allowance-based execution. No sponsorship claim until supported/tested.

## Aurora
Resolve product-specific supported source/destination chains AND assets with exact token contracts.
Confirm destination token is accepted by the chosen Kuru market, not just same ticker.
Prove small authorized flow to user wallet and use in Kairos; track source/destination hashes and actual amount received.
Handle pending, failed, refunded, quote expiry and incomplete deposit; refreshing UI must not duplicate an order.
Cross-chain arrival must not confer policy authority.
No authorization for real-money transfer is conferred by this checklist.
If Aurora cannot fund the chosen testnet, record the incompatibility, working options and consequences; do not fake a cross-chain testnet path or silently change the whole project.

## Engineering decisions to resolve
Deadline release boundary; optional execution spacing; stale-data age; price rounding; treatment of native gas versus output; account-wide balance contention; admin/upgradability model.
Choose routine defaults with tests. Escalate product-visible changes with concrete evidence, while continuing independent work.

## Credentials inventory
List variable names and why each is needed, never actual secrets.
Potential categories: Monad RPC, Privy public app ID/server secret if required, CRE authentication, Aurora API key, test deployment/executor keys.
Determine exact names from selected SDKs. Keep private keys and secrets server/local only.

