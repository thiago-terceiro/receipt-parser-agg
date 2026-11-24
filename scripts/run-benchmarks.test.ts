/**
 * @jest-environment node
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  auditSecurityHeaders,
  computeExtractionF1,
  computePercentile,
  measureNextBundleStats,
  runParseAndPiiThroughputBenchmark,
} from "@/scripts/run-benchmarks";

describe("scripts/run-benchmarks helpers", () => {
  describe("computePercentile", () => {
    it("returns 0 for an empty array and handles single values", () => {
      expect(computePercentile([], 50)).toBe(0);
      expect(computePercentile([42.34], 95)).toBe(42.3);
    });

    it("computes sorted p50 and p95 latencies rounded to 1 decimal place", () => {
      const sample = [300, 100, 200, 500, 400];
      expect(computePercentile(sample, 50)).toBe(300);
      expect(computePercentile(sample, 95)).toBe(480);
      expect(computePercentile(sample, 100)).toBe(500);
      expect(computePercentile(sample, 0)).toBe(100);
    });
  });

  describe("computeExtractionF1", () => {
    const groundTruth = [
      { keyword: "milk", category: "dairy", lineTotal: 2.49 },
      { keyword: "bread", category: "bakery", lineTotal: 3.2 },
      { keyword: "banana", category: "produce", lineTotal: 1.8 },
    ];

    it("computes perfect 1.0 F1 and exact matches for accurate extractions", () => {
      const result = computeExtractionF1(groundTruth, [
        { normalizedItem: "organic whole milk 1l", category: "dairy", lineTotal: 2.49 },
        { normalizedItem: "sourdough bread loaf", category: "bakery", lineTotal: 3.2 },
        { normalizedItem: "fresh bananas 1kg", category: "produce", lineTotal: 1.8 },
      ]);

      expect(result).toEqual({
        precision: 1,
        recall: 1,
        f1: 1,
        matched: 3,
        priceExact: 3,
        categoryExact: 3,
      });
    });

    it("handles partial matches, price/category mismatches, and empty extractions", () => {
      const partial = computeExtractionF1(groundTruth, [
        { normalizedItem: "milk", category: "beverages", lineTotal: 2.99 },
        { normalizedItem: "unexpected extra", category: "other", lineTotal: 9.99 },
      ]);

      expect(partial.matched).toBe(1);
      expect(partial.priceExact).toBe(0);
      expect(partial.categoryExact).toBe(0);
      expect(partial.precision).toBe(0.5);
      expect(partial.recall).toBe(0.3333);
      expect(partial.f1).toBe(0.4);

      expect(computeExtractionF1(groundTruth, [])).toEqual({
        precision: 0,
        recall: 0,
        f1: 0,
        matched: 0,
        priceExact: 0,
        categoryExact: 0,
      });
    });
  });

  describe("auditSecurityHeaders", () => {
    it("scores 100 when all 6 security headers are present and x-powered-by is absent", () => {
      const headers = new Headers({
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "Content-Security-Policy": "default-src 'self'",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      });

      const audit = auditSecurityHeaders(headers);
      expect(audit.score).toBe(100);
      expect(audit.missing).toEqual([]);
      expect(audit.passed).toContain("x-powered-by-absent");
    });

    it("flags missing CSP and exposed x-powered-by", () => {
      const audit = auditSecurityHeaders({
        "strict-transport-security": "max-age=31536000",
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy": "camera=()",
        "x-powered-by": "Next.js",
      });

      expect(audit.missing).toContain("content-security-policy");
      expect(audit.missing).toContain("x-powered-by-exposed");
      expect(audit.score).toBe(71);
    });
  });

  describe("runParseAndPiiThroughputBenchmark", () => {
    it("measures positive finite throughput across 10 iterations", () => {
      const result = runParseAndPiiThroughputBenchmark(10);
      expect(result.iterations).toBe(10);
      expect(Number.isFinite(result.totalMs)).toBe(true);
      expect(result.totalMs).toBeGreaterThan(0);
      expect(Number.isFinite(result.avgMsPerReceipt)).toBe(true);
      expect(result.receiptsPerSec).toBeGreaterThan(0);
    });
  });

  describe("measureNextBundleStats", () => {
    it("measures raw and gzip JS/CSS chunk and rootMainFiles sizes in a fixture .next dir", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "next-bundle-test-"));
      try {
        const chunksDir = path.join(tmpDir, "static", "chunks");
        fs.mkdirSync(chunksDir, { recursive: true });

        const mainJsRel = "static/chunks/main.js";
        fs.writeFileSync(
          path.join(chunksDir, "main.js"),
          "console.log('hello receipt parser');".repeat(40),
        );
        fs.writeFileSync(
          path.join(chunksDir, "extra.js"),
          "export const x = 42;".repeat(20),
        );
        fs.writeFileSync(
          path.join(chunksDir, "app.css"),
          "body { margin: 0; color: #111; }".repeat(15),
        );
        fs.writeFileSync(
          path.join(tmpDir, "build-manifest.json"),
          JSON.stringify({ rootMainFiles: [mainJsRel] }),
        );

        const stats = measureNextBundleStats(tmpDir);
        expect(stats.jsChunks).toBe(2);
        expect(stats.jsRawKB).toBeGreaterThan(1.5);
        expect(stats.jsGzipKB).toBeGreaterThan(0);
        expect(stats.jsGzipKB).toBeLessThan(stats.jsRawKB);
        expect(stats.cssRawKB).toBeGreaterThan(0.4);
        expect(stats.cssGzipKB).toBeGreaterThan(0);
        expect(stats.rootMainCount).toBe(1);
        expect(stats.rootMainRawKB).toBeGreaterThan(1.0);
        expect(stats.rootMainGzipKB).toBeGreaterThan(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
