# 📊 Benchmark Journal: Receipt Parser & Aggregator AI

**Target Production URL**: `https://receipt-parser-agg.vercel.app`  
**Stack**: Next.js `16.4.6` (App Router + Turbopack), React 19, TypeScript `5.8.3`, Tailwind CSS v4, Google Gemini Flash (`@google/genai`), Supabase PostgreSQL, Upstash Redis, OpenTelemetry + Honeycomb  
**Companion Architecture Log**: [PERFORMANCE_REVIEW.md](./PERFORMANCE_REVIEW.md)

This journal serves as the chronological, reproducible record of frontend web performance (Lighthouse, Core Web Vitals, network waterfall / TTFB, bundle budgets, UI interaction latency), HTTP security headers, and multimodal AI receipt OCR benchmarks (F1 accuracy, schema adherence, latency, and post-inference throughput).

---

## 1. Benchmark Standards Matrix

| Domain | Industry Benchmark / Tool | Key Metrics & Target Thresholds | Execution & Credentials Requirement |
| :--- | :--- | :--- | :--- |
| **Synthetic Web Perf & CWV** | **Google Lighthouse (`13.6.0`)** + **Agentic Browsing** | Perf / A11y / Best Practices / SEO / Agentic (`0–100`), LCP `≤ 2.5s`, FCP `≤ 1.8s`, CLS `≤ 0.1`, TBT `≤ 200ms` (mobile proxy for INP), Speed Index | Local headless Chromium via `pnpm dlx lighthouse` (free; supports `--extra-headers` for authenticated routes) |
| **Interactive Browser CWV & Real INP** | **Playwright Chromium `PerformanceObserver`** + **PageSpeed Insights v5 (CrUX)** | Real Event Timing **INP** (`≤ 200ms`), **LCP** (`≤ 2,500ms`), **CLS** (`≤ 0.1`), plus CrUX p75 field data when available | Playwright runs locally without API keys; `PSI_API_KEY` required when anonymous PSI quota hits `429` |
| **Network & Edge Caching** | **HTTP TTFB + Compression Probe** (`pnpm run bench`) | `n = 5` warmed requests (`min`, `p50`, `p95`, `max`), Brotli (`br`) payload bytes, `x-vercel-cache` (`HIT`/`MISS`) | Reproducible via `scripts/run-benchmarks.ts` |
| **Transport & Header Hardening** | **SecurityHeaders / Mozilla Observatory** | `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Powered-By` absent | Audited programmatically via `auditSecurityHeaders()` in `scripts/run-benchmarks.ts` |
| **Client JS & CSS Budgets** | **Next.js Production Chunk Budget** | `rootMainFiles` gzip KB, total `.next/static/chunks` JS & CSS raw/gzip KB | Audited via `measureNextBundleStats()` after `pnpm run build` |
| **UI Responsiveness (INP)** | **React 19 Profiler Regression Suite** | Re-render isolation, ICU formatter invocation count, `getBoundingClientRect` layout thrashing (`0`), switch latency | Automated via `jest contents/perf-regression.test.tsx` |
| **Multimodal Receipt OCR** | **ReceiptBench / CORD v2 / SROIE Paradigms** | Line-Item Field F1, Price & Category Exact Match, Currency & Schema Adherence (`100%`), `finishReason`, End-to-End Latency, Post-Inference Throughput (`receipts/sec`) | Live OCR requires `GEMINI_API_KEY` (`pnpm run test:e2e:ocr`); deterministic parser throughput runs offline (`runParseAndPiiThroughputBenchmark`) |

### How Core Web Vitals Are Measured

Core Web Vitals (**LCP**, **INP**, **CLS**) are validated across three free, reproducible layers (plus field-telemetry tracking):

1. **Lab Navigation CWV (Google Lighthouse `13.6.0`)**: Captures simulated **LCP**, **CLS**, **FCP**, **TTFB**, **Speed Index**, and **TBT** under mobile (`Slow 4G` + `4x` CPU slowdown) and desktop throttling. Because Lighthouse navigation mode does not click UI controls, it reports **Total Blocking Time (TBT)** as its lab proxy for INP.
2. **Interactive Browser CWV & Real INP (Playwright Chromium `PerformanceObserver`)**: Injects W3C observers (`largest-contentful-paint`, `layout-shift`, and `event` with `durationThreshold: 0`, grouped by `interactionId`) into a live Chromium session while performing real clicks and keyboard (`Escape`) interactions across visible controls to measure true **INP** (`max` interaction duration).
3. **Component-Level INP Guards (`contents/perf-regression.test.tsx`)**: Enforces React 19 `<Profiler>` re-render isolation, memoized ICU formatters, and `0` forced `getBoundingClientRect` reads during state updates.
4. **Field Data Note**: Chrome User Experience Report (**CrUX**) real-user `p75` field data / browser `web-vitals` RUM beacons are not yet collected in `/api/otel/v1/traces` (wiring `web-vitals` to the existing OpenTelemetry endpoint is a zero-cost future option).

---

## 2. Timeline Index

| Date | Commit | Summary | Highlights |
| :--- | :--- | :--- | :--- |
| **[2026-11-24 (Run 3)](#2026-11-24-run-3--static-lcp-shell-native-otlp-telemetry-lean-select--dialog-code-splitting)** | `Phase B` | Static `/en/groceries` hero shell above `<Suspense>`, native `9.1 KB` OTLP/JSON browser telemetry, native-backed `<Select>`, intent month prefetching, & lazy closed dialogs | `/en/groceries` Mobile Perf `32 → 71 → 88` (LCP **`0.8 s`**, FCP **`0.8 s`**, CLS **`0`**, TBT `470 ms`, `454.1 KB`) & Desktop **`99`**, auth `/en` Mobile `90 →` **`98`** (`TBT 170 ms`) & Desktop **`100`**, `/en/invite` Desktop **`100`** (`83–86`–`98` Mobile under CPU variance), zero third-party/app unused JS, `-101` packages (`-239.9 KB` raw / `-73.3 KB` gzip JS) |
| **[2026-11-24 (Run 2)](#2026-11-24-run-2--streaming-ssr-mobile-tbt-reduction-jwt-guard--cookie-jar-auth-benchmarks)** | `17367ef` | Streaming `/en/groceries` SSR, idle OTel/dashboard scheduling, `SUPABASE_JWT_SECRET` guard, & cold-cache Cookie-Jar Lighthouse | `/en/groceries` Mobile Perf `32 → 71` (TTFB `3,720 ms → 30 ms`, TBT `15,380 ms → 490 ms`, SI `13.0 s → 1.2 s`, BP `96 → 100`) & Desktop `99` (`0 ms` TBT), auth `/en` Mobile `90` / Desktop `100`, `/en/invite` Mobile `98` / Desktop `100`, all routes `100` A11y/BP/Agentic, flagged streamed LCP (`4.7 s`) & CDP INP (`208–224 ms`) |
| **[2026-11-24](#2026-11-24--initial-full-stack--ai-baseline-commit-9b28db4)** | `9b28db4` | Initial full-stack FE + AI OCR + Security Header + Auth CWV baseline | Unauth & auth Desktop `99–100` Perf/`100` A11y, real browser INP `88–120 ms` (`CLS = 0`), `gemini-3.8-flash` `F1 = 1.000`, parser `7,339 receipts/sec`, flagged auth `/en/groceries` Mobile SSR TTFB/TBT (`3,720 ms`/`15,380 ms`), local `SUPABASE_JWT_SECRET` mismatch, & missing CSP |

---

## 2026-11-24 (Run 3) — Static LCP Shell, Native OTLP Telemetry, Lean `<Select>` & Dialog Code-Splitting

**Changes Tested**:
- **Hoisted Static `/en/groceries` Hero Shell (`app/[locale]/groceries/page.tsx`, `app/[locale]/groceries/GroceriesDashboardContent.tsx`, `contents/groceries-dashboard/GroceriesDashboard.tsx`, `contents/groceries-dashboard/GroceriesDashboardSummarySection.tsx`)**: Rendered the back-to-home link, eyebrow, and hero description statically **above** `<Suspense>` (`showBackToHome={false}`, `showHeroIntro={false}` inside the streamed dashboard) so Chromium paints the LCP text node once at initial flush instead of replacing it when remote Supabase queries resolve.
- **Native OTLP/HTTP JSON Browser Telemetry (`lib/browser-telemetry.ts`)**: Replaced `@honeycombio/opentelemetry-web` and `@opentelemetry/auto-instrumentations-web` (`-52` packages, eliminating a `206.9 KB` / `61.9 KB` gzip chunk with ~70% unused JS) with a `9.1 KB` (`3domqn3vv5rrf.js`) native `PerformanceObserver` + `fetch` (`traceparent`) + `navigator.sendBeacon` OTLP/JSON exporter targeting `/api/otel/v1/traces`.
- **Lean Native-Backed `<Select>` (`components/ui/select.tsx`)**: Replaced `@radix-ui/react-select` and the `radix-ui` umbrella package (`-49` packages, eliminating a `98.8 KB` / `32.7 KB` gzip chunk with ~66% unused JS) while keeping the exact `<Select>` API, JSX option text extraction (`extractNodeText`), and responsive trigger sizing.
- **Intent-Based Month Prefetch & Lazy Dialog Hydration (`GroceriesDashboardSummarySection.tsx`, `GroceriesDashboard.tsx`, `components/google-auth-controls.tsx`, `components/google-auth-mobile-dialog.tsx`, `contents/home/ReceiptWorkspace.tsx`, `GroceriesDashboardCategoriesSection.tsx`, `GroceriesDashboardRecentReceiptsSection.tsx`)**: Set `prefetch={false}` with `onMouseEnter`/`onFocus` month prefetches, conditionally mounted closed modal dialogs on `/en/groceries`, and split `GoogleAuthMobileDialog` and `ReceiptItemEditorDialog` behind `next/dynamic(..., { ssr: false })`.

### A. Run 1 → Run 2 → Run 3 Progression (Google Lighthouse `13.6.0`, Cold Cache + Cookie Jar)

| Authenticated Route & Preset | Perf (`Run 1 → Run 2 → Run 3`) | A11y | BP | SEO | Agentic | FCP | LCP (`Run 1 → Run 2 → Run 3`) | TBT (`Run 1 → Run 2 → Run 3`) | CLS | SI | Transfer KB (Reqs) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/en/groceries` Mobile | `32 → 71 →` **`88`** (`+56`) | **100** | **100** | **63\*** | **100** | **`0.8 s`** | `6.8 s → 4.7 s →` **`0.8 s`** | `15,380 → 490 →` **`470 ms`** | **`0`** | `1.3 s` | `454.1 KB` (`27`) |
| `/en/groceries` Desktop | `99 → 99 →` **`99`** | **100** | **100** | **63\*** | **100** | **`0.3 s`** | `0.3 → 1.0 →` **`0.9 s`** | `70 → 0 →` **`40 ms`** | **`0`** | `0.6 s` | `454.3 KB` (`27`) |
| `/en` Mobile | `83 → 90 →` **`98`** (`+15`) | **100** | **100** | **100** | **100** | **`1.0 s`** | `0.8 → 0.8 →` **`1.0 s`** | `700 → 390 →` **`170 ms`** | **`0`** | `1.0 s` | `440.5 KB` (`27`) |
| `/en` Desktop | `99 → 100 →` **`100`** | **100** | **100** | **100** | **100** | **`0.3 s`** | `0.3 → 0.2 →` **`0.3 s`** | `90 → 0 →` **`10 ms`** | **`0`** | `0.4 s` | `440.5 KB` (`27`) |
| `/en/invite` Mobile | `83 → 98 →` **`83–86\*\*`** | **100** | **100** | **63\*** | **100** | `0.7 s` | **`0.7–0.8 s`** | `670 → 160 → 550–680 ms** | **`0`** | `1.0 s` | `424.3 KB` (`25`) |
| `/en/invite` Desktop | `100 → 100 →` **`100`** | **100** | **100** | **63\*** | **100** | **`0.2 s`** | **`0.2 s`** | `0 → 0 →` **`20 ms`** | **`0`** | `0.5 s` | `424.0 KB` (`25`) |

*\*Note on SEO `63`*: Intentional `noindex` directive on private `/groceries` and `/invite` routes.  
*\*\*Diagnostic note on `/en/invite` Mobile & Remaining TBT Floor*: Across Run 3 audits (`lighthouse-auth-v5`), **zero application or third-party unused JS remained**—only the shared `71.6 KB` gzip Next.js 16 / React 19 core runtime chunk (`1rx933rm_jjtn.js`, ~`22.9–27.7 KB` unused framework runtime) appeared in `unused-javascript`. `/en/invite` Mobile varied between `97–98` (`160–200 ms` TBT prior to final pass) and `83–86` (`550–680 ms` TBT on `lighthouse-auth-v5` rerun) solely due to Windows headless host CPU scheduling variance on that single `1rx933rm_jjtn.js` React hydration task (`benchmarkIndex ~2,412`), whereas `/en` Mobile hit `98` (`170 ms` TBT) and `/en/groceries` Mobile jumped to `88` (`0.8 s` LCP, `0` CLS).

### B. Real Browser CWV + Interactive INP (Playwright Chromium Cookie Jar, Authenticated `1280×800`)

| Route | Real LCP | Real CLS | Failed HTTP Responses (`>= 400`) | Real INP (`max`) | All Interaction Durations | CWV Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `/en` | **`248 ms`** | **`0`** | `0` (`[]`) | **`168 ms`** | `168, 168, 168 ms` | **PASS** (All Good `≤ 200 ms`) |
| `/en/groceries` | **`1,280 ms`** | **`0`** | `0` (`[]`) | **`264 ms`** | `264, 128, 128, 128, 96, 88, 88, 88, 80, 56 ms` | **Needs Improvement** (`Create board` lazy modal mount `264 ms`; all other interactions `56–128 ms`) |

*Honest limitation*: Deferring `Create board` / `Members` dialog portal mounting reduced initial page hydration cost cleanly, while the first click that opens `Create board` measured `264 ms` under Playwright Event Timing (all subsequent month-switch, dialog, and theme interactions measured `56–128 ms`).

### C. Updated Bundle & CI Gate Snapshot (`next build` + `ci:verify`)
- **Dependencies Removed**: `-101` packages (`@honeycombio/opentelemetry-web`, `@opentelemetry/auto-instrumentations-web`, `@radix-ui/react-select`, `radix-ui`).
- **Bundle Stats**: `26` JS chunks — **`944.87 KB` raw / `292.88 KB` gzip** (down from `1,184.76 KB` raw / `366.17 KB` gzip in Run 2: **`-239.89 KB` raw / `-73.29 KB` gzip**); CSS **`67.51 KB` raw / `12.76 KB` gzip**; `rootMainFiles` `5` chunks (`434.07 KB` raw / `129.06 KB` gzip). Browser telemetry chunk dropped from `206.9 KB` → `9.1 KB` (`-95.6%`).
- **CI & E2E Gates**: `next typegen`, `tsc --noEmit`, `eslint . --max-warnings=0`, `security:check` (`171 files audited, 0 security violations`), `security:audit` (`0 critical / 0 high`), Jest (`63/63` suites, `396/396` tests), and Playwright + Axe WCAG AA/AAA E2E (`6/6` passed).

---

## 2026-11-24 (Run 2) — Streaming SSR, Mobile TBT Reduction, JWT Guard & Cookie-Jar Auth Benchmarks

**Changes Tested**:
- **Streaming SSR (`app/[locale]/groceries/page.tsx`, `app/[locale]/groceries/GroceriesDashboardContent.tsx`)**: Wrapped `GroceriesDashboardContent` in React `<Suspense fallback={<GroceriesDashboardSkeleton />}>` so `/[locale]/groceries` flushes the layout + i18n skeleton immediately without blocking on remote Supabase queries.
- **Legitimate Idle Scheduling (`components/telemetry/TelemetryClient.tsx`, `lib/browser-telemetry.ts`, `contents/groceries-dashboard/GroceriesDashboard.tsx`)**: Scheduled non-critical browser OTel initialization, dashboard snapshot caching, and adjacent-month background prefetches via `window.requestIdleCallback`, and disabled unused XHR / user-interaction OTel auto-instrumentations while retaining Fetch + `WebVitalsInstrumentation`.
- **JWT Placeholder Validation (`lib/supabase-server.ts`, `.env.local`)**: Added `isUsableJwtSecret` (with one-time warning and safe fallback to `SUPABASE_SERVICE_ROLE_KEY` + `X-App-User-Id`) and disabled the local placeholder `SUPABASE_JWT_SECRET` in `.env.local`.
- **Cookie-Jar Lighthouse Methodology**: Attached Lighthouse `13.6.0` directly to Playwright Chromium via `--port=9222 --disable-storage-reset` after injecting the NextAuth session cookie into Chromium's persistent Cookie Jar and clearing the HTTP disk cache (`Network.clearBrowserCache`) prior to each run (eliminating `--extra-headers` client `401` console artifacts while preserving true cold-cache asset downloads).

### A. Before vs. After — Authenticated Protected Routes (Google Lighthouse `13.6.0`, Cold Cache + Cookie Jar)

| Authenticated Route & Preset | Perf (Before → After) | A11y | BP (Before → After) | SEO | Agentic | FCP | LCP (Before → After) | TBT (Before → After) | CLS | SI | TTFB (Before → After) | Bytes (Reqs) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/en/groceries` Mobile | `32` → **`71`** (`+39`) | **100** | `96` → **`100`** | **63\*** | **100** | `1.0 s` | `6.8 s` → **`4.7 s`** | `15,380 ms` → **`490 ms`** (`-96.8%`) | `0` | `1.2 s` | `3,720 ms` → **`30 ms`** (`-99.2%`) | `544.7 KB` (`29`) |
| `/en/groceries` Desktop | **`99`** | **100** | `96` → **`100`** | **63\*** | **100** | `0.2 s` | `1.0 s` | `70 ms` → **`0 ms`** | `0.006` | `0.3 s` | `860 ms` → **`30 ms`** | `544.7 KB` (`29`) |
| `/en` Mobile | `83` → **`90`** | **100** | **100** | **100** | **100** | `0.8 s` | `0.8 s` | `700 ms` → **`390 ms`** | `0` | `0.8 s` | `20 ms` | `540.1 KB` (`27`) |
| `/en` Desktop | `99` → **`100`** | **100** | **100** | **100** | **100** | `0.2 s` | `0.2 s` | `90 ms` → **`0 ms`** | `0` | `0.3 s` | `20 ms` | `540.1 KB` (`27`) |
| `/en/invite` Mobile | `83` → **`98`** | **100** | **100** | **63\*** | **100** | `0.6 s` | `0.6 s` | `670 ms` → **`160 ms`** | `0` | `0.6 s` | `20 ms` | `525.4 KB` (`26`) |
| `/en/invite` Desktop | **`100`** | **100** | **100** | **63\*** | **100** | `0.2 s` | `0.2 s` | `0 ms` | `0` | `0.2 s` | `10 ms` | `525.3 KB` (`26`) |

*\*Note on SEO `63`*: Intentional `noindex` directive on private `/groceries` and `/invite` routes. Zero console errors or Best Practices deductions (`bpFails: []`, `a11yFails: []`) across all 6 audits.  
*Diagnostic note on `/en/groceries` Mobile LCP (`4.7 s`)*: Streaming `<Suspense>` dropped document TTFB to `30 ms`, FCP to `1.0 s`, Speed Index to `1.2 s`, and TBT to `490 ms` (`-96.8%`); however, once remote Supabase queries resolve and stream `<GroceriesDashboardSummarySection />`, its hero `<p>` (`A live category map...`) replaces the `<Suspense>` skeleton and registers as the final LCP candidate (`4.7 s` on simulated Slow 4G).

### B. Real Browser CWV + Interactive INP (Playwright Chromium Cookie Jar, Authenticated)

| Route | Real LCP | Real CLS | Failed HTTP Responses (`>= 400`) | Real INP (`max`) | All Interaction Durations | CWV Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `/en` | **`976 ms`** | **`0`** | `0` (`[]`) | **`208 ms`** | `208, 208, 208, 40, 40, 40 ms` | **Needs Improvement** (INP `> 200 ms`) |
| `/en/groceries` | **`564 ms`** | **`0`** | `0` (`[]`) | **`224 ms`** | `224, 216, 216, 216, 216, 72 ms` | **Needs Improvement** (INP `> 200 ms`) |

*Note on Playwright CDP INP (`208–224 ms`)*: Measured under headless CDP right after `networkidle`; three/five back-to-back synthetic button clicks + `Escape` dispatches clustered around `208–224 ms` (just above the `200 ms` Good threshold) while subsequent interactions dropped to `40–72 ms`. Investigating button/dialog click latency under `requestIdleCallback` overlap remains a clean follow-up target.

### C. Updated Bundle & CI Gate Snapshot (`next build` + `ci:verify`)
- **Bundle Stats**: `23` JS chunks (`1,184.76 KB` raw / `366.17 KB` gzip), CSS `70.08 KB` raw / `13.20 KB` gzip, `rootMainFiles` `5` chunks (`434.07 KB` raw / `128.96 KB` gzip).
- **CI Verification**: `next typegen`, `tsc --noEmit`, `eslint . --max-warnings=0`, `security:check` (`168 files audited, 0 security violations`), Jest (`61/61` suites, `390/390` tests).

---

## 2026-11-24 — Initial Full-Stack & AI Baseline (`commit 9b28db4`)

**Environment**: Windows 11, Node.js `v24.9.0`, Playwright Chromium `chromium-1248`, Google Lighthouse `13.6.0`, Next.js `16.4.6` (Turbopack), target deployment `https://receipt-parser-agg.vercel.app`.

### A. Google Lighthouse `13.6.0` (Live Production)

| Route & Preset | Perf | A11y | Best Practices | SEO | Agentic Browsing | FCP | LCP | TBT | CLS | Speed Index | TTFB | Bytes (Reqs) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/en` Mobile *(idle CPU)* | **77** | **100** | **100** | **100** | **100** | `1.0 s` | `1.0 s` | `1,120 ms` | `0` | `2.5 s` | `30 ms` | `540.5 KB` (`27`) |
| `/en` Desktop | **77** | **100** | **100** | **100** | **100** | `0.4 s` | `0.4 s` | `510 ms` | `0` | `1.4 s` | `30 ms` | `540.4 KB` (`27`) |
| `/en/groceries` Mobile *(concurrent load)* | **72** | **100** | **100** | **63*** | **100** | `1.0 s` | `1.0 s` | `2,040 ms` | `0` | `2.5 s` | `30 ms` | `537.5 KB` (`27`) |
| `/en/groceries` Desktop | **98** | **100** | **100** | **63*** | **100** | `0.3 s` | `0.3 s` | `130 ms` | `0` | `1.0 s` | `50 ms` | `537.5 KB` (`27`) |

*\*Note on `/en/groceries` SEO `63`*: `is-crawlable` intentionally scores `0` because the private groceries dashboard sets `noindex` to keep user workspaces out of search engine indexes.  
*Note on `/en` Mobile*: Initial run under concurrent local background CPU load scored Perf `71` (TBT `2,240 ms`, FCP/LCP `1.2 s`, SI `3.4 s`); idle-CPU rerun above isolated true client main-thread cost at Perf `77` (TBT `1,120 ms`).

#### Lighthouse Diagnostics Breakdown (`/en` Mobile, Idle CPU)
- **Top Long Tasks**:
  - `turbopack-3h_ctkfaeun7f.js`: `373 ms` (`384.6 ms` total bootup, `364.7 ms` scripting)
  - `1qvsm9g1csamq.js`: `242 ms` (`783.3 ms` total bootup, `675.7 ms` scripting)
  - `3bz9l7p0xfo_l.js`: `219 ms` (`277.2 ms` total bootup, `67.4%` unused JS: `43,899 / 65,116 B`)
  - `/en` root document: `209 ms` (`746.0 ms` total)
- **Agentic Browsing Audits (`100`)**:
  - `agent-accessibility-tree`: **PASS (`1`)**
  - `llms-txt`: **PASS (`1`)**
  - `cumulative-layout-shift`: **PASS (`1`)**

### A2. Authenticated Protected Routes — Lighthouse `13.6.0` & Real Browser CWV / INP

Measured against local production (`next start --port 3110`) with `ENABLE_TEST_AUTH=true` and an active NextAuth credentials session cookie (`test`), verifying `/en/groceries` rendered `69,234 B` of `<GroceriesDashboard />` (`isSignInCard: false`).

*Local Supabase JWT finding*: `.env.local` contained a `SUPABASE_JWT_SECRET` key-type mismatch that caused authenticated SSR PostgREST calls on `/en/groceries` to fail with `500 No suitable key or wrong key type`; bypassing that local variable (`SUPABASE_JWT_SECRET=" "`) fell back cleanly to `SUPABASE_SERVICE_ROLE_KEY` + `X-App-User-Id` (`200 OK`).

| Authenticated Route & Preset | Perf | A11y | Best Practices | SEO | Agentic Browsing | FCP | LCP | TBT | CLS | Speed Index | TTFB | Bytes (Reqs) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/en/groceries` Desktop *(Dashboard)* | **99** | **100** | **96\*** | **63\*\*** | **100** | `0.3 s` | `0.3 s` | `70 ms` | `0` | `1.3 s` | `860 ms` | `541.3 KB` (`29`) |
| `/en/groceries` Mobile *(Dashboard)* | **32** | **100** | **96\*** | **63\*\*** | **100** | `3.1 s` | `6.8 s` | `15,380 ms` | `0` | `13.0 s` | `3,720 ms` | `541.3 KB` (`29`) |
| `/en` Desktop *(Authenticated)* | **99** | **100** | **100** | **100** | **100** | `0.3 s` | `0.3 s` | `90 ms` | `0` | `0.6 s` | `20 ms` | `540.0 KB` (`27`) |
| `/en` Mobile *(Authenticated, retry)* | **83** | **100** | **100** | **100** | **100** | `0.8 s` | `0.8 s` | `700 ms` | `0` | `1.5 s` | `40 ms` | `540.0 KB` (`27`) |
| `/en/invite` Desktop *(Authenticated)* | **100** | **100** | **100** | **63\*\*** | **100** | `0.2 s` | `0.2 s` | `0 ms` | `0` | `0.5 s` | `10 ms` | `525.5 KB` (`26`) |
| `/en/invite` Mobile *(Authenticated)* | **83** | **100** | **100** | **63\*\*** | **100** | `0.6 s` | `0.6 s` | `670 ms` | `0` | `1.9 s` | `20 ms` | `525.5 KB` (`26`) |

*\*Note on Best Practices `96` (`/en/groceries`)*: `errors-in-console` logged a single `401 Unauthorized` on background fetch `GET /api/expenses?boardId=d4ac0e38-f2f4-4586-b6a4-c2c2bae30478&month=2026-10` because Lighthouse `--extra-headers` sends the `Cookie` on navigation/document requests without populating Chromium's Cookie jar for client-side sub-fetches (using a Playwright/CDP authenticated browser profile avoids this artifact).  
*\*\*Note on SEO `63` (`/en/groceries`, `/en/invite`)*: Intentional `noindex` robots directive on private workspace and invite routes.  
*Diagnostics on Authenticated `/en/groceries` Mobile (`Perf 32`)*: Remote Supabase SSR query latency raised document TTFB (`860 ms` Desktop / `3,720 ms` Mobile throttled), while mobile `4x` CPU throttling amplified main-thread hydration and `styleLayout` work (`3tosw9t8_0fdw.js` `2,455 ms` long task; `scriptEvaluation` `7,738 ms`, `styleLayout` `4,486 ms`).

#### Real Browser Core Web Vitals & Interactive INP (Playwright Chromium Event Timing API, Authenticated)

| Authenticated Route | Real LCP | Real CLS | Interactions Triggered | Real INP (`max`) | All Interaction Durations | CWV Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `/en` | **`356 ms`** | **`0`** | `6` | **`120 ms`** | `120, 96, 72, 72, 56, 48 ms` | **PASS** (All Good) |
| `/en/groceries` *(Dashboard)* | **`932 ms`** | **`0`** | `6` | **`88 ms`** | `88, 80, 56, 48, 48, 48 ms` | **PASS** (All Good) |

### B. Live Production Network TTFB & Edge Caching (`n = 5` warmed requests, Brotli `br`)

| Endpoint | HTTP Status | Min TTFB | p50 TTFB | Max TTFB | Decoded Body | Vercel Cache | `Cache-Control` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `/en` | `200` | `192.1 ms` | `318.4 ms` | `447.9 ms` | `57,819 B` | `MISS` | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/pt-br` | `200` | `176.7 ms` | `184.9 ms` | `249.1 ms` | `58,276 B` | `MISS` | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/es` | `200` | `172.9 ms` | `197.4 ms` | `258.8 ms` | `58,680 B` | `MISS` | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/en/groceries` | `200` | `171.2 ms` | `175.2 ms` | `187.3 ms` | `50,110 B` | `MISS` | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/llms.txt` | `200` | `30.5 ms` | `42.6 ms` | `76.4 ms` | `1,476 B` | `HIT` | `public, max-age=0, must-revalidate` |
| `/.well-known/mcp.json` | `200` | `31.2 ms` | `35.3 ms` | `40.4 ms` | `1,675 B` | `HIT` | `public, max-age=3600` |

### C. HTTP Security Headers Scorecard (`/en` Live Prod)

**Score**: `6 / 7` (`86%`)
- **Present / Hardened**:
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
  - `X-Powered-By`: absent (`null`)
- **Missing**:
  - `Content-Security-Policy`: absent (`null`)

### D. Local Production Bundle Budget (`.next/static/chunks/`, Next.js `16.4.6` Turbopack)

- **`rootMainFiles`**: `5` chunks — **`434.07 KB` raw / `128.96 KB` gzip**
- **All JS Chunks**: `23` chunks — **`1,184.50 KB` raw / `366.07 KB` gzip**
  - Top 4 gzipped chunks: `71.58 KB` (`228.81 KB` raw), `61.87 KB` (`202.05 KB` raw), `45.43 KB` (`166.03 KB` raw), `38.70 KB` (`109.96 KB` raw)
- **All CSS Chunks**: **`69.65 KB` raw / `13.14 KB` gzip**

### E. UI Render & Interaction Latency (`contents/perf-regression.test.tsx`)

- **Dialog toggle**: `ReceiptWorkspaceResultsSection` renders `0`, `formatCurrency` calls `0`, `formatCategoryLabel` calls `11`.
- **Purchase date edit**: `ReceiptWorkspaceResultsSection` renders `1`, `formatCurrency` calls `0`, unchanged row renders `0`.
- **Remove last item**: `ReceiptWorkspaceResultsSection` renders `1`, unchanged row renders `0`.
- **Category switching**: `17.67 ms` switch latency, `0` `getBoundingClientRect` layout reads.
- **Create Board modal typing**: `<Select>` renders `0`.

### F. AI & Multimodal Receipt OCR Benchmarks

1. **Deterministic Post-Inference Sanitizer + Parser Throughput** (`redactFinancialPii` + `parseReceiptExtraction`, 40-item receipt containing PAN + CVV + chat template markers, `2,000` iterations):
   - Total time: `272.53 ms`
   - Per receipt: **`0.136 ms/receipt`**
   - Sustained throughput: **`7,339 receipts/sec`**

2. **Live Gemini Multimodal OCR Evaluation** (`scripts/test-live-gemini-ocr.ts`, `37,492 B` simulated grocery receipt PNG — 3 items + subtotal + total):

| Model ID | HTTP Status | Upstream Status / `finishReason` | End-to-End Latency | Schema Adherence | Line-Item F1 | Price Exact Match | Category Exact Match | Currency (`EUR`) | Notes |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `gemini-3.8-flash` | `200` | `STOP` (`341 B` JSON) | `25,883 ms` | `100%` | **`1.000`** (`3/3` P & R) | `3/3` (`2.49`, `3.20`, `1.80`) | `3/3` (`dairy`, `bakery`, `produce`) | `100%` | Elevated upstream latency during spike; excluded `SUBTOTAL`/`TOTAL` cleanly |
| `gemini-flash-latest` | `502` | Upstream `503 UNAVAILABLE` | `2,797 ms` | — | — | — | — | — | Transient Google AI Studio high-demand spike surfaced as `502` without retry/fallback |
| `gemini-2.5-flash` | `502` | Upstream `404 NOT_FOUND` | `997 ms` | — | — | — | — | — | Deprecated for new users in favor of `gemini-3.8-flash` |

### G. External Cloud Runners & Field Telemetry Status
- **PageSpeed Insights API v5**: Anonymous endpoint returned HTTP `429` (`Quota exceeded` on shared consumer project); configure `PSI_API_KEY` for automated CrUX + PSI runs.
- **Field Telemetry (RUM / CrUX)**: Real-user `p75` Core Web Vitals (`web-vitals` beacons) are not yet emitted to `/api/otel/v1/traces`; current CWV verification combines Lighthouse lab diagnostics with Playwright Event Timing measurements.

### H. Actionable Findings & Improvement Backlog
1. **Reduce Mobile TBT (`1,120 ms` public `/en`, `15,380 ms` auth `/en/groceries`) & SSR TTFB**: Profile unused JS (`67.4%` in chunk `3bz9l7p0xfo_l.js`), client hydration/layout work (`3tosw9t8_0fdw.js`, `styleLayout`), and stream/cache remote Supabase SSR board queries on `/en/groceries`.
2. **Verify `SUPABASE_JWT_SECRET` Signing Configuration**: Confirm the deployed and local `SUPABASE_JWT_SECRET` matches Supabase PostgREST's JWT key algorithm so scoped RLS client requests do not fail with `No suitable key or wrong key type`.
3. **Add Resilient AI Retry & Fallback + Clean Error Mapping**: Add bounded exponential backoff + model fallback (`gemini-flash-latest` -> `gemini-3.8-flash`) on transient `503`/`429` provider spikes, and map raw provider error JSON to sanitized user-facing messages.
4. **Add `Content-Security-Policy` Header**: Configure CSP in `next.config.ts` to move HTTP Security Headers from `6/7` (`86%`) to `7/7` (`100%` / `A+`).
5. **Expand Multi-Receipt OCR Corpus**: Add real/noisy photo fixtures, multi-page PDFs, and multilingual receipts (`en`, `pt-BR`, `es`) to compute corpus-level p50/p95 latency and field-extraction F1.

---

## 3. How to Reproduce & Append Future Journal Entries

1. **Run the unified benchmark suite** (network TTFB, security headers, `.next` bundle budget, parser throughput, plus optional live OCR & Lighthouse):
   ```bash
   pnpm run build                                      # Refresh .next bundle stats
   pnpm run bench -- --skip-lighthouse --skip-ocr      # Fast offline/edge probe
   pnpm run bench                                      # Full run including live OCR + Lighthouse Mobile
   ```
2. **Run full Lighthouse Mobile + Desktop audits (public and authenticated protected routes)**:
   ```bash
   pnpm dlx lighthouse https://receipt-parser-agg.vercel.app/en --output=json --output-path=test-results/lh-mobile.json --chrome-flags="--headless=new --no-sandbox"
   pnpm dlx lighthouse https://receipt-parser-agg.vercel.app/en --preset=desktop --output=json --output-path=test-results/lh-desktop.json --chrome-flags="--headless=new --no-sandbox"
   # For protected routes (/en/groceries, /en/invite), sign in via NextAuth credentials to obtain a session cookie file and pass --extra-headers=auth-headers.json (or reuse an authenticated Chromium profile with --disable-storage-reset).
   ```
3. **Run targeted UI INP, real-browser Event Timing CWV, and live Gemini OCR checks**:
   ```bash
   pnpm exec jest contents/perf-regression.test.tsx
   GEMINI_MODEL_ID=gemini-3.8-flash pnpm run test:e2e:ocr
   ```
