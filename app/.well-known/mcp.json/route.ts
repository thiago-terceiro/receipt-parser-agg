import { NextResponse } from "next/server";

import { AVAILABLE_MCP_TOOLS, MCP_SERVER_INFO } from "@/lib/mcp-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return NextResponse.json(
    {
      schemaVersion: "1.0",
      serverInfo: MCP_SERVER_INFO,
      transports: [
        {
          type: "sse",
          endpoint: `${baseUrl}/api/mcp/sse`,
        },
      ],
      capabilities: {
        tools: AVAILABLE_MCP_TOOLS,
      },
      documentation: `${baseUrl}/llms.txt`,
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
