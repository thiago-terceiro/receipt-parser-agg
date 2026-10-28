---
name: nextjs-performance-audit
description: >-
  Audits and optimizes Next.js 16 App Router, React 19 rendering, bundle size, Core Web Vitals, 
  and Tailwind v4 styles. Use when analyzing slow page loads, fixing re-render cascades in dashboards, 
  investigating INP/LCP/CLS regressions, or preparing production builds.
---

# Next.js 16 & React 19 Performance Audit Runbook

This skill guides performance profiling, Core Web Vitals optimization, React 19 rendering architecture, and bundle auditing for this application.

## Frontend Architecture & Performance Baselines

- **Framework**: Next.js 16 with App Router and Turbopack compiler.
- **Rendering Layer**: React 19 with Server Components (RSC) and streaming.
- **Styling**: Tailwind CSS v4 using inline theme CSS variables (zero runtime CSS-in-JS).
- **Core Targets**:
  - **LCP (Largest Contentful Paint)**: < 2.0s
  - **INP (Interaction to Next Paint)**: < 150ms
  - **CLS (Cumulative Layout Shift)**: 0.00
  - **FCP (First Contentful Paint)**: < 0.9s

---

## Performance Optimization Principles

### 1. RSC Boundaries & Server/Client Isolation
- **Keep Route Layouts Server-Side**:
  `app/[locale]/layout.tsx` and `app/[locale]/page.tsx` must remain Server Components. Do not add `"use client"` at the route page level.
- **Client Boundary Leaves**:
  Push `"use client"` down to interactive leaves:
  - [`contents/home/ReceiptWorkspace.tsx`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/contents/home/ReceiptWorkspace.tsx)
  - [`contents/groceries-dashboard/GroceriesDashboard.tsx`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/contents/groceries-dashboard/GroceriesDashboard.tsx)
- **Zero Node Dependencies in Browser**:
  Heavy server-only packages (e.g. `pdf-to-img`, `@google/genai`, `@supabase/supabase-js` service role) must never leak into client bundles. Next.js enforces `serverExternalPackages: ["pdf-to-img"]` in [`next.config.ts`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/next.config.ts).

### 2. Preventing React 19 Re-render Cascades
In data-heavy views (`ReceiptWorkspaceResultsSection`, `GroceriesDashboard`):
- **Isolate Dialog State**:
  [`ReceiptItemEditorDialog`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/contents/home/ReceiptItemEditorDialog.tsx) must maintain its own local form buffer and only propagate changes to the parent on "Save". Keystrokes in dialog fields must not trigger parent table re-renders.
- **Stable Derived State**:
  Memoize expense totals, category aggregates, and currency conversions with `useMemo`:
  ```typescript
  const categoryTotals = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.price * (item.quantity || 1);
      return acc;
    }, {} as Record<string, number>);
  }, [items]);
  ```
- **Optimistic UI Updates**:
  Apply optimistic item status updates (e.g. marked as purchased/done) immediately in component state, rolling back only on API rejection.

### 3. Layout Stability & Zero Cumulative Layout Shift (CLS)
- **Explicit Media Dimensions**:
  Always pass explicit `width` and `height` to `next/image` when displaying receipt previews or user avatars.
- **Reserved Skeleton Layouts**:
  Use CSS grid/flex skeleton placeholders with matching aspect ratios during OCR extraction rather than popping content into the DOM dynamically.

### 4. Font & Asset Loading
- Rely on system font fallbacks and preload critical SVGs.
- Tailwind v4 uses `@theme inline` inside [`app/globals.css`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/app/globals.css) which eliminates runtime style computation.

---

## Profiling & Validation Checklist

1. **Production Build Validation**:
   Inspect build output for page sizes and First Load JS:
   ```bash
   pnpm run build
   ```
   *Target*: Route page chunks should remain under 120 KB gzip.

2. **Playwright E2E & Axe Accessibility Suite**:
   Verify navigation and full-page audits pass with zero layout shifts or focus trapping:
   ```bash
   pnpm run test:e2e
   ```

3. **Storybook Component Verification**:
   Build Storybook to verify isolated component performance and accessibility addons:
   ```bash
   pnpm run build-storybook
   ```

4. **Telemetry Trace Inspection**:
   Examine frontend spans sent to `/api/otel/v1/traces` in Honeycomb to identify client-side render or fetch bottlenecks.
