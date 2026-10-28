---
name: receipt-ocr-performance-and-safety
description: >-
  Operational runbook for maintaining, tuning, and securing the Gemini multimodal receipt OCR pipeline, 
  PDF ingestion, Upstash Redis rate limiting, and PII redaction. Use when modifying /api/extract, tuning 
  OCR latency/token usage, adjusting upload limits, or troubleshooting extraction failures.
---

# Receipt OCR Performance & Safety Runbook

This skill outlines the engineering standards, safety guardrails, and latency optimization techniques for the multimodal receipt extraction pipeline in this project.

## OCR Pipeline Architecture

The extraction flow spans:
- **`app/api/extract/route.ts`**: The edge/server route handler accepting multipart file uploads or base64 payloads.
- **`lib/receipt.ts`**: Prompt construction, structured JSON schemas, model resolution, and extraction sanitization.
- **`lib/receipt-upload.ts`**: MIME type detection, PDF multi-page rendering (`pdf-to-img`), and multi-page result merging.
- **`lib/extract-rate-limit.ts`**: Upstash Redis sliding-window rate limiter per client IP / user session.

---

## Safety & Security Protocols

### 1. Ingestion Bomb & Resource Exhaustion Defense
- **File Size Enforcements**:
  - Maximum upload size is capped at 10 MB (`maxFileSizeBytes`).
  - Pre-validate `Content-Length` headers before streaming raw bytes into memory to reject payload attacks at zero CPU cost.
- **PDF Page Capping**:
  - Multi-page PDFs must be capped at `defaultPdfPageLimit = 5` pages.
  - Multi-page rendering consumes Node canvas buffers; exceeding page limits risks Out-Of-Memory (OOM) process termination on serverless containers.
- **PDF Render Scale**:
  - Keep `defaultPdfRenderScale = 3`. Do not exceed scale 4, as memory usage scales quadratically with DPI without improving Gemini OCR accuracy.

### 2. PII & Financial Data Redaction
Receipts frequently contain Primary Account Numbers (PANs), cardholder names, cashier IDs, and transaction auth codes.
- **Schema Boundary**: The extraction schema (`receiptItemsJsonSchema`) must strictly admit receipt metadata (`merchantName`, `totalAmount`, `date`, `currency`) and items (`name`, `price`, `quantity`, `category`).
- **Prompt Sanitization Directive**:
  `buildReceiptPrompt()` includes strict system instructions:
  > *"Do not extract credit card numbers, CVVs, expiration dates, or personal banking details."*
- **Database Hygiene**: Never persist raw base64 receipt images to public tables or unencrypted storage.

### 3. Rate Limiting Protection
- Upstash Redis sliding window (`checkReceiptExtractionRateLimit(req)`):
  - Anonymous requests: default 10 extractions per 10-minute window.
  - Authenticated sessions: higher threshold with burst protection.
  - Response on breach: `429 Too Many Requests` accompanied by `createRateLimitHeaders()` (`Retry-After`, `X-RateLimit-Reset`).

---

## Performance & Latency Optimization

### 1. Model Latency & Token Optimization
- **Default Model**: Standardize on `gemini-flash-latest` (aliased to `gemini-3.8-flash`). It offers sub-1.5s latency with excellent multimodal OCR fidelity.
- **Constrained JSON Generation (`responseJsonSchema`)**:
  Always pass `responseJsonSchema` into `ai.models.generateContent`:
  ```typescript
  const response = await ai.models.generateContent({
    model: resolvedModelId,
    contents: [prompt, imagePart],
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptItemsJsonSchema,
      maxOutputTokens: 2048,
    },
  });
  ```
  *Benefits*: Eliminates markdown backtick wrappers (` ```json `), prevents conversational preambles, and avoids costly retry/repair loops (`jsonrepair`).

### 2. Multi-Page Concurrency
- When processing multi-page PDFs, render pages sequentially or with bounded concurrency (concurrency limit = 2) to maintain predictable memory usage, then merge via `mergeReceiptExtractions()`.

### 3. OpenTelemetry GenAI Semantic Metrics
Always wrap extraction calls in an active span:
```typescript
await withSpan("gemini.extract_receipt", async (span) => {
  span.setAttribute("gen_ai.system", "google_genai");
  span.setAttribute("gen_ai.request.model", modelId);
  // After generation:
  span.setAttribute("gen_ai.usage.prompt_tokens", usage.promptTokenCount);
  span.setAttribute("gen_ai.usage.completion_tokens", usage.candidatesTokenCount);
});
```

---

## Verification & Testing Suite

Execute these verification checks before shipping changes to the extraction pipeline:

1. **Live OCR Verification (End-to-End Simulation)**:
   ```bash
   pnpm run test:e2e:ocr
   ```
2. **Unit & Edge Case Tests**:
   ```bash
   pnpm test lib/receipt.test.ts
   pnpm test lib/receipt-upload.test.ts
   pnpm test lib/extract-rate-limit.test.ts
   ```
3. **Full CI Pipeline**:
   ```bash
   pnpm run ci:verify
   ```
