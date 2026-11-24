"use client";

import { observabilityAttributes } from "@/lib/observability-schema";

declare global {
  interface Window {
    __receiptAiBrowserOtelStarted__?: boolean;
  }
}

type OtlpAttributeValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean };

export type OtlpAttribute = {
  key: string;
  value: OtlpAttributeValue;
};

export type OtlpSpanRecord = {
  traceId: string;
  spanId: string;
  name: string;
  kind: 1 | 3;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  status?: {
    code: 1 | 2;
  };
};

const MAX_QUEUED_SPANS = 50;

const browserDebugMode = process.env.NEXT_PUBLIC_OTEL_BROWSER_DEBUG === "true";

let pendingSpans: OtlpSpanRecord[] = [];
let sessionTraceId = "";
let originalFetch: typeof window.fetch | null = null;
let observers: PerformanceObserver[] = [];
let cleanupListeners: Array<() => void> = [];
let collectVitalSpans: (() => void) | null = null;

const getConfig = () => {
  const enabled = process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED !== "false";
  const collectorEndpoint =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL?.trim() ||
    "/api/otel/v1/traces";
  const serviceName =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME?.trim() ||
    "receipt-ai-browser";
  const enabledEnvironments =
    process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS?.trim() ||
    "development,preview,production";
  const rawSampleRate = process.env.NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE?.trim();
  const parsedSampleRate = Number.parseInt(rawSampleRate ?? "1", 10);
  const sampleRate =
    Number.isFinite(parsedSampleRate) && parsedSampleRate > 0
      ? parsedSampleRate
      : 1;

  return {
    collectorEndpoint,
    enabled,
    enabledEnvironments,
    sampleRate,
    serviceName,
  };
};

const resolveRuntimeEnvironment = () => {
  const envCandidates = [
    process.env.NEXT_PUBLIC_VERCEL_ENV,
    process.env.VERCEL_ENV,
    process.env.NODE_ENV,
  ];

  for (const candidate of envCandidates) {
    const normalized = candidate?.trim().toLowerCase();
    if (normalized) {
      return normalized;
    }
  }

  return "development";
};

const isTelemetryEnabledForEnvironment = (allowedCsv: string) => {
  const runtimeEnvironment = resolveRuntimeEnvironment();
  return allowedCsv
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(runtimeEnvironment);
};

const randomHex = (byteCount: number): string => {
  const bytes = new Uint8Array(byteCount);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = (Date.now() + i * 31) & 0xff;
    }
  }

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
};

const shouldSampleSession = (sampleRate: number): boolean => {
  if (sampleRate <= 1) {
    return true;
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % sampleRate === 0;
  }

  return false;
};

export const toUnixNanoString = (epochMs: number): string => {
  const safeMicros = Math.max(0, Math.round(epochMs * 1000));
  return `${safeMicros}000`;
};

const nowEpochMs = (): number => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    const origin =
      typeof performance.timeOrigin === "number" && performance.timeOrigin > 0
        ? performance.timeOrigin
        : Date.now() - performance.now();
    return origin + performance.now();
  }
  return Date.now();
};

const perfTimeToEpochMs = (relativeMs: number): number => {
  if (typeof performance !== "undefined") {
    const origin =
      typeof performance.timeOrigin === "number" && performance.timeOrigin > 0
        ? performance.timeOrigin
        : Date.now() - performance.now();
    return origin + relativeMs;
  }
  return Date.now();
};

const queueSpan = (span: OtlpSpanRecord) => {
  if (pendingSpans.length >= MAX_QUEUED_SPANS) {
    pendingSpans.shift();
  }
  pendingSpans.push(span);
};

export const buildOtlpResourceSpansPayload = (
  serviceName: string,
  spans: OtlpSpanRecord[],
) => ({
  resourceSpans: [
    {
      resource: {
        attributes: [
          {
            key: "service.name",
            value: { stringValue: serviceName },
          },
          {
            key: observabilityAttributes.appName,
            value: { stringValue: "receipt-ai" },
          },
          {
            key: observabilityAttributes.appRuntime,
            value: { stringValue: "browser" },
          },
        ],
      },
      scopeSpans: [
        {
          scope: {
            name: "receipt-ai-browser",
            version: "1.0.0",
          },
          spans,
        },
      ],
    },
  ],
});

const flushSpans = (collectorEndpoint: string, serviceName: string) => {
  collectVitalSpans?.();

  if (pendingSpans.length === 0) {
    return;
  }

  const batch = pendingSpans;
  pendingSpans = [];
  const body = JSON.stringify(buildOtlpResourceSpansPayload(serviceName, batch));

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const sent = navigator.sendBeacon(
        collectorEndpoint,
        new Blob([body], { type: "application/json" }),
      );
      if (sent) {
        return;
      }
    }

    const fetchFn = originalFetch ?? window.fetch;
    void fetchFn(collectorEndpoint, {
      body,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => {
      // Best-effort non-blocking telemetry flush
    });
  } catch {
    // Never surface telemetry errors to users
  }
};

const startWebVitalsObservers = (traceId: string) => {
  if (typeof PerformanceObserver === "undefined") {
    return;
  }

  let lcpMs: number | null = null;
  let fcpMs: number | null = null;
  let clsScore = 0;
  let inpMs = 0;
  let ttfbMs: number | null = null;
  let vitalsRecorded = false;

  const observeType = (
    type: string,
    handler: (entries: PerformanceEntryList) => void,
    extraOptions?: Record<string, unknown>,
  ) => {
    try {
      const observer = new PerformanceObserver((list) => {
        handler(list.getEntries());
      });
      observer.observe({
        buffered: true,
        type,
        ...extraOptions,
      } as PerformanceObserverInit);
      observers.push(observer);
    } catch {
      // Unsupported entryType in current browser
    }
  };

  observeType("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) {
      lcpMs = last.startTime;
    }
  });

  observeType("paint", (entries) => {
    for (const entry of entries) {
      if (entry.name === "first-contentful-paint") {
        fcpMs = entry.startTime;
      }
    }
  });

  observeType("layout-shift", (entries) => {
    for (const entry of entries) {
      const shift = entry as PerformanceEntry & {
        hadRecentInput?: boolean;
        value?: number;
      };
      if (!shift.hadRecentInput && typeof shift.value === "number") {
        clsScore += shift.value;
      }
    }
  });

  observeType(
    "event",
    (entries) => {
      for (const entry of entries) {
        const timing = entry as PerformanceEntry & { interactionId?: number };
        if (timing.interactionId && entry.duration > inpMs) {
          inpMs = entry.duration;
        }
      }
    },
    { durationThreshold: 40 },
  );

  observeType("navigation", (entries) => {
    const nav = entries[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.responseStart > 0) {
      ttfbMs = nav.responseStart;
    }
  });

  collectVitalSpans = () => {
    if (vitalsRecorded || typeof window === "undefined") {
      return;
    }
    vitalsRecorded = true;

    const endNano = toUnixNanoString(nowEpochMs());
    const startNano = toUnixNanoString(perfTimeToEpochMs(0));
    const pagePath = window.location.pathname;
    const metrics: Array<[string, number]> = [];

    if (ttfbMs !== null) metrics.push(["TTFB", Math.round(ttfbMs)]);
    if (fcpMs !== null) metrics.push(["FCP", Math.round(fcpMs)]);
    if (lcpMs !== null) metrics.push(["LCP", Math.round(lcpMs)]);
    if (clsScore > 0) metrics.push(["CLS", Number(clsScore.toFixed(4))]);
    if (inpMs > 0) metrics.push(["INP", Math.round(inpMs)]);

    for (const [metricName, value] of metrics) {
      queueSpan({
        attributes: [
          { key: "web_vital.name", value: { stringValue: metricName } },
          { key: "web_vital.value", value: { doubleValue: value } },
          { key: "url.path", value: { stringValue: pagePath } },
        ],
        endTimeUnixNano: endNano,
        kind: 1,
        name: `web-vital.${metricName}`,
        spanId: randomHex(8),
        status: { code: 1 },
        startTimeUnixNano: startNano,
        traceId,
      });
    }
  };
};

const installFetchInstrumentation = (
  traceId: string,
  collectorEndpoint: string,
) => {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  if (originalFetch) {
    return;
  }

  const baseFetch = window.fetch.bind(window);
  originalFetch = window.fetch;

  let collectorPath = collectorEndpoint;
  try {
    collectorPath = new URL(collectorEndpoint, window.location.origin).pathname;
  } catch {
    // Keep literal endpoint string
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequestObject =
      typeof Request !== "undefined" && input instanceof Request;
    const isUrlObject = typeof URL !== "undefined" && input instanceof URL;
    const rawUrl =
      typeof input === "string"
        ? input
        : isUrlObject
          ? input.href
          : isRequestObject
            ? input.url
            : String((input as { url?: string })?.url ?? "");

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(rawUrl, window.location.origin);
    } catch {
      return baseFetch(input, init);
    }

    const isSameOrigin = parsedUrl.origin === window.location.origin;
    const isCollectorRequest = parsedUrl.pathname === collectorPath;
    if (!isSameOrigin || isCollectorRequest) {
      return baseFetch(input, init);
    }

    const spanId = randomHex(8);
    const headers = new Headers(
      isRequestObject ? input.headers : init?.headers,
    );
    if (init?.headers && isRequestObject) {
      new Headers(init.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }
    if (!headers.has("traceparent")) {
      headers.set("traceparent", `00-${traceId}-${spanId}-01`);
    }

    const method = (
      init?.method ??
      (isRequestObject ? input.method : "GET")
    ).toUpperCase();
    const startMs = nowEpochMs();

    try {
      const response = isRequestObject
        ? await baseFetch(new Request(input, { ...init, headers }))
        : await baseFetch(input, { ...init, headers });

      queueSpan({
        attributes: [
          { key: "http.request.method", value: { stringValue: method } },
          { key: "url.path", value: { stringValue: parsedUrl.pathname } },
          {
            key: "http.response.status_code",
            value: { intValue: String(response.status) },
          },
        ],
        endTimeUnixNano: toUnixNanoString(nowEpochMs()),
        kind: 3,
        name: `HTTP ${method}`,
        spanId,
        status: { code: response.status >= 500 ? 2 : 1 },
        startTimeUnixNano: toUnixNanoString(startMs),
        traceId,
      });

      return response;
    } catch (error) {
      queueSpan({
        attributes: [
          { key: "http.request.method", value: { stringValue: method } },
          { key: "url.path", value: { stringValue: parsedUrl.pathname } },
        ],
        endTimeUnixNano: toUnixNanoString(nowEpochMs()),
        kind: 3,
        name: `HTTP ${method}`,
        spanId,
        status: { code: 2 },
        startTimeUnixNano: toUnixNanoString(startMs),
        traceId,
      });
      throw error;
    }
  };
};

export const initializeBrowserTelemetry = () => {
  const {
    collectorEndpoint,
    enabled,
    enabledEnvironments,
    sampleRate,
    serviceName,
  } = getConfig();

  if (
    typeof window === "undefined" ||
    window.__receiptAiBrowserOtelStarted__ ||
    !enabled ||
    !isTelemetryEnabledForEnvironment(enabledEnvironments) ||
    !collectorEndpoint ||
    !shouldSampleSession(sampleRate)
  ) {
    return;
  }

  try {
    sessionTraceId = randomHex(16);
    window.__receiptAiBrowserOtelStarted__ = true;

    startWebVitalsObservers(sessionTraceId);
    installFetchInstrumentation(sessionTraceId, collectorEndpoint);

    const handleVisibilityChange = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        flushSpans(collectorEndpoint, serviceName);
      }
    };
    const handlePageHide = () => {
      flushSpans(collectorEndpoint, serviceName);
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    cleanupListeners.push(
      () => window.removeEventListener("visibilitychange", handleVisibilityChange),
      () => window.removeEventListener("pagehide", handlePageHide),
    );

    if (browserDebugMode) {
      console.info("Browser telemetry initialized.", {
        collectorEndpoint,
        runtimeEnvironment: resolveRuntimeEnvironment(),
        serviceName,
      });
    }
  } catch (error) {
    console.warn("Browser telemetry initialization failed.", error);
  }
};

export const resetBrowserTelemetryForTests = () => {
  if (typeof window !== "undefined") {
    if (originalFetch) {
      window.fetch = originalFetch;
    }
    delete window.__receiptAiBrowserOtelStarted__;
  }
  originalFetch = null;
  for (const observer of observers) {
    observer.disconnect();
  }
  observers = [];
  for (const cleanup of cleanupListeners) {
    cleanup();
  }
  cleanupListeners = [];
  collectVitalSpans = null;
  pendingSpans = [];
  sessionTraceId = "";
};
