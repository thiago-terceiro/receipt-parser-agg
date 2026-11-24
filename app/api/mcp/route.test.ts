/**
 * @jest-environment node
 */

import {
  MAX_MCP_PAYLOAD_BYTES,
  OPTIONS as optionsMcpMessages,
  POST as postMcpMessages,
} from "@/app/api/mcp/messages/route";
import { GET as getMcpSse } from "@/app/api/mcp/sse/route";
import { checkMcpRateLimit } from "@/lib/rate-limit";

import { GET as getMcpWellKnown } from "@/app/.well-known/mcp.json/route";

jest.mock("@/lib/rate-limit", () => {
  const actual = jest.requireActual("@/lib/rate-limit");
  return {
    ...actual,
    checkMcpRateLimit: jest.fn().mockResolvedValue(null),
  };
});

const mockCheckMcpRateLimit = checkMcpRateLimit as jest.MockedFunction<
  typeof checkMcpRateLimit
>;

describe("mcp routes", () => {
  it("serves well-known mcp discovery manifest", async () => {
    const req = new Request("http://localhost:3000/.well-known/mcp.json");
    const res = await getMcpWellKnown(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.schemaVersion).toBe("1.0");
    expect(json.serverInfo.name).toBe("receipt-parser-agg");
    expect(json.transports[0].endpoint).toContain("/api/mcp/sse");
    expect(Array.isArray(json.capabilities.tools)).toBe(true);
  });

  it("handles sse connection initialization", async () => {
    const res = await getMcpSse();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain("event: endpoint");
      expect(text).toContain("/api/mcp/messages?sessionId=");
      await reader.cancel();
    }
  });

  it("handles json-rpc messages via POST", async () => {
    const req = new Request("http://localhost:3000/api/mcp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-1",
        method: "ping",
      }),
    });

    const res = await postMcpMessages(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("req-1");
    expect(json.result).toEqual({});
  });

  it("handles OPTIONS CORS preflight with 204", async () => {
    const res = await optionsMcpMessages();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("returns 413 when MCP message Content-Length exceeds MAX_MCP_PAYLOAD_BYTES", async () => {
    const req = new Request("http://localhost:3000/api/mcp/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(MAX_MCP_PAYLOAD_BYTES + 1024),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });

    const res = await postMcpMessages(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error.code).toBe(-32600);
  });

  it("returns 400 on malformed JSON or invalid JSON-RPC 2.0 envelope", async () => {
    const badJsonReq = new Request("http://localhost:3000/api/mcp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad-json",
    });
    const badJsonRes = await postMcpMessages(badJsonReq);
    expect(badJsonRes.status).toBe(400);
    const badJsonPayload = await badJsonRes.json();
    expect(badJsonPayload.error.code).toBe(-32700);

    const badRpcReq = new Request("http://localhost:3000/api/mcp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "1.0", id: "bad-rpc-1", method: 123 }),
    });
    const badRpcRes = await postMcpMessages(badRpcReq);
    expect(badRpcRes.status).toBe(400);
    const badRpcPayload = await badRpcRes.json();
    expect(badRpcPayload.id).toBe("bad-rpc-1");
    expect(badRpcPayload.error.code).toBe(-32600);
  });

  it("enforces streaming MAX_MCP_PAYLOAD_BYTES cap when Content-Length header is omitted", async () => {
    const chunk = new Uint8Array(4 * 1024 * 1024); // 4 MB
    let sentChunks = 0;
    const oversizedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sentChunks >= 10) {
          controller.close();
          return;
        }
        sentChunks += 1;
        controller.enqueue(chunk);
      },
    });

    const req = new Request("http://localhost:3000/api/mcp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedStream,
      duplex: "half",
    } as RequestInit);

    const res = await postMcpMessages(req);
    expect(res.status).toBe(413);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const payload = await res.json();
    expect(payload.error.code).toBe(-32600);
    expect(sentChunks).toBeLessThanOrEqual(5);
  });

  it("enforces 429 rate limiting with Retry-After and CORS headers on /api/mcp/messages and /api/mcp/sse", async () => {
    mockCheckMcpRateLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: 25,
    });

    try {
      const msgReq = new Request("http://localhost:3000/api/mcp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "rl-1", method: "ping" }),
      });
      const msgRes = await postMcpMessages(msgReq);
      expect(msgRes.status).toBe(429);
      expect(msgRes.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(msgRes.headers.get("Retry-After")).toBe("25");
      const msgPayload = await msgRes.json();
      expect(msgPayload.error.code).toBe(-32029);

      const sseReq = new Request("http://localhost:3000/api/mcp/sse");
      const sseRes = await getMcpSse(sseReq);
      expect(sseRes.status).toBe(429);
      expect(sseRes.headers.get("Retry-After")).toBe("25");
    } finally {
      mockCheckMcpRateLimit.mockResolvedValue(null);
    }
  });

  it("closes SSE stream cleanly when client request signal aborts", async () => {
    const abortController = new AbortController();
    const req = new Request("http://localhost:3000/api/mcp/sse", {
      signal: abortController.signal,
    });

    const res = await getMcpSse(req);
    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    if (reader) {
      await reader.read(); // endpoint frame
      abortController.abort();
      // Drain remaining buffered frame (: keepalive) until stream closes
      let closed = false;
      for (let i = 0; i < 4; i += 1) {
        const next = await reader.read();
        if (next.done) {
          closed = true;
          break;
        }
      }
      expect(closed).toBe(true);
    }
  });
});
