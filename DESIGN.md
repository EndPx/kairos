# Kairos application design system

Status: approved implementation direction for M3.5-M3.9  
Updated: 2026-09-16

## 0. Product and user contract

Kairos is an execution-control application, not a trading terminal and not an asset custodian. The interface must help a user create a bounded spot-buy policy, authorize only the token allowance they choose, inspect deterministic automation decisions, and review actual settlements. Unused funds remain in the user's wallet. The contract remains the final policy authority.

Primary user: a crypto user who understands wallets and token approvals but should not have to inspect raw calldata to know what Kairos will do. The visual hierarchy therefore favors policy limits, wallet availability, execution state, and proof over charts or promotional metrics.

The application must never imply guaranteed completion, best price, reserved wallet funds, successful submission before confirmation, or public deployment when only a fixture, replay, fork, or CRE simulation exists.

## 1. Research log and chosen direction

### Embedded reference

- Shortlist: `Aside`, `WorkOS`, and `Linear` from the installed frontend reference index.
- Selected Layer B reference: `Aside`, for its quiet product frame, compact navigation, warm neutral canvas, and high-information surfaces without decorative card grids.
- Layer A note: the installed skill package references a separate style/taste layer, but those files are absent from the installed package. Kairos uses the skill's documented typography, hierarchy, spacing, and accessibility constraints plus `layout-skill.md` as the explicit fallback. No missing reference is presented as reviewed.
- Decision carried forward: use one restrained application frame with a high-contrast execution rail. Pages should read like operational records, not a generic crypto dashboard.

### Real-product screen research

Lazyweb searches performed on 2026-09-16:

1. `crypto trading order detail execution history`
2. `fintech wallet approval transaction status`
3. `trading dashboard recurring order create`

Four desktop screens were opened and visually reviewed: Coinbase trading, Family Wallet transaction success, Midday transaction list/detail, and Lemon Squeezy orders. Decisions taken:

- Coinbase: borrow the persistent relationship between market context, executable controls, and order state; do not borrow the dark dense terminal aesthetic or chart-first hierarchy.
- Family Wallet: a transaction result needs a single explicit state, chain, wallet, amount, and terminal action. Kairos extends this with submitted/confirmed/failed/stale states and explorer provenance.
- Midday: use the list/detail relationship for orders and receipts, with the selected record and its evidence adjacent on wide screens.
- Lemon Squeezy: use a quiet rail, strong page title, compact filters, and a scannable table; avoid floating calendar overlays and decorative metrics that do not advance the Kairos task.

Image assets are research references only and are not copied into the product.

### Spatial pattern research

StyleGallery was queried through its raw repository catalog on 2026-09-16. The adopted patterns are linked rather than copied because the upstream repository exposes no license file:

- [`fixed-sidenav-shell`](https://github.com/changeroa/StyleGallery/blob/main/patterns/viewport-shell/fixed-sidenav-shell.md): stable navigation beside a main region that owns vertical scrolling.
- [`supporting-pane`](https://github.com/changeroa/StyleGallery/blob/main/patterns/split-sidebar/supporting-pane.md): create-order form beside authorization and risk context, reflowing to one column.
- [`list-detail`](https://github.com/changeroa/StyleGallery/blob/main/patterns/split-sidebar/list-detail.md): order list beside selected detail, reflowing without changing source or focus order.

Load-bearing constraints: every grid child has `min-inline-size: 0`; the desktop application frame is bounded to the viewport; only the main content region scrolls; DOM order stays navigation, primary task, supporting evidence; mobile returns to normal document flow with page scroll.

### Image generation decision

Image generation is intentionally skipped. Kairos is an operational product surface whose identity should come from type, information structure, state language, and the execution rail. Decorative generated art would compete with transaction evidence and would not improve the M3 user journey.

## 2. Visual thesis

Direction: **bright execution desk**.

Kairos uses a warm paper canvas held inside an ink-colored product frame. A narrow cobalt execution rail is the signature element: it connects policy release, current decision, wallet authorization, and settlement receipts as one traceable sequence. The rail appears as a vertical rule on detail pages and a horizontal schedule beam in create-order summaries. It must always encode real state, never serve as decoration.

The interface should feel exact, calm, and inspectable. It should not use neon-on-black crypto styling, glassmorphism, oversized gradients, hero marketing copy inside the app, card mosaics, or glowing status treatments.

## 3. Tokens

All implementation colors must reference semantic custom properties. Raw color literals belong only in the root token definition.

### Color roles

- `--canvas`: warm off-white application background.
- `--surface`: white primary work surface.
- `--surface-muted`: warm gray for secondary regions and inactive controls.
- `--ink`: near-black primary text and product frame.
- `--ink-muted`: secondary text that still meets contrast requirements.
- `--line`: quiet structural borders.
- `--accent`: cobalt for primary actions, focus rings, and the execution rail.
- `--accent-soft`: low-chroma blue for selected rows and supporting emphasis.
- `--success`, `--warning`, `--danger`, `--stale`: semantic state colors, always paired with text/iconography.

### Typography

- UI sans: Geist Variable, self-hosted through the application package, with `Segoe UI` and system sans fallbacks.
- Numeric mono: Geist Mono for token units, addresses, nonces, block identifiers, timestamps, and prices.
- Page title: fluid 28-40 px, 0.96-1.05 line height, strong weight.
- Section title: 16-20 px, compact leading.
- Body: 14-16 px, 1.45-1.6 line height.
- Label/meta: 11-13 px, never below 11 px; uppercase only for short status/category labels with increased tracking.

### Spacing, radii, and depth

- Spacing unit: 4 px. Core steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Content measure: 76rem maximum for task pages; prose measure: 68 characters.
- Control height: 40 px compact, 48 px primary transaction action.
- Radius: 6 px controls, 10 px work surfaces, full pill only for status chips.
- Depth: tonal separation and one-pixel borders by default. A single soft frame shadow is allowed on the outer desktop product frame; nested cards do not stack shadows.

### Motion

- Fast feedback: 140 ms.
- Standard state change: 220 ms.
- Page/detail reveal: 420 ms maximum.
- Animate only opacity and transform for entrance/reordering. Respect `prefers-reduced-motion`; transaction state changes must remain understandable with motion disabled.

## 4. Application shell and responsive behavior

Desktop (1280 px and above): a bounded product frame uses a 15rem navigation rail and a `minmax(0, 1fr)` main region. The main region alone owns vertical scrolling. Page actions remain in normal flow; no controls are hidden behind persistent bottom bars.

Tablet (768-1279 px): navigation collapses to a compact top bar; supporting panes reflow below primary tasks when either region would fall below 20rem. List/detail views remain adjacent only when both preserve readable measures.

Mobile (375-767 px): one-column normal document flow with page scroll. Navigation becomes a labeled disclosure; tables switch to semantic record rows, not clipped horizontal screenshots. Transaction actions remain at least 44 px high and appear after the summary they authorize.

Test widths: 375, 768, and 1280 px, plus one intermediate width where the supporting pane changes layout.

## 5. Primitives and contracts

The `/system` route must render every primitive and state before product screens are considered complete.

- `AppShell`: semantic navigation and one main scroll owner.
- `Wordmark`: text-first Kairos identity with a small execution-marker glyph.
- `RailNav`: active state, keyboard focus, mobile disclosure, network badge.
- `StatusPill`: submitted, confirmed, failed, stale, active, cancelled, expired, completed, waiting; text and icon required, never color alone.
- `Button`: primary, secondary, quiet, danger; loading text preserves action context; disabled state includes a visible reason nearby.
- `Field`: label, hint, unit suffix, validation error, integer-safe parsing status.
- `MoneyValue`: token amount in integer-derived display units plus optional estimated USD; estimates are explicitly labeled.
- `Address`: shortened visual form with an accessible full value and copy action.
- `TransactionState`: wallet prompt, submitted hash, confirmed receipt, failed/reverted, and stale/unknown states.
- `DataTable` / `RecordList`: desktop table and mobile record rendering from the same semantic data.
- `DetailRail`: ordered sequence of policy, decision, wallet transaction, and settlement events.
- `DecisionTrace`: snapshot identity, block/time, capacity inputs, deterministic result, and WAIT/EXECUTE reason.
- `ReceiptCard`: actual input/output, effective price, trading fee, gas, duration, and explorer provenance.
- `SourceBadge`: `ONCHAIN`, `LIVE READ`, `CRE SIMULATION`, `REPLAY`, `FORK`, or `FIXTURE`; no source can be visually omitted.
- `StatePanel`: loading, empty, missing configuration, recoverable error, terminal error, and offline/restart recovery.

## 6. Screen contracts

### Create order

Primary pane: market and buy direction (locked to the verified initial market), total budget, start/end, maximum per fill, minimum fill, and maximum effective average price. All token and price fields parse decimal input into shared integer units before calldata is assembled.

Supporting pane: connected wallet/network, current wallet balance, current allowance, required approval delta, cumulative schedule preview, risk/expiry summary, and a two-step `Approve` then `Create order` transaction flow. Copy must state that wallet balance and allowance are not reserved and that execution depends on future market and wallet conditions.

### Orders and order detail

The list prioritizes lifecycle, released/spent progress, remaining budget, next action, and data freshness. The selected detail shows the execution rail: policy terms, current wallet availability, market snapshot, latest deterministic decision, receipt history, allowance action, and cancellation.

Offchain WAIT decisions are visually separate from onchain events. Refresh and restart recovery display source identity and last indexed block rather than implying a live stream when one is unavailable.

### Execution report

The report leads with actual input and actual output. Weighted average price, trading fee, and gas are separate rows. It includes fill count, elapsed duration, failed/reverted attempts, nonce/snapshot provenance, transaction and block explorer links, and explicit source badges. Estimated values must never be styled as settled values.

## 7. Content and state language

Use direct operational language:

- `Approve USDC` rather than `Enable trading`.
- `Create policy` rather than `Start earning`.
- `Waiting: capacity is below the minimum fill` rather than `Bot paused`.
- `Submitted to wallet`, `Submitted onchain`, `Confirmed`, `Failed`, and `Stale` are distinct states.
- `Estimated output` and `Actual output` are never interchangeable.
- `Maximum effective average price` is not called slippage and is not described as a per-match limit.

Every destructive or permission-changing action names its scope: `Cancel order` and `Revoke policy allowance`.

## 8. Accessibility and verification gates

- Target WCAG 2.2 AA contrast and keyboard behavior.
- Visible `:focus-visible` ring uses the accent token plus an offset against both canvas and surface.
- One `h1` per page; landmarks and fieldsets reflect task structure.
- Validation errors are linked with `aria-describedby`; transaction state announcements use a polite live region, while final failures use an assertive alert.
- Icons are supplementary; state and actions always have text labels.
- Tables retain headers and accessible names. Mobile record layouts preserve the same label/value relationships.
- Dates include timezone. Addresses, hashes, and amounts expose full machine-readable values even when visually shortened.
- Automated gates: TypeScript, unit/component tests, browser journey tests at the three target widths, axe checks, React Doctor, production build, and a production check proving React Grab/Scan do not ship.

The design system is successful only when a user can identify what is authorized, what is merely proposed, what was actually settled, and what evidence source supports each state without opening developer tools.
