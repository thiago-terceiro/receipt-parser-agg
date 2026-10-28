---
name: api-security-hardening
description: >-
  Audits and hardens Next.js 16 API route handlers, rate limiting, payload streaming caps, 
  SSRF prevention, timing attacks, and authentication endpoints. Use when adding or modifying 
  app/api routes, adjusting rate limits, or auditing API vulnerabilities.
---

# Next.js API Security & Hardening Runbook

This skill outlines the mandatory security controls, validation schemas, and defense-in-depth patterns for all HTTP route handlers in `app/api/*`.

## API Threat Surface in This Project

- **`/api/auth/register`**: Account creation with password hashing; target for credential stuffing, spam registrations, and timing attacks.
- **`/api/extract`**: Receipt OCR parsing; target for upload bombs (decompression/memory exhaustion) and LLM API cost depletion.
- **`/api/otel/v1/traces`**: Browser telemetry forwarding; target for denial-of-service (DoS) via telemetry flooding and Server-Side Request Forgery (SSRF).
- **`/api/boards/*` & `/api/invites/*`**: Multi-tenant board collaboration; target for authorization bypass, IDOR (Insecure Direct Object Reference), and privilege escalation.

---

## Mandatory Security Controls

### 1. Robust Request Body Caps (Streaming Defense)
Never trust `Content-Length` alone, as attackers can omit the header or use chunked transfer encoding (`Transfer-Encoding: chunked`).
- **Standard Streaming Reader Pattern**:
  ```typescript
  export const MAX_PAYLOAD_BYTES = 256 * 1024; // e.g. 256 KB for telemetry

  const reader = request.body.getReader();
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PAYLOAD_BYTES) {
        await reader.cancel().catch(() => {});
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }
  }
  ```

### 2. Upstash Redis Sliding-Window Rate Limiting
- Every public or computationally expensive endpoint must check rate limits before processing the payload:
  - Register: `checkRegisterRateLimit(request)` (default 5 requests / 10 min window)
  - OCR Extract: `checkReceiptExtractionRateLimit(request)`
  - OTel Proxy: `checkOtelRateLimit(request)`
- Always return HTTP `429 Too Many Requests` with RFC-compliant headers:
  ```typescript
  if (rateLimit && !rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }
  ```

### 3. SSRF Guardrails on Reverse Proxies
For telemetry forwarding in [`app/api/otel/v1/traces/route.ts`](file:///c:/Users/thiag/Documents/projects/antigravity/receipt-parser-agg/app/api/otel/v1/traces/route.ts):
- Hardcode the upstream endpoint to `https://api.honeycomb.io/v1/traces`.
- **NEVER** accept upstream destination URLs, ports, or protocol parameters from client request bodies, query strings, or headers.

### 4. Timing-Safe Authentication & Password Verification
- Passwords must be hashed using strong, salted algorithms (Argon2id or PBKDF2 with high iterations).
- Compare sensitive secrets or verification tokens using `crypto.timingSafeEqual` over fixed-length buffer digests:
  ```typescript
  import { timingSafeEqual } from "node:crypto";

  const a = Buffer.from(hashA, "hex");
  const b = Buffer.from(hashB, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return false;
  }
  ```

### 5. Multi-Tenant Authorization (IDOR Prevention)
- Never rely solely on client-provided IDs (e.g. `boardId` from params).
- Always verify that the authenticated user's ID (`session.user.id`) possesses an active membership record in `board_members` with sufficient role privileges (`owner` or `editor`) before executing mutations.

---

## Verification & Audit Checklist

Execute these tests to confirm route security:

1. **Rate Limiting Tests**:
   ```bash
   pnpm test lib/rate-limit.test.ts
   pnpm test lib/extract-rate-limit.test.ts
   ```
2. **API Route Integration Tests**:
   ```bash
   pnpm test app/api/auth/register/route.test.ts
   pnpm test app/api/otel/v1/traces/route.test.ts
   pnpm test app/api/boards/route.test.ts
   ```
3. **Full End-to-End & Typecheck Verification**:
   ```bash
   pnpm run ci:verify
   ```
