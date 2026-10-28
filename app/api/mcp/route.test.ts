/**
 * @jest-environment node
 */

import { POST as postMcpMessages } from "@/app/api/mcp/messages/route";
import { GET as getMcpSse } from "@/app/api/mcp/sse/route";

import { GET as getMcpWellKnown } from "@/app/.well-known/mcp.json/route";

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
});
