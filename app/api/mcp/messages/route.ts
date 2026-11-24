import { NextResponse } from "next/server";

import { handleMcpRequest, type JsonRpcRequest } from "@/lib/mcp-server";
import { checkMcpRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const MAX_MCP_PAYLOAD_BYTES = 15 * 1024 * 1024; // 15 MB cap for base64 receipt JSON-RPC payloads

const MCP_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request payload exceeds maximum allowed size.");
    this.name = "PayloadTooLargeError";
  }
}

const readBoundedJsonText = async (
  request: Request,
  maxBytes: number,
): Promise<string> => {
  if (!request.body || typeof request.body.getReader !== "function") {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new PayloadTooLargeError();
    }
    return text;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Suppress stream cancellation errors so 413 is reliably returned.
        }
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
};

export async function POST(request: Request) {
  try {
    const rateLimit = await checkMcpRateLimit(request);
    if (rateLimit && !rateLimit.success) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32029,
            message: "Too many MCP requests. Please slow down.",
          },
        },
        {
          status: 429,
          headers: {
            ...MCP_CORS_HEADERS,
            ...createRateLimitHeaders(rateLimit),
          },
        },
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10);
      if (Number.isFinite(parsedLength) && parsedLength > MAX_MCP_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Payload too large",
            },
          },
          { status: 413, headers: MCP_CORS_HEADERS },
        );
      }
    }

    let rawText: string;
    try {
      rawText = await readBoundedJsonText(request, MAX_MCP_PAYLOAD_BYTES);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Payload too large",
            },
          },
          { status: 413, headers: MCP_CORS_HEADERS },
        );
      }
      throw error;
    }

    let body: JsonRpcRequest;
    try {
      body = JSON.parse(rawText) as JsonRpcRequest;
    } catch {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error: invalid JSON payload",
          },
        },
        { status: 400, headers: MCP_CORS_HEADERS },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      body.jsonrpc !== "2.0" ||
      typeof body.method !== "string"
    ) {
      const requestId =
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        (typeof body.id === "string" || typeof body.id === "number")
          ? body.id
          : null;
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: -32600,
            message: "Invalid JSON-RPC request",
          },
        },
        { status: 400, headers: MCP_CORS_HEADERS },
      );
    }

    const response = await handleMcpRequest(body);
    return NextResponse.json(response, {
      headers: MCP_CORS_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal MCP processing error";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message,
        },
      },
      { status: 500, headers: MCP_CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}
