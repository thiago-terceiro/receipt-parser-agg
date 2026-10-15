/**
 * @jest-environment node
 */

import { POST } from "./route";

describe("OTel Traces Proxy Route (/api/otel/v1/traces)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.HONEYCOMB_API_KEY;
    delete process.env.HONEYCOMB_API_ENDPOINT;
    delete process.env.HONEYCOMB_DATASET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("acknowledges traces gracefully when HONEYCOMB_API_KEY is unset", async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const request = new Request("http://localhost:3000/api/otel/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/x-protobuf" },
      body: payload,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("acknowledged");
  });

  it("forwards traces to Honeycomb when HONEYCOMB_API_KEY is configured", async () => {
    process.env.HONEYCOMB_API_KEY = "test-api-key";
    process.env.HONEYCOMB_DATASET = "test-dataset";

    const payload = new Uint8Array([10, 20, 30]);
    const mockUpstreamResponse = new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(mockUpstreamResponse);

    const request = new Request("http://localhost:3000/api/otel/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/x-protobuf" },
      body: payload,
    });

    const response = await POST(request);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.honeycomb.io/v1/traces",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/x-protobuf",
          "x-honeycomb-team": "test-api-key",
          "x-honeycomb-dataset": "test-dataset",
        },
      }),
    );

    expect(response.status).toBe(200);
    fetchSpy.mockRestore();
  });

  it("returns 502 when upstream forwarding encounters an error", async () => {
    process.env.HONEYCOMB_API_KEY = "test-api-key";

    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("Network connection failed"));

    const request = new Request("http://localhost:3000/api/otel/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/x-protobuf" },
      body: new Uint8Array([1]),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.error).toBe("Failed to forward telemetry");
    expect(json.details).toContain("Network connection failed");

    fetchSpy.mockRestore();
  });

  it("returns 413 when content-length header exceeds 256 KB", async () => {
    const request = new Request("http://localhost:3000/api/otel/v1/traces", {
      method: "POST",
      headers: {
        "content-type": "application/x-protobuf",
        "content-length": String(300 * 1024), // 300 KB
      },
      body: new Uint8Array([1, 2, 3]),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const json = await response.json();
    expect(json.error).toBe("Payload too large");
  });

  it("returns 413 when body payload exceeds 256 KB", async () => {
    const oversizedPayload = new Uint8Array(256 * 1024 + 1); // 256 KB + 1 byte
    const request = new Request("http://localhost:3000/api/otel/v1/traces", {
      method: "POST",
      headers: {
        "content-type": "application/x-protobuf",
      },
      body: oversizedPayload,
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const json = await response.json();
    expect(json.error).toBe("Payload too large");
  });

  it("returns 413 for chunked streaming body exceeding 256 KB even if stream cancel throws", async () => {
    const chunk1 = new Uint8Array(150 * 1024);
    const chunk2 = new Uint8Array(150 * 1024);
    let chunkIndex = 0;
    const chunks = [chunk1, chunk2];

    const mockStream = {
      getReader: () => ({
        read: jest.fn().mockImplementation(async () => {
          if (chunkIndex < chunks.length) {
            return { done: false, value: chunks[chunkIndex++] };
          }
          return { done: true, value: undefined };
        }),
        cancel: jest.fn().mockRejectedValue(new Error("Stream abort error")),
      }),
    };

    const request = {
      headers: new Headers({
        "content-type": "application/x-protobuf",
      }),
      body: mockStream,
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(413);

    const json = await response.json();
    expect(json.error).toBe("Payload too large");
  });
});


