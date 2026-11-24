import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { checkMcpRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request?: Request) {
  if (request) {
    const rateLimit = await checkMcpRateLimit(request);
    if (rateLimit && !rateLimit.success) {
      return NextResponse.json(
        { error: "Too many MCP SSE connection attempts. Please slow down." },
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            ...createRateLimitHeaders(rateLimit),
          },
        },
      );
    }
  }

  const sessionId = randomUUID();
  let abortHandler: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Send initial endpoint announcement per Model Context Protocol SSE specification
      const endpointMessage = `event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`;
      controller.enqueue(encoder.encode(endpointMessage));

      // Send initial keepalive comment
      controller.enqueue(encoder.encode(": keepalive\n\n"));

      if (request?.signal) {
        abortHandler = () => {
          try {
            controller.close();
          } catch {
            // Stream already closed or cancelled.
          }
        };
        if (request.signal.aborted) {
          abortHandler();
        } else {
          request.signal.addEventListener("abort", abortHandler, { once: true });
        }
      }
    },
    cancel() {
      if (abortHandler && request?.signal) {
        request.signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
