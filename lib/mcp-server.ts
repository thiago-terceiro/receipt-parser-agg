/**
 * Model Context Protocol (MCP) Server Implementation.
 * Implements the standard JSON-RPC 2.0 protocol over HTTP/SSE for remote web tools.
 */

import { resolveRequestedModelId } from "@/lib/receipt";
import {
  isSupportedReceiptUpload,
  maxReceiptFileSizeBytes,
} from "@/lib/receipt-upload";
import { stripInvisibleCharacters } from "@/lib/security-sanitizer";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const MAX_MCP_IMAGE_BASE64_LENGTH = Math.ceil(
  (maxReceiptFileSizeBytes * 4) / 3,
);
export const MAX_MCP_BUDGET_ITEMS = 500;

const FORBIDDEN_CATEGORY_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

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
  const { id = null, method } = request;
  if (request.params !== undefined && !isPlainObject(request.params)) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32602,
        message: "Invalid params: params must be an object",
      },
    };
  }
  const params = request.params ?? {};

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
      if (typeof params.name !== "string" || !params.name.trim()) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params: tool name must be a non-empty string",
          },
        };
      }
      if (
        params.arguments !== undefined &&
        !isPlainObject(params.arguments)
      ) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params: tool arguments must be an object",
          },
        };
      }
      const toolName = params.name;
      const toolArguments = params.arguments ?? {};

      if (toolName === "calculate_budget_split") {
        if (!Array.isArray(toolArguments.items)) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: items must be an array",
            },
          };
        }

        if (toolArguments.items.length > MAX_MCP_BUDGET_ITEMS) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: `Invalid params: items cannot exceed ${MAX_MCP_BUDGET_ITEMS} entries`,
            },
          };
        }

        const rawMemberCount =
          toolArguments.memberCount === undefined
            ? 1
            : Number(toolArguments.memberCount);
        if (!Number.isFinite(rawMemberCount) || rawMemberCount < 1) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: memberCount must be a positive number",
            },
          };
        }

        const memberCount = Math.floor(rawMemberCount);
        const rawItems = toolArguments.items as Array<{
          price?: unknown;
          quantity?: unknown;
          category?: unknown;
          name?: unknown;
        }>;

        const categoryTotalsMap: Record<string, number> = Object.create(null);
        let totalSpent = 0;

        for (const item of rawItems) {
          if (!item || typeof item !== "object") {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Invalid params: each item must be an object",
              },
            };
          }

          const price = Number(item.price ?? 0);
          const qty =
            item.quantity === undefined || item.quantity === null
              ? 1
              : Number(item.quantity);

          if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Invalid params: item price and quantity must be valid positive numbers",
              },
            };
          }

          const rawCategory =
            typeof item.category === "string"
              ? stripInvisibleCharacters(item.category).trim()
              : "";
          const safeCategory =
            !rawCategory || FORBIDDEN_CATEGORY_KEYS.has(rawCategory.toLowerCase())
              ? "Uncategorized"
              : rawCategory;

          const lineTotal = price * qty;
          totalSpent += lineTotal;
          categoryTotalsMap[safeCategory] =
            Math.round(((categoryTotalsMap[safeCategory] ?? 0) + lineTotal) * 100) /
            100;
        }

        const roundedTotalSpent = Math.round(totalSpent * 100) / 100;
        const perPersonShare = Math.round((roundedTotalSpent / memberCount) * 100) / 100;
        const categoryTotals: Record<string, number> = { ...categoryTotalsMap };

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  totalSpent: roundedTotalSpent,
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
        const imageBase64 =
          typeof toolArguments.imageBase64 === "string"
            ? toolArguments.imageBase64.trim()
            : "";
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

        if (imageBase64.length > MAX_MCP_IMAGE_BASE64_LENGTH) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: imageBase64 exceeds 10 MB limit",
            },
          };
        }

        if (toolArguments.mimeType !== undefined) {
          if (
            typeof toolArguments.mimeType !== "string" ||
            !isSupportedReceiptUpload({ type: toolArguments.mimeType })
          ) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "Invalid params: mimeType must be a supported image or PDF MIME type",
              },
            };
          }
        }

        const resolvedModelId = resolveRequestedModelId({
          selectedModelId: toolArguments.modelId,
        });

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
                  modelId: resolvedModelId,
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
