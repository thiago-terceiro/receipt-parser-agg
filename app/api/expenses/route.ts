import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const data = await request.json();

    // Save as a list in Redis
    await redis.lpush("expenses", JSON.stringify(data));

    return NextResponse.json({ ok: true });
}

export async function GET() {
    const items = await redis.lrange("expenses", 0, -1);
    return NextResponse.json(items.map((i: string) => JSON.parse(i)));
}