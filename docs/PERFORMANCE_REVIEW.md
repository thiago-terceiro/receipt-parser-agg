# ⚡ Performance & Architectural Review: Receipt Parser Agg

**Status**: Verified & Actively Tracked  
**Framework**: Next.js 16.4.3 (App Router + Turbopack), React 19, TypeScript 5.8, Tailwind CSS v4  
**Data & Storage**: Supabase (PostgreSQL), Redis (Upstash)  
**Observability**: Honeycomb, OpenTelemetry (Client & Server)

This document serves as the chronological, per-date record of performance audits, optimizations, root-cause rationales, measured before/after impacts, and reproduction steps for `receipt-parser-agg`.

> **Benchmark Journal**: See [BENCHMARK_JOURNAL.md](./BENCHMARK_JOURNAL.md) for chronological Lighthouse, Core Web Vitals, TTFB, security header, and live AI OCR benchmark runs.

---

## Timeline Index

| Date | Scope | Commits | Test Baseline |
| :--- | :--- | :--- | :--- |
| **[2026-11-16](#2026-11-16--multi-stream-performance-pass-bundle-ui-render-server-data-extract)** | Bundle/OTEL/fonts/i18n split, React render isolation, DB round-trips & RLS InitPlan, OCR PDF pipelining | `9c602aa`, `977cd03`, `3f7d850`, `3a5beb2`, `abee815` | 58 suites / 335 tests |
| **[2026-11-02](#2026-11-02--icu-caching-on-aggregation--row-memoization)** | ICU formatter caches, single-pass `O(N)` groceries aggregation, currency/row memoization, React 19 ref hygiene | `9a0ae0f` | 55 suites / 312 tests |
| **[2026-10-31](#2026-10-31--dialog-state-isolation--dashboard-memoization)** | Isolated editor dialog state, memoized dashboard sections, initial OCR payload improvements | `483457d` | — |
| **[2026-10-16](#2026-10-16--initial-performance--architectural-review)** | Object URL previews, zero-CLS responsive tables, initial PDF concurrency cap, receipt indexes, invite hardening | `0b3873c` | 38 suites / 173 tests |

---

## 2026-11-16 — Multi-Stream Performance Pass (`bundle`, `ui-render`, `server-data`, `extract`)

**Commits**: `9c602aa`, `977cd03`, `3f7d850`, `3a5beb2`, `abee815`  
**Why**: Even after component memoization, profiling showed four structural bottlenecks: (1) eager client bootstrap JS from OpenTelemetry, all-locale/all-namespace translations, external Google Fonts CSS, and a server `Buffer` polyfill dragged into client chunks; (2) unstable props/effects and Framer Motion FLIP layout measurements re-rendering unchanged workspace rows and dashboard views; (3) per-query HMAC JWT re-signing, duplicate board resolution round-trips, and unindexed RLS policy predicates on Supabase; and (4) full-buffer base64/data-URL copies plus non-pipelined PDF extraction in `/api/extract`.

### 1. Client Bundle, Critical Path & i18n Payload (`9c602aa`, `977cd03`)

- **Deferred Browser OpenTelemetry (`lib/browser-telemetry.ts`, `components/telemetry/TelemetryClient.tsx`, removed `instrumentation-client.ts`)**:
  - *Why*: Next.js bundles `instrumentation-client.ts` directly into `rootMainFiles`, forcing every visitor to download and parse the Honeycomb/OpenTelemetry Web SDK before hydration.
  - *How*: Moved SDK initialization into `lib/browser-telemetry.ts` and dynamically imported it inside `TelemetryClient`'s `useEffect` post-mount.
  - *Impact*: `rootMainFiles` reduced from **646.64 KB → 433.26 KB** (`-213.38 KB` / `-33.0%`).
- **Self-Hosted Fonts (`app/layout.tsx`, `app/globals.css`)**:
  - *Why*: External Google Fonts `@import` + `<link rel="preconnect">` added render-blocking cross-origin CSS/font round-trips.
  - *How*: Switched to `next/font/google` (`Plus_Jakarta_Sans` → `--font-sans`, `JetBrains_Mono` → `--font-mono`, `display: "swap"`).
- **Decoupled Provider & Initial Theme Reflow (`context/AppSessionProvider.tsx`, `context/ThemeProvider.tsx`)**:
  - *Why*: `AppSessionProvider` imported `@/lib/receipt`, dragging OCR/receipt helpers into the root layout bundle; `ThemeProvider` unconditionally called `disableAnimation()` (style injection + `getComputedStyle(document.body)` forced reflow) on mount.
  - *How*: Passed `defaultModelId` (`"gemini-flash-latest"`) from `app/layout.tsx` as a prop, and added `isDocumentThemeSynced` so initial mount skips forced reflow when `themeBootScript` has already synchronized `<html>`.
- **Per-Locale & Per-Route i18n Splitting (`i18n/request.ts`, `lib/i18n/dictionaries/*`, `lib/i18n/messages-client.ts`, route layouts)**:
  - *Why*: Client components previously imported from modules referencing `next-intl/server`, `@/app/metadata`, and `@/lib/receipt`, and `NextIntlClientProvider` serialized the entire locale dictionary to every route.
  - *How*: Split dictionaries per locale (`en.ts`, `es.ts`, `pt-BR.ts`) loaded dynamically in `i18n/request.ts`, introduced client-safe `lib/i18n/messages-client.ts`, and centralized `routeMessageNamespaces` in `lib/i18n/dictionaries/index.ts` for `app/[locale]/layout.tsx`, `page.tsx`, `groceries/layout.tsx`, and `invite/layout.tsx`.
  - *Impact*: Serialized `en` RSC `messages` payload dropped from **11,249 B** to **6,443 B** on `/[locale]` (`-42.7%`), **9,861 B** on `/[locale]/groceries` (`-12.3%`), and **8,969 B** on `/[locale]/invite` (`-20.3%`). Verified all 239 keys match across `en`, `es`, and `pt-BR` and all component references match their route namespaces via `lib/i18n/dictionaries/index.test.ts`.
  - *Initial Client JS Savings (`rootMainFiles` + route client manifest)*: `-202.12 KB` (`-20.4%`) on `/[locale]`, `-202.12 KB` (`-18.3%`) on `/[locale]/groceries`, and `-226.32 KB` (`-23.8%`) on `/[locale]/invite` (with `@/lib/receipt` + `Buffer` polyfill removed from `/invite`).

### 2. UI Rendering & Interaction Latency / INP (`3f7d850`)

- **Stabilized Props & Sub-Section Memoization (`contents/home/ReceiptWorkspace.tsx`, `ReceiptWorkspaceResultsSection.tsx`)**:
  - *Why*: Passing a fresh `dashboardHref` object literal and depending `/api/boards` fetching on `result` identity caused extra board reloads and broke `memo(ReceiptWorkspaceResultsSection)`. Inside `ReceiptWorkspaceResultsSection`, computed negative `manualIndex` values (`-30..-2` → `-29..-1`) shifted on item deletion, invalidating `React.memo` on every remaining row.
  - *How*: Memoized `dashboardHref` via `useMemo`, derived `hasResult = result !== null` for `/api/boards`, synced `extractedItemCountRef` inside `useEffect`, split `ReceiptWorkspaceResultsSection` into memoized `ReceiptPreviewCard`, `ReceiptExtractedItemsPanel`, and `ReceiptSaveFooter`, and passed constant `manualIndex = -1` for extracted rows.
- **Keyed Editor Body (`contents/home/ReceiptItemEditorDialog.tsx`)**:
  - *How*: Extracted `ReceiptItemEditorBody` keyed by `${editorState.mode}:${editorState.index ?? "new"}`, eliminating the mount `useEffect` state-sync double-render, and memoized `categoryOptions`.
- **Removed JS Layout Projections (`contents/groceries-dashboard/GroceriesDashboardCategoriesSection.tsx`, `GroceriesDashboardParts.tsx`, `GroceriesDashboardSummarySection.tsx`)**:
  - *Why*: `<LayoutGroup>`, per-card `<motion.div layout>`, 220 ms exit-blocking `<AnimatePresence mode="wait">`, and JS-driven width animations forced FLIP `getBoundingClientRect` measurements and delayed category switching.
  - *How*: Replaced with CSS `transition-[width]` (`duration-300`/`duration-500 ease-out`) so category panels switch immediately without layout thrashing.
- **Isolated Board Modal Inputs (`contents/groceries-dashboard/GroceriesDashboardBoardsPanel.tsx`)**:
  - *How*: Extracted memoized `CreateBoardDialog`, `InviteBoardDialog`, and `MembersBoardDialog` owning local input/error state and keyed `GroceriesDashboardBoardsPanelContent` by `activeBoard.id`, stopping `<Select>` re-renders on every keystroke.
- **Measured Evidence (`contents/perf-regression.test.tsx`, 30 extracted items / 3 categories / 2 boards)**:
  - Open + close item editor dialog: `ReceiptWorkspaceResultsSection` renders **2 → 0**, `formatCurrency` calls **242 → 0**, `formatCategoryLabel` calls **22 → 11**.
  - Purchase date edit: `formatCurrency` calls **121 → 0** (only `ReceiptSaveFooter` re-renders).
  - Remove last extracted item: `ReceiptWorkspaceResultsSection` wrapper renders **3 → 1**, `formatCurrency` calls **351 → 117**, unchanged 58 row/card instances (29 mobile + 29 desktop) `formatCategoryLabel` calls **58 → 0**.
  - Typing 16 characters into Create Board dialog: `<Select>` renders **16 → 0**.
  - Category switching: `getBoundingClientRect` calls reduced to **0**.

### 3. Server Data Layer, Auth & Database Schema (`3a5beb2`)

- **Cached JWT Reuse & LRU Client Cache (`lib/supabase-server.ts`)**:
  - *Why*: `scopedClientCache` cached the Supabase client instance, but `accessToken()` still executed HMAC-SHA256 `createSignedUserJwt` on every Supabase query.
  - *How*: Reused cached `currentJwt` until within the 60 s refresh buffer (`N` queries → **1** JWT signing within TTL) and bounded `scopedClientCache` (`MAX_SCOPED_CLIENT_CACHE_SIZE = 500`, LRU eviction, strictly keyed by `userId`).
- **Query Parallelization & Round-Trip Elimination (`lib/boards-server.ts`, `lib/groceries-server.ts`, `lib/auth-db.ts`, `auth.ts`)**:
  - `requireBoardAccess`: parallelized `ensureBoardProfile`, `loadMembership`, and `loadBoardRecord` via `Promise.all` (**3 sequential DB RTs → 1 parallel batch**; re-checks membership only if email-conflict merges `userId`).
  - `resolveActiveBoardForIdentity` & `listBoardsForIdentity`: parallelized profile ensure + board listing; replaced `setLastActiveBoardForIdentity → requireBoardAccess` with direct `persistLastActiveBoardRpc` (**removes 3 sequential RTs** on active board sync).
  - `listBoardMembersForResolvedBoard`: added `{ skipBoardCheck?: boolean }` (used by `listBoardMembersForIdentity` and `loadGroceriesDashboardData` for **-1 DB RT**) and short-circuited when `membershipRows.length === 0`.
  - `getPendingBoardInviteDetails`: collapsed 2 sequential `board_invites` queries into 1 `.eq("invite_token_hash", tokenHash).maybeSingle()`.
  - `acceptBoardInviteForIdentity`: parallelized profile ensure + pending invite load, and `profiles.update` + `boards.select`.
  - `persistGroceriesEntries` & `persistExtractedReceipt`: added `resolveWritableBoardContext` to call `requireBoardAccess` or `resolveBoardSelection` once (**cuts 5–9 DB RTs** per expense/receipt write); parallelized `deleteSavedReceipt` deletes (**2 RTs → 1 batch**).
  - `registerUser` & `authorize` fallback: parallelized independent existence checks across `user_credentials` and `profiles`.
- **Composite Indexes & RLS `InitPlan` Migration (`supabase/migrations/202611120001_optimize_indexes_and_rls_initplan.sql`)**:
  - *How*: Added 5 composite indexes (`board_members_user_id_status_idx`, `board_members_board_status_joined_idx`, `grocery_entries_board_created_idx`, `grocery_entries_board_category_idx`, `extracted_receipts_board_created_idx`), enforced `FORCE ROW LEVEL SECURITY` on all 7 public tables, and wrapped `app_private.current_app_user_id()` in `(select ...)` InitPlan inside `app_private.user_has_board_role` and RLS policies (preserving `security definer`, `set search_path = public, pg_temp`, `EXISTS`, and revoked `public, anon`).
  - *Note*: Migration is committed in `supabase/migrations/` and has **not yet been applied** to a live Supabase project.

### 4. Receipt Extraction & PDF Pipeline (`abee815`)

- **Zero-Copy Gemini Payload & Streaming Upload Cap (`app/api/extract/route.ts`)**:
  - *Why*: Image uploads copied `Uint8Array` into a `Buffer`, encoded base64 into a concatenated `data:` URL string, and immediately ran a regex to strip the `data:` prefix back off; missing `Content-Length` headers could also delay rejection past multipart buffering.
  - *How*: Encoded raw base64 directly into `inlineData.data` (building the `data:` URL lazily only on the HF fallback), passed `new Uint8Array(bytes)` to `pdf-to-img` without an extra `Buffer.from` copy, cached `InferenceClient` by `HF_TOKEN`, and added `parseBoundedFormData()` enforcing a streaming 12 MB cap (`413` even without `Content-Length`) while keeping the 10 MB file ceiling, `gemini-flash-latest`, `responseJsonSchema`, `<= 5` PDF pages / scale `<= 3`, Upstash rate limits, and PII prohibition intact.
- **Pipelined PDF Extraction (`app/api/extract/route.ts`)**:
  - *How*: Overlapped sequential `document.getPage()` rasterization with bounded-concurrency AI extraction (`cap 2` via `Promise.race`), preserving page order in pre-indexed arrays, dropping page base64 references once parsed, and guaranteeing `document.destroy()` in `finally`.
- **Client Polyfill Elimination & Parse Fast-Path (`lib/receipt.ts`)**:
  - *Why*: `buildDataUrl` referenced `Buffer.from(...)` in `lib/receipt.ts`, causing Turbopack to include the ~20 KB `Buffer` polyfill in client bundles for pages importing `formatCategoryLabel` or receipt types.
  - *How*: Removed unused `buildDataUrl` from `lib/receipt.ts` (0 remaining references), precomputed `defaultReceiptPrompt` at module load, added a `JSON.parse` fast-path in `parseReceiptJson` ahead of fence/regex/`jsonrepair` fallbacks, and dropped a redundant whitespace regex in `normalizeItemName`.
- **Measured Evidence (Node 24 + `tsx` benchmarks)**:
  - 5 MB image base64 encode+strip ×20: **133.10 ms → 52.95 ms** (`2.51x` faster; avoids 5 MB copy + ~13.3 MB data-URL + ~13.3 MB regex copy per image).
  - 5-page PDF (400 ms simulated AI/page, 3 warmed runs): **3198.5 / 3038.8 / 2999.8 ms → 2269.9 / 2815.0 / 2487.5 ms**; peak in-flight page payloads reduced from **5 → 2**.
  - `parseReceiptExtraction` (40 items) + `buildReceiptPrompt` + `normalizeItemName` ×10,000: **125.66 ms → 111.86 ms**.

---

## 2026-11-02 — ICU Caching, `O(N)` Aggregation & Row Memoization

**Commit**: `9a0ae0f`  
**Why**: Every rendered price row and month header re-instantiated `Intl.NumberFormat` / `Intl.DateTimeFormat`, `buildGroceriesMonthPayload` scanned receipt entries more than 15 times, opening the currency selector re-rendered the whole results table, and explicit `prefetch={true}` props leaked non-boolean DOM attributes onto `<a>` elements via Radix `Slot`.

- **ICU Formatter Caching (`lib/currency.ts`, `lib/groceries.ts`)**:
  - Added `currencyFormatterCache` (`${locale}:${currencyCode}`) for `Intl.NumberFormat` and `monthFormatterCache` (`${locale}`) for `Intl.DateTimeFormat`, instantiating each formatter once per locale/currency pair.
- **Single-Pass Linear `O(N)` Groceries Aggregation (`lib/groceries.ts`)**:
  - Replaced >15 multi-pass `filter`/`reduce`/`map` scans in `buildGroceriesMonthPayload` with a single loop accumulating `monthTotal`, `totalItemCount`, distinct `receiptIds`, `uniqueItemIds`, and per-category groups in one pass while preserving exact floating-point parity (`share: monthTotal > 0 ? roundedCatTotal / monthTotal : 0`).
- **Workspace Component Isolation (`contents/home/ReceiptWorkspaceResultsSection.tsx`, `ReceiptWorkspace.tsx`)**:
  - Extracted isolated `ReceiptCurrencySelector` (local dropdown state & keyboard/outside-click listeners) and memoized `ReceiptItemRow` / `ReceiptItemMobileCard` with `React.memo`.
  - Moved `displayedItemsRef` and `manualItemsRef` updates in `ReceiptWorkspace.tsx` from render body into `useEffect` for React 19 `react-hooks/refs` compliance.
- **Dashboard Memoization & DOM Cleanup (`contents/groceries-dashboard/GroceriesDashboardParts.tsx`, `GroceriesDashboardSummarySection.tsx`, `<Link>` call sites)**:
  - Memoized `CategorySummaryCard` and `StatsGrid`; memoized `getMonthProgress(payload.month)` with `useMemo`.
  - Removed explicit `prefetch={true}` on `next-intl` `<Link>` elements across `app/[locale]/page.tsx`, `GroceriesDashboard.tsx`, `GroceriesDashboardEmptyState.tsx`, `GroceriesDashboardSummarySection.tsx`, and `InviteAcceptanceCard.tsx`, eliminating `Received true for a non-boolean attribute prefetch` React warnings.
- **Verification**: `tsc --noEmit` (0 errors), `eslint .` (0 warnings/errors), `jest --runInBand` (55/55 suites, 312/312 tests), `next build` Turbopack clean.

---

## 2026-10-31 — Dialog State Isolation & Dashboard Memoization

**Commit**: `483457d`  
**Why**: Typing inside the item editor dialog triggered workspace-level re-renders, unmemoized dashboard sections recomputed on unrelated parent updates, and OCR payload normalization performed redundant work.

- Isolated dialog form state in `contents/home/ReceiptItemEditorDialog.tsx` and trimmed redundant callbacks/state updates in `contents/home/ReceiptWorkspace.tsx`.
- Wrapped dashboard and workspace section components (`GroceriesDashboardBoardsPanel`, `GroceriesDashboardCategoriesSection`, `GroceriesDashboardRecentReceiptsSection`, `GroceriesDashboardSummarySection`, `ReceiptWorkspaceResultsSection`, `ReceiptWorkspaceUploadSection`) in `React.memo`.
- Hardened OCR payload normalization and upload handling in `app/api/extract/route.ts`, `lib/receipt.ts`, and `lib/receipt-upload.ts`.

---

## 2026-10-16 — Initial Performance & Architectural Review

**Commit**: `0b3873c`  
**Baseline**: 38 test suites (173 tests), Next.js 16.2.6 (Turbopack), 24 static pages generated.

| Dimension | Prior State | Optimized State | Impact |
| :--- | :--- | :--- | :--- |
| **Image Previews** | Main-thread `FileReader.readAsDataURL` base64 encoding | Instant `URL.createObjectURL(file)` with `revokeObjectURL` cleanup | 0 ms thread freeze, reduced heap pressure for 10 MB+ images |
| **Mobile Hydration (CLS)** | `window.matchMedia` hook driving `isCompactResults` state | Responsive CSS utilities (`hidden sm:table`, `sm:hidden`) | Zero hydration layout shift (CLS = 0.00) |
| **PDF Extraction Concurrency** | Sequential or unbounded extraction with 15 s timeout | Batched concurrency cap of 2 + `export const maxDuration = 60` | Prevents serverless memory exhaustion and 504 timeouts |
| **Database Query Efficiency** | Unindexed `(board_id, receipt_id)` & sequential duplicate `resolveBoardSelection` | Migration `202605160001_grocery_entries_receipt_index.sql` + single resolution in `loadGroceriesMonthData` | Eliminates duplicate round-trips (~50% query latency reduction) |
| **Invite Flow Resilience** | Token burn risk on GET / SSR + 404 on revisit | Explicit user-triggered POST, crawler-safe SSR metadata, idempotent recovery (`409`/`410`/`404`) | 100% crawler-safe, instant board redirect if already accepted |
| **Client Caching** | Full network refetch on board/month switch | LocalStorage snapshot caching + memoized formatters | `<16 ms` perceived board/month switching |
| **API Caching & Security** | Uncached responses + unconstrained telemetry payloads | `Cache-Control: private, no-cache`, trusted IP header order, 256 KB OTel body cap | CDN protection for private data, DoS resistance |

---

## How to Reproduce & Verify

All performance guarantees in this repository are backed by automated type, lint, unit/Profiler, and production bundle checks rather than ad-hoc estimates.

### 1. Full CI & Build Verification Gate

Run from the repository root (on Windows PowerShell, use `npm.cmd` and `;` instead of `&&`, or run inside `cmd.exe /c`):

```bash
npm run type-check   # Strict TypeScript check (tsc --noEmit)
npm run lint         # ESLint 9 + React 19 hooks rules (eslint .)
npm test             # Jest unit, API, a11y, and React Profiler suites (58 suites / 335 tests)
npm run build        # Next.js 16.4.3 Turbopack production build
```

### 2. Targeted Performance Regression Suites

Reproduce specific metrics per area using individual Jest test suites:

- **UI Render & Memoization Counts** (`contents/perf-regression.test.tsx` — measures `React.Profiler` render counts, `formatCurrency` / `formatCategoryLabel` invocations, keystroke isolation, and `getBoundingClientRect` calls):
  ```bash
  npx jest contents/perf-regression.test.tsx
  ```
- **i18n Bundle Namespace Completeness & Parity** (`lib/i18n/dictionaries/index.test.ts`, `lib/i18n/messages-client.test.ts`):
  ```bash
  npx jest lib/i18n/
  ```
- **Database Round-Trips, Parallelization & Cached JWT Reuse** (`lib/supabase-server.test.ts`, `lib/boards-server.test.ts`, `lib/groceries-server.test.ts`):
  ```bash
  npx jest lib/supabase-server.test.ts lib/boards-server.test.ts lib/groceries-server.test.ts
  ```
- **Extraction Pipeline Pipelining, Raw Base64 & Streaming Caps** (`app/api/extract/route.test.ts`, `lib/receipt.test.ts`):
  ```bash
  npx jest app/api/extract/route.test.ts lib/receipt.test.ts
  ```

### 3. Production Client Chunk Inspection

After `npm run build`, inspect `.next/static/chunks/` and the generated route manifests under `.next/server/app/[locale]/` to verify `rootMainFiles` size, dynamic telemetry chunk separation (`lib/browser-telemetry`), and serialized `messages` payload size per route.

### 4. Database Migration Verification (Supabase)

Before deploying `supabase/migrations/202611120001_optimize_indexes_and_rls_initplan.sql` to a remote project, run the project's migration preflight checks:

```bash
npm run db:check    # Runs Supabase lint + db push --dry-run
npm run db:deploy   # Interactive deployment after preflight passes
```

Once applied, verify index usage and `(select app_private.current_app_user_id())` InitPlan evaluation in Postgres via `EXPLAIN (ANALYZE, BUFFERS)` against `grocery_entries`, `extracted_receipts`, and `board_members`.
