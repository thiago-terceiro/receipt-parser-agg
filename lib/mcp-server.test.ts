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
});
