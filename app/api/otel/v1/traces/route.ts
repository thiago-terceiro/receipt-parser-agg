import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB

const defaultHoneycombEndpoint = "https://api.honeycomb.io/v1/traces";

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10);
      if (Number.isFinite(parsedLength) && parsedLength > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            error: "Payload too large",
            message: `Request payload exceeds the 256 KB limit (${parsedLength} bytes received).`,
          },
          { status: 413 },
        );
      }
    }

    let rawBody: ArrayBuffer;
    if (request.body && typeof request.body.getReader === "function") {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_PAYLOAD_BYTES) {
            try {
              await reader.cancel();
            } catch {
              // Suppress stream cancellation failure so 413 is consistently returned
            }
            return NextResponse.json(
              {
                error: "Payload too large",
                message: "Request payload exceeds the 256 KB limit.",
              },
              { status: 413 },
            );
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
      rawBody = merged.buffer;
    } else {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            error: "Payload too large",
            message: `Request payload exceeds the 256 KB limit (${buffer.byteLength} bytes received).`,
          },
          { status: 413 },
        );
      }
      rawBody = buffer;
    }

    const apiKey = process.env.HONEYCOMB_API_KEY?.trim();

    if (!apiKey) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[otel-proxy] Absorbed ${rawBody.byteLength} bytes of browser traces (HONEYCOMB_API_KEY is unset).`,
        );
      }
      return NextResponse.json(
        {
          status: "acknowledged",
          message:
            "Telemetry accepted. Set HONEYCOMB_API_KEY to forward traces to Honeycomb.",
        },
        { status: 200 },
      );
    }

    const targetUrl =
      process.env.HONEYCOMB_API_ENDPOINT?.trim() || defaultHoneycombEndpoint;
    const contentType =
      request.headers.get("content-type") || "application/x-protobuf";

    const upstreamHeaders: Record<string, string> = {
      "content-type": contentType,
      "x-honeycomb-team": apiKey,
    };

    const dataset = process.env.HONEYCOMB_DATASET?.trim();
    if (dataset) {
      upstreamHeaders["x-honeycomb-dataset"] = dataset;
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: Buffer.from(rawBody),
    });

    const upstreamData = await upstreamResponse.arrayBuffer();

    return new NextResponse(upstreamData, {
      status: upstreamResponse.status,
      headers: {
        "content-type":
          upstreamResponse.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[otel-proxy] Failed to forward traces to Honeycomb:", error);
    return NextResponse.json(
      {
        error: "Failed to forward telemetry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
