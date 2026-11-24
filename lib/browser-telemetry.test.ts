import {
  buildOtlpResourceSpansPayload,
  initializeBrowserTelemetry,
  resetBrowserTelemetryForTests,
  toUnixNanoString,
} from "@/lib/browser-telemetry";

describe("browser-telemetry", () => {
  const originalSendBeacon = navigator.sendBeacon;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS:
        "test,development,preview,production",
    };
    delete process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED;
    delete process.env.NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE;
    resetBrowserTelemetryForTests();
  });

  afterEach(() => {
    resetBrowserTelemetryForTests();
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: originalSendBeacon,
    });
    process.env = originalEnv;
  });

  it("skips initialization when the runtime environment is excluded", () => {
    delete process.env.NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS;

    initializeBrowserTelemetry();

    expect(window.__receiptAiBrowserOtelStarted__).toBeUndefined();
  });

  it("initializes idempotently and propagates W3C traceparent on same-origin fetches only", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    window.fetch = fetchMock;

    initializeBrowserTelemetry();
    initializeBrowserTelemetry();

    expect(window.__receiptAiBrowserOtelStarted__).toBe(true);

    await window.fetch("/api/expenses?month=2026-11");
    await window.fetch("https://external.example.com/webhook");
    await window.fetch("/api/otel/v1/traces", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const sameOriginHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit)
      .headers as Headers;
    expect(sameOriginHeaders.get("traceparent")).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );

    const crossOriginInit = fetchMock.mock.calls[1]?.[1] as
      | RequestInit
      | undefined;
    expect(crossOriginInit?.headers).toBeUndefined();

    const otelLoopInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(otelLoopInit.headers).toBeUndefined();
  });

  it("flushes OTLP JSON spans via sendBeacon on pagehide", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 201 } as Response);
    window.fetch = fetchMock;

    const sendBeaconMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock,
    });

    initializeBrowserTelemetry();
    await window.fetch("/api/boards", { method: "POST" });

    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [endpoint, blob] = sendBeaconMock.mock.calls[0] as [string, Blob];
    expect(endpoint).toBe("/api/otel/v1/traces");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json");
  });

  it("formats Unix nanosecond timestamps and OTLP resourceSpans cleanly", () => {
    expect(toUnixNanoString(1700000000000.123)).toBe("1700000000000123000");

    const payload = buildOtlpResourceSpansPayload("receipt-ai-browser", [
      {
        attributes: [{ key: "web_vital.name", value: { stringValue: "LCP" } }],
        endTimeUnixNano: "1700000000000000000",
        kind: 1,
        name: "web-vital.LCP",
        spanId: "0123456789abcdef",
        startTimeUnixNano: "1700000000000000000",
        status: { code: 1 },
        traceId: "0123456789abcdef0123456789abcdef",
      },
    ]);

    expect(payload.resourceSpans[0].resource.attributes).toEqual([
      { key: "service.name", value: { stringValue: "receipt-ai-browser" } },
      { key: "app.name", value: { stringValue: "receipt-ai" } },
      { key: "app.runtime", value: { stringValue: "browser" } },
    ]);
    expect(payload.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
  });
});
