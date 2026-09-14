# Kairos — Codex handoff
Prepared 2026-09-14. This is a context and implementation handoff, not an implemented application.

## How to use this package
1. Extract the full package into the Kairos repository root. If the repository already has an `AGENTS.md`, merge instructions carefully; do not overwrite existing work.
2. Open that repository as a project in Codex.
3. Use the contents of `CODEX_START_PROMPT.md` as the initial message.
4. Use one primary task to keep decisions, implementation, and evidence consistent. Break work into milestones in `WORKPLAN.md`.
5. If creating a replacement task, require it to read `STATUS.md` and `EVIDENCE.md`; do not rely on access to old conversations.
6. The final specification must not be reduced to a basic demo. No sponsor integration is proven merely because it appears in documentation.

## Read order
- `AGENTS.md` — concise working instructions
- `docs/PRODUCT_SPEC_FINAL.md` — final user specification, maintained as a controlled English translation for submission
- `docs/DECISIONS.md` — decisions and interpretation boundaries
- `docs/HACKATHON_REQUIREMENTS.md` — deliverables and prizes
- `docs/SOURCES.md` — official sources, provenance, and required checks
- `docs/INTEGRATION_VALIDATION.md` — unresolved technical questions
- `docs/ACCEPTANCE_TESTS.md` — proof matrix
- `WORKPLAN.md`, `STATUS.md`, `EVIDENCE.md` — work continuity

## Source hierarchy
The user's latest instructions override this package. For the product, `PRODUCT_SPEC_FINAL.md` is the primary reference.
Sponsor documentation determines API capability; it must not silently alter product scope.
If actual capability conflicts with the specification, document the evidence and options, then continue independent work.
Raw user-provided hackathon materials are in `sources/`; they were not verified against the authenticated portal when this package was prepared.
This package contains no application source code, pinned ABI, API key, new deployment, or execution transaction.
