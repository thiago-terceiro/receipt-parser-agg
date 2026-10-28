import { NextResponse } from "next/server";

import { handleMcpRequest, type JsonRpcRequest } from "@/lib/mcp-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JsonRpcRequest;

    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32600,
            message: "Invalid JSON-RPC request",
          },
        },
        { status: 400 },
      );
    }

    const response = await handleMcpRequest(body);
    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
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
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
