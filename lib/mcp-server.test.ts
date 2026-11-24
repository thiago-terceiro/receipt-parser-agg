import {
  AVAILABLE_MCP_TOOLS,
  handleMcpRequest,
  MCP_SERVER_INFO,
} from "./mcp-server";

describe("mcp-server", () => {
  it("handles initialize method correctly", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe(1);
    expect(res.result).toEqual({
      protocolVersion: MCP_SERVER_INFO.protocolVersion,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: MCP_SERVER_INFO.name,
        version: MCP_SERVER_INFO.version,
      },
    });
  });

  it("handles tools/list method", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "abc",
      method: "tools/list",
    });

    expect(res.result).toEqual({
      tools: AVAILABLE_MCP_TOOLS,
    });
  });

  it("executes calculate_budget_split tool call", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: {
          items: [
            { name: "Milk", price: 2.0, quantity: 2, category: "Dairy" },
            { name: "Apples", price: 3.5, quantity: 1, category: "Produce" },
          ],
          memberCount: 3,
        },
      },
    });

    expect(res.error).toBeUndefined();
    const resultObj = res.result as { content: Array<{ type: string; text: string }> };
    expect(resultObj.content[0].type).toBe("text");

    const parsed = JSON.parse(resultObj.content[0].text);
    expect(parsed.totalSpent).toBe(7.5);
    expect(parsed.memberCount).toBe(3);
    expect(parsed.perPersonShare).toBe(2.5);
    expect(parsed.categoryTotals).toEqual({
      Dairy: 4.0,
      Produce: 3.5,
    });
  });

  it("handles unknown tools gracefully", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 99,
      method: "tools/call",
      params: {
        name: "non_existent_tool",
      },
    });

    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32601);
  });

  it("prevents prototype pollution and object key collisions in calculate_budget_split", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "proto-test",
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: {
          items: [
            { name: "Item 1", price: 10, quantity: 1, category: "__proto__" },
            { name: "Item 2", price: 5, quantity: 1, category: "constructor" },
            { name: "Item 3", price: 2.5, quantity: 2, category: "prototype" },
            { name: "Item 4", price: 3, quantity: 1, category: "toString" },
          ],
          memberCount: 2,
        },
      },
    });

    expect(res.error).toBeUndefined();
    const resultObj = res.result as { content: Array<{ type: string; text: string }> };
    const parsed = JSON.parse(resultObj.content[0].text);

    expect(parsed.totalSpent).toBe(23);
    expect(parsed.perPersonShare).toBe(11.5);
    expect(parsed.categoryTotals.Uncategorized).toBe(20);
    expect(parsed.categoryTotals.toString).toBe(3);
  });

  it("validates calculate_budget_split inputs and rejects malformed arguments with -32602", async () => {
    const nonArrayRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "bad-1",
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: {
          items: "not-an-array",
          memberCount: 2,
        },
      },
    });
    expect(nonArrayRes.error?.code).toBe(-32602);

    const zeroMemberRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "bad-2",
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: {
          items: [{ name: "Milk", price: 2 }],
          memberCount: 0,
        },
      },
    });
    expect(zeroMemberRes.error?.code).toBe(-32602);

    const negativePriceRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "bad-3",
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: {
          items: [{ name: "Milk", price: -5 }],
          memberCount: 2,
        },
      },
    });
    expect(negativePriceRes.error?.code).toBe(-32602);
  });

  it("validates extract_receipt parameters and enforces 10 MB base64 payload cap", async () => {
    const missingRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "ext-1",
      method: "tools/call",
      params: {
        name: "extract_receipt",
        arguments: { imageBase64: "   " },
      },
    });
    expect(missingRes.error?.code).toBe(-32602);

    const validRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "ext-2",
      method: "tools/call",
      params: {
        name: "extract_receipt",
        arguments: {
          imageBase64: "aGVsbG8=",
          modelId: "gemini-3.8-flash",
        },
      },
    });
    expect(validRes.error).toBeUndefined();
    const resultObj = validRes.result as { content: Array<{ type: string; text: string }> };
    const parsed = JSON.parse(resultObj.content[0].text);
    expect(parsed.status).toBe("ready_for_extraction");
    expect(parsed.modelId).toBe("gemini-3.8-flash");

    const invalidMimeRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "ext-svg",
      method: "tools/call",
      params: {
        name: "extract_receipt",
        arguments: {
          imageBase64: "aGVsbG8=",
          mimeType: "image/svg+xml",
        },
      },
    });
    expect(invalidMimeRes.error?.code).toBe(-32602);
  });

  it("rejects null or non-object params and tool arguments with -32602 instead of throwing TypeError", async () => {
    const nullParamsRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "null-params",
      method: "tools/call",
      params: null as unknown as Record<string, unknown>,
    });
    expect(nullParamsRes.error?.code).toBe(-32602);

    const arrayArgsRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "array-args",
      method: "tools/call",
      params: {
        name: "calculate_budget_split",
        arguments: [] as unknown as Record<string, unknown>,
      },
    });
    expect(arrayArgsRes.error?.code).toBe(-32602);

    const missingToolNameRes = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "no-name",
      method: "tools/call",
      params: {},
    });
    expect(missingToolNameRes.error?.code).toBe(-32602);
  });
});
