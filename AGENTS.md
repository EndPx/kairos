# Kairos project instructions
Read README.md and docs/PRODUCT_SPEC_FINAL.md before work. Then read the task-relevant documents listed in README.md.

## Product contract
Build the final Kairos specification, not another brainstorm.
Preserve wallet-held unexecuted funds, approval-based execution, adaptive sizing, cumulative scheduling, onchain limits, atomic settlement, cancellation and expiry.
Target Kuru + CRE + Privy + Aurora. One initial market and buy direction are scope choices, not permission to lower technical quality.
Do not add AI trading, perps, social features, alternative sponsors or escrow without user direction.
Do not treat delegated Privy signing as required; actual wallet transactions beyond login are the agreed base.
Maintain Indonesian communication with the user, concise progress updates, and precise technical evidence in repository docs.

## Execution
Inspect existing repository and instructions first; preserve existing code and user changes.
Make routine reversible technical choices autonomously and record them. Do not repeatedly ask approval for already-agreed scope.
Start with integration validation, but make independent implementation progress when one external dependency is blocked.
Never silently replace real sponsor integration with a mock. Fixtures and mocks are valid for tests, visibly labeled.
Do not invent SDK APIs, contract addresses, ABI signatures, RPC support, gas sponsorship, tokens, faucet availability or live results.
Verify current official docs, deployed contract compatibility and environment before live calls.
Use integer token units and explicit decimal/rounding rules.
Keep secrets out of chat, docs, logs and version control; add only variable names to .env.example.
No real-money spending, production deployment, public publishing or messages to sponsors are authorized by this handoff alone. Complete local preparation; obtain explicit user authorization for those actions when required.
This document does not require extra approval for ordinary local coding, reviews, tests or fixes.

## Git and submission discipline
- Repository-facing code, documentation, commit messages, UI copy, and evidence must be written in English. Continue communicating with the user in Indonesian.
- Work in small, cohesive commits. A commit must contain one narrowly scoped, reviewable change and its directly related tests or documentation only.
- Run the relevant verification before each commit. Do not batch unrelated work into one commit.
- Push every verified small commit directly to `main` immediately. Confirm the push succeeded before beginning the next independently reviewable change.
- Never force-push, rewrite public history, or include secrets, generated credentials, or unverified claims in a commit.

## Quality and evidence
Implement meaningful unit/invariant, adapter integration and end-to-end tests from docs/ACCEPTANCE_TESTS.md.
Record actual results and failures in EVIDENCE.md with environment, command, version and artifact.
A compiled frontend, mocked receipt, documentation claim or simulated report alone is not a working full product.
Update STATUS.md after each milestone: completed, in progress, blocked, exact next action.
Do not mark the product complete while a required sponsor or acceptance criterion remains unproven.
Task continuity comes from files, not assumed access to old chats.
