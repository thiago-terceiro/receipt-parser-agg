/**
 * Model Context Protocol (MCP) Server Implementation.
 * Implements the standard JSON-RPC 2.0 protocol over HTTP/SSE for remote web tools.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MCP_SERVER_INFO = {
  name: "receipt-parser-agg",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
};

export const AVAILABLE_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "extract_receipt",
    description:
      "Extracts structured grocery items, prices, quantities, categories, and currency from receipt image data using Gemini Flash.",
    inputSchema: {
      type: "object",
      properties: {
        imageBase64: {
          type: "string",
          description: "Base64-encoded receipt image or PDF data (without data URL prefix).",
        },
        mimeType: {
          type: "string",
          description: "MIME type of the receipt (e.g. image/jpeg, image/png, application/pdf).",
          default: "image/jpeg",
        },
        modelId: {
          type: "string",
          description: "Gemini vision model identifier. Defaults to gemini-flash-latest.",
        },
      },
      required: ["imageBase64"],
    },
  },
  {
    name: "calculate_budget_split",
    description:
      "Calculates equal or custom expense splits and category totals across household members.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number" },
              quantity: { type: "number" },
              category: { type: "string" },
            },
            required: ["name", "price"],
          },
          description: "List of grocery items with price and optional quantity.",
        },
        memberCount: {
          type: "number",
          description: "Number of members splitting the expense.",
        },
      },
      required: ["items", "memberCount"],
    },
  },
  {
    name: "get_mcp_capabilities",
    description: "Returns the capabilities, schema versions, and documentation links for this application.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export const handleMcpRequest = async (
  request: JsonRpcRequest,
): Promise<JsonRpcResponse> => {
  const { id = null, method, params = {} } = request;

  switch (method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: MCP_SERVER_INFO.protocolVersion,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: MCP_SERVER_INFO.name,
            version: MCP_SERVER_INFO.version,
          },
        },
      };
    }

    case "notifications/initialized":
    case "ping": {
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: AVAILABLE_MCP_TOOLS,
        },
      };
    }

    case "tools/call": {
      const toolName = params.name as string;
      const toolArguments = (params.arguments || {}) as Record<string, unknown>;

      if (toolName === "calculate_budget_split") {
        const rawItems = (toolArguments.items as Array<{ price: number; quantity?: number; category?: string; name: string }>) || [];
        const memberCount = Math.max(1, Number(toolArguments.memberCount) || 1);

        const totalSpent = rawItems.reduce((acc, item) => {
          const qty = item.quantity && Number.isFinite(item.quantity) ? item.quantity : 1;
          return acc + Number(item.price || 0) * qty;
        }, 0);

        const perPersonShare = Math.round((totalSpent / memberCount) * 100) / 100;
        const categoryTotals = rawItems.reduce((acc, item) => {
          const cat = item.category || "Uncategorized";
          const qty = item.quantity && Number.isFinite(item.quantity) ? item.quantity : 1;
          acc[cat] = (acc[cat] || 0) + Number(item.price || 0) * qty;
          return acc;
        }, {} as Record<string, number>);

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  totalSpent: Math.round(totalSpent * 100) / 100,
                  memberCount,
                  perPersonShare,
                  categoryTotals,
                }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === "get_mcp_capabilities") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  server: MCP_SERVER_INFO,
                  tools: AVAILABLE_MCP_TOOLS.map((t) => t.name),
                  manifest: "https://receipt-parser-agg.vercel.app/llms.txt",
                }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === "extract_receipt") {
        const imageBase64 = toolArguments.imageBase64 as string;
        if (!imageBase64) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Missing imageBase64 parameter",
            },
          };
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "ready_for_extraction",
                  message: "Receipt payload received for Gemini Flash extraction. Pass to /api/extract for multipart handling.",
                  bytesReceived: imageBase64.length,
                }),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Tool not found: ${toolName}`,
        },
      };
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
};
