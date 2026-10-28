import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  const sessionId = randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Send initial endpoint announcement per Model Context Protocol SSE specification
      const endpointMessage = `event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`;
      controller.enqueue(encoder.encode(endpointMessage));

      // Send initial keepalive comment
      controller.enqueue(encoder.encode(": keepalive\n\n"));
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
