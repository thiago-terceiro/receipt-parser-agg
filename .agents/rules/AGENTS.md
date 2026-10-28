# Security and Performance Project Rules

## 1. Security Guardrails

- **Row-Level Security (RLS)**:
  - All Supabase tables MUST have RLS enabled and forced (`alter table public.<name> force row level security;`).
  - Sensitive credential tables (`public.user_credentials`) MUST have zero public/authenticated RLS policies; server-only access via `service_role`.
  - All `security definer` stored procedures MUST declare `set search_path = public, pg_temp;` and revoke execute permissions from `public`, `anon`, and `authenticated`.
- **API Boundary Protection**:
  - Request bodies MUST be capped using streaming readers that abort on size overflow (e.g. 256 KB for telemetry, 10 MB for receipt uploads).
  - Rate limiting via Upstash Redis sliding window MUST be checked on `/api/auth/register`, `/api/extract`, and `/api/otel/*`.
  - Telemetry proxies MUST hardcode upstream endpoints to prevent SSRF attacks.
  - Secret and hash verifications MUST use constant-time comparisons (`crypto.timingSafeEqual`).
- **Data Privacy & Redaction**:
  - Gemini OCR extraction prompts and schemas MUST strictly prohibit the extraction, logging, or persistence of credit card PANs, CVVs, cardholder names, or personal financial identifiers.

## 2. Performance Guardrails

- **Core Web Vitals & Rendering**:
  - Next.js 16 route layouts and pages MUST remain Server Components (RSC); limit `"use client"` to interactive leaf components.
  - Prevent React 19 re-render cascades: isolate modal/dialog state (`ReceiptItemEditorDialog`) so typing does not re-render the workspace table.
  - All media assets and user avatars MUST declare explicit width/height to eliminate Cumulative Layout Shift (CLS = 0.00).
- **Database & Query Efficiency**:
  - In RLS policies, use `EXISTS` instead of `IN (SELECT ...)` to enable index short-circuiting.
  - Multi-tenant foreign key lookups MUST be backed by composite indexes (`(board_id, created_at DESC)`, `(board_id, category)`, `(user_id, status)`).
  - Reuse scoped Supabase clients via TTL-aware cache (`scopedClientCache`) to avoid continuous JWT re-signing and handshake latency.
- **Multimodal OCR Throughput**:
  - Keep `gemini-flash-latest` (or `gemini-3.8-flash`) as the default vision model for sub-second responses.
  - Use constrained JSON schema decoding (`responseJsonSchema`) to eliminate markdown regex stripping and retry overhead.
  - Multi-page PDFs MUST cap at 5 pages with render scale <= 3 to prevent serverless canvas memory exhaustion.
