import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as zlib from "node:zlib";

import { parseReceiptExtraction } from "@/lib/receipt";
import { redactFinancialPii } from "@/lib/security-sanitizer";

export type ExtractionGroundTruthItem = {
  keyword: string;
  category: string;
  lineTotal: number;
};

export type ExtractedReceiptMetricItem = {
  normalizedItem: string;
  category: string;
  lineTotal: number;
};

export type ExtractionAccuracyMetrics = {
  precision: number;
  recall: number;
  f1: number;
  matched: number;
  priceExact: number;
  categoryExact: number;
};

export type SecurityHeaderAuditResult = {
  passed: string[];
  missing: string[];
  score: number;
};

export type NextBundleStats = {
  jsChunks: number;
  jsRawKB: number;
  jsGzipKB: number;
  cssRawKB: number;
  cssGzipKB: number;
  rootMainCount: number;
  rootMainRawKB: number;
  rootMainGzipKB: number;
};

export type ParseThroughputResult = {
  iterations: number;
  totalMs: number;
  avgMsPerReceipt: number;
  receiptsPerSec: number;
};

export type EndpointLatencyStats = {
  path: string;
  status: number;
  ttfbMs: {
    min: number;
    p50: number;
    p95: number;
    max: number;
  };
  decodedBodyBytes: number;
  contentEncoding: string | null;
  vercelCache: string | null;
  cacheControl: string | null;
};

const REQUIRED_SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const;

const BENCHMARK_ENDPOINTS = [
  "/en",
  "/pt-br",
  "/es",
  "/en/groceries",
  "/llms.txt",
  "/.well-known/mcp.json",
] as const;

const DEFAULT_GROUND_TRUTH: ReadonlyArray<ExtractionGroundTruthItem> = [
  { keyword: "milk", category: "dairy", lineTotal: 2.49 },
  { keyword: "bread", category: "bakery", lineTotal: 3.2 },
  { keyword: "banana", category: "produce", lineTotal: 1.8 },
];

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const computePercentile = (
  values: number[],
  percentile: number,
): number => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return 0;
  }

  const sorted = [...finite].sort((a, b) => a - b);
  const clamped = Math.min(100, Math.max(0, percentile));
  const index = (clamped / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return roundTo(sorted[lower], 1);
  }

  const interpolated =
    sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  return roundTo(interpolated, 1);
};

export const computeExtractionF1 = (
  groundTruth: ReadonlyArray<ExtractionGroundTruthItem>,
  extracted: ReadonlyArray<ExtractedReceiptMetricItem>,
): ExtractionAccuracyMetrics => {
  if (groundTruth.length === 0 && extracted.length === 0) {
    return {
      precision: 1,
      recall: 1,
      f1: 1,
      matched: 0,
      priceExact: 0,
      categoryExact: 0,
    };
  }

  if (groundTruth.length === 0 || extracted.length === 0) {
    return {
      precision: 0,
      recall: 0,
      f1: 0,
      matched: 0,
      priceExact: 0,
      categoryExact: 0,
    };
  }

  const usedIndices = new Set<number>();
  let matched = 0;
  let priceExact = 0;
  let categoryExact = 0;

  for (const gt of groundTruth) {
    const keyword = gt.keyword.trim().toLowerCase();
    const hitIndex = extracted.findIndex(
      (item, index) =>
        !usedIndices.has(index) &&
        item.normalizedItem.toLowerCase().includes(keyword),
    );

    if (hitIndex !== -1) {
      usedIndices.add(hitIndex);
      const hit = extracted[hitIndex];
      matched += 1;
      if (Math.abs(hit.lineTotal - gt.lineTotal) < 0.01) {
        priceExact += 1;
      }
      if (hit.category === gt.category) {
        categoryExact += 1;
      }
    }
  }

  const precision = matched / extracted.length;
  const recall = matched / groundTruth.length;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    precision: roundTo(precision, 4),
    recall: roundTo(recall, 4),
    f1: roundTo(f1, 4),
    matched,
    priceExact,
    categoryExact,
  };
};

const readHeaderValue = (
  headers: Headers | Record<string, string | null | undefined>,
  name: string,
): string | null => {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name);
  }

  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value ?? null;
    }
  }
  return null;
};

export const auditSecurityHeaders = (
  headers: Headers | Record<string, string | null | undefined>,
): SecurityHeaderAuditResult => {
  const passed: string[] = [];
  const missing: string[] = [];

  for (const headerName of REQUIRED_SECURITY_HEADERS) {
    const value = readHeaderValue(headers, headerName);
    if (typeof value === "string" && value.trim().length > 0) {
      passed.push(headerName);
    } else {
      missing.push(headerName);
    }
  }

  const poweredBy = readHeaderValue(headers, "x-powered-by");
  if (typeof poweredBy === "string" && poweredBy.trim().length > 0) {
    missing.push("x-powered-by-exposed");
  } else {
    passed.push("x-powered-by-absent");
  }

  const totalChecks = passed.length + missing.length;
  const score = totalChecks > 0 ? Math.round((passed.length / totalChecks) * 100) : 0;

  return { passed, missing, score };
};

const collectChunkFiles = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectChunkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

export const measureNextBundleStats = (nextDir: string): NextBundleStats => {
  const chunksDir = path.join(nextDir, "static", "chunks");
  const files = collectChunkFiles(chunksDir);

  let jsChunks = 0;
  let jsRawBytes = 0;
  let jsGzipBytes = 0;
  let cssRawBytes = 0;
  let cssGzipBytes = 0;

  for (const filePath of files) {
    const buf = fs.readFileSync(filePath);
    const gz = zlib.gzipSync(buf).byteLength;

    if (filePath.endsWith(".js")) {
      jsChunks += 1;
      jsRawBytes += buf.byteLength;
      jsGzipBytes += gz;
    } else if (filePath.endsWith(".css")) {
      cssRawBytes += buf.byteLength;
      cssGzipBytes += gz;
    }
  }

  let rootMainCount = 0;
  let rootMainRawBytes = 0;
  let rootMainGzipBytes = 0;

  const buildManifestPath = path.join(nextDir, "build-manifest.json");
  if (fs.existsSync(buildManifestPath)) {
    const manifest = JSON.parse(
      fs.readFileSync(buildManifestPath, "utf8"),
    ) as { rootMainFiles?: unknown };
    const rootFiles = Array.isArray(manifest.rootMainFiles)
      ? manifest.rootMainFiles.filter((f): f is string => typeof f === "string")
      : [];

    for (const relPath of rootFiles) {
      const fullPath = path.join(nextDir, relPath);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        rootMainCount += 1;
        rootMainRawBytes += buf.byteLength;
        rootMainGzipBytes += zlib.gzipSync(buf).byteLength;
      }
    }
  }

  return {
    jsChunks,
    jsRawKB: roundTo(jsRawBytes / 1024, 2),
    jsGzipKB: roundTo(jsGzipBytes / 1024, 2),
    cssRawKB: roundTo(cssRawBytes / 1024, 2),
    cssGzipKB: roundTo(cssGzipBytes / 1024, 2),
    rootMainCount,
    rootMainRawKB: roundTo(rootMainRawBytes / 1024, 2),
    rootMainGzipKB: roundTo(rootMainGzipBytes / 1024, 2),
  };
};

export const runParseAndPiiThroughputBenchmark = (
  iterations = 2000,
): ParseThroughputResult => {
  const safeIterations = Math.max(1, Math.floor(iterations));
  const samplePayload = JSON.stringify({
    currencyCode: "EUR",
    purchaseDate: "2026-11-24",
    items: Array.from({ length: 40 }, (_, index) => ({
      name: `Item ${index} 4532-1234-5678-9012 CVV: 321 <|im_start|>`,
      category: "produce",
      quantity: 2,
      unitPrice: 1.99,
      lineTotal: 3.98,
    })),
  });

  const startedAt = performance.now();
  for (let i = 0; i < safeIterations; i += 1) {
    const redacted = redactFinancialPii(samplePayload);
    parseReceiptExtraction(redacted);
  }
  const elapsedMs = Math.max(performance.now() - startedAt, 0.001);

  return {
    iterations: safeIterations,
    totalMs: roundTo(elapsedMs, 2),
    avgMsPerReceipt: roundTo(elapsedMs / safeIterations, 3),
    receiptsPerSec: Math.round((safeIterations / elapsedMs) * 1000),
  };
};

const loadLocalEnvIfPresent = () => {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
};

const measureEndpointLatency = async (
  baseUrl: string,
  routePath: string,
): Promise<EndpointLatencyStats & { headers: Headers }> => {
  const targetUrl = new URL(routePath, baseUrl).toString();
  // Warm up connection and edge cache once before timing.
  await fetch(targetUrl);

  const timings: number[] = [];
  let lastStatus = 0;
  let lastHeaders = new Headers();
  let decodedBodyBytes = 0;

  for (let i = 0; i < 5; i += 1) {
    const start = performance.now();
    const res = await fetch(targetUrl);
    const ttfb = performance.now() - start;
    const body = await res.arrayBuffer();
    timings.push(ttfb);
    lastStatus = res.status;
    lastHeaders = res.headers;
    decodedBodyBytes = body.byteLength;
  }

  return {
    path: routePath,
    status: lastStatus,
    ttfbMs: {
      min: computePercentile(timings, 0),
      p50: computePercentile(timings, 50),
      p95: computePercentile(timings, 95),
      max: computePercentile(timings, 100),
    },
    decodedBodyBytes,
    contentEncoding: lastHeaders.get("content-encoding"),
    vercelCache: lastHeaders.get("x-vercel-cache"),
    cacheControl: lastHeaders.get("cache-control"),
    headers: lastHeaders,
  };
};

const parseCliArgs = (argv: string[]) => {
  let baseUrl = "https://receipt-parser-agg.vercel.app";
  let skipLighthouse = false;
  let skipOcr = false;
  let modelId = process.env.GEMINI_MODEL_ID || "gemini-3.8-flash";

  for (const arg of argv) {
    if (arg.startsWith("--url=")) {
      baseUrl = arg.slice("--url=".length).trim() || baseUrl;
    } else if (arg === "--skip-lighthouse") {
      skipLighthouse = true;
    } else if (arg === "--skip-ocr") {
      skipOcr = true;
    } else if (arg.startsWith("--model=")) {
      modelId = arg.slice("--model=".length).trim() || modelId;
    }
  }

  return { baseUrl, skipLighthouse, skipOcr, modelId };
};

const runCli = async () => {
  loadLocalEnvIfPresent();
  const args = parseCliArgs(process.argv.slice(2));

  const network: EndpointLatencyStats[] = [];
  let securityHeaders: SecurityHeaderAuditResult | { error: string };

  try {
    let enHeaders: Headers | null = null;
    for (const routePath of BENCHMARK_ENDPOINTS) {
      const measurement = await measureEndpointLatency(args.baseUrl, routePath);
      if (routePath === "/en") {
        enHeaders = measurement.headers;
      }
      const { headers: _headers, ...stats } = measurement;
      network.push(stats);
    }

    securityHeaders = enHeaders
      ? auditSecurityHeaders(enHeaders)
      : { error: "Missing /en response headers" };
  } catch (error) {
    securityHeaders = {
      error:
        error instanceof Error
          ? error.message
          : "Network benchmark failed.",
    };
  }

  const bundleStats = measureNextBundleStats(path.join(process.cwd(), ".next"));
  const postInferenceThroughput = runParseAndPiiThroughputBenchmark(2000);

  let ocrBenchmark: Record<string, unknown> = { skipped: true };
  if (!args.skipOcr) {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENAI_API_KEY ||
        process.env.GOOGLE_API_KEY,
    );

    if (!hasGeminiKey) {
      ocrBenchmark = {
        skipped: true,
        reason: "GEMINI_API_KEY is not configured.",
      };
    } else {
      const { POST } = await import("@/app/api/extract/route");
      const { createSimulatedReceiptPng } = await import(
        "./generate-simulated-receipt"
      );

      const pngBuffer = await createSimulatedReceiptPng();
      const file = new File(
        [new Uint8Array(pngBuffer)],
        "simulated-grocery-receipt.png",
        { type: "image/png" },
      );
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modelId", args.modelId);

      const req = new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      });

      const startedAt = performance.now();
      const res = await POST(req);
      const latencyMs = roundTo(performance.now() - startedAt, 1);
      const payload = (await res.json()) as {
        backend?: string;
        currencyCode?: string;
        modelId?: string;
        items?: ExtractedReceiptMetricItem[];
        error?: string;
      };

      const extracted = Array.isArray(payload.items) ? payload.items : [];
      const accuracy = computeExtractionF1(DEFAULT_GROUND_TRUTH, extracted);

      ocrBenchmark = {
        skipped: false,
        status: res.status,
        backend: payload.backend ?? null,
        modelId: payload.modelId ?? args.modelId,
        latencyMs,
        currencyMatch: payload.currencyCode === "EUR",
        extractedCount: extracted.length,
        accuracy,
        ...(res.status !== 200 ? { error: payload.error } : {}),
      };
    }
  }

  let lighthouseStatus: Record<string, unknown> = { skipped: true };
  if (!args.skipLighthouse) {
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const targetUrl = new URL("/en", args.baseUrl).toString();
    const outPath = path.join(
      process.cwd(),
      "test-results",
      "lighthouse-en-mobile.json",
    );
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const lhRun = spawnSync(
      pnpmCmd,
      [
        "dlx",
        "lighthouse",
        targetUrl,
        "--output=json",
        `--output-path=${outPath}`,
        "--chrome-flags=--headless=new --no-sandbox",
        "--quiet",
      ],
      { encoding: "utf8", timeout: 120_000 },
    );

    if (lhRun.status === 0 && fs.existsSync(outPath)) {
      const report = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
        lighthouseVersion?: string;
        categories?: Record<string, { score?: number }>;
      };
      lighthouseStatus = {
        skipped: false,
        version: report.lighthouseVersion ?? null,
        outputPath: path.relative(process.cwd(), outPath),
        scores: Object.fromEntries(
          Object.entries(report.categories ?? {}).map(([key, cat]) => [
            key,
            Math.round((cat.score ?? 0) * 100),
          ]),
        ),
      };
    } else {
      lighthouseStatus = {
        skipped: false,
        exitCode: lhRun.status,
        error: lhRun.stderr?.slice(0, 300) || "Lighthouse execution failed.",
      };
    }
  }

  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        targetUrl: args.baseUrl,
        network,
        securityHeaders,
        bundleStats,
        postInferenceThroughput,
        ocrBenchmark,
        lighthouse: lighthouseStatus,
      },
      null,
      2,
    ),
  );
};

const isDirectExecution = (): boolean => {
  if (!process.argv[1]) {
    return false;
  }
  const scriptPath = path.resolve(fileURLToPath(import.meta.url));
  const invokedPath = path.resolve(process.argv[1]);
  return scriptPath === invokedPath;
};

if (isDirectExecution()) {
  runCli().catch((error) => {
    console.error("[bench] Benchmark runner failed:", error);
    process.exit(1);
  });
}
