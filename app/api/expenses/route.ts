import { NextResponse } from "next/server";

import {
  buildGroceriesMonthPayload,
  getMonthKey,
  resolveRequestedMonth,
  type GroceryEntry,
} from "@/lib/groceries";
import { getGroceriesWriteKey, loadGroceriesEntries } from "@/lib/groceries-server";
import { parseReceiptItems } from "@/lib/receipt";
import { redis } from "@/lib/redis";
import { getSessionIdentity } from "@/lib/session";

type CreateExpensesPayload = {
  items?: unknown;
  rawResponse?: unknown;
  purchaseDate?: unknown;
  sourceFileName?: unknown;
  modelId?: unknown;
};

export async function POST(request: Request) {
  const identity = await getSessionIdentity();
  if (!identity?.userId) {
    return NextResponse.json(
      { error: "Sign in to save groceries." },
      { status: 401 },
    );
  }

  if (!redis) {
    return NextResponse.json(
      { error: "Groceries storage is not configured on the server." },
      { status: 503 },
    );
  }

  const data = (await request.json()) as CreateExpensesPayload;
  const parsedItems = Array.isArray(data.items)
    ? data.items
    : typeof data.rawResponse === "string"
      ? parseReceiptItems(data.rawResponse)
      : null;

  if (!parsedItems || parsedItems.length === 0) {
    return NextResponse.json(
      { error: "Request must include at least one grocery item." },
      { status: 400 },
    );
  }

  const purchaseDate =
    typeof data.purchaseDate === "string" &&
      !Number.isNaN(Date.parse(data.purchaseDate))
      ? new Date(data.purchaseDate)
      : new Date();
  const purchaseDateIso = purchaseDate.toISOString();
  const month = getMonthKey(purchaseDate);
  const key = getGroceriesWriteKey(identity, month);
  const receiptId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sourceFileName =
    typeof data.sourceFileName === "string" ? data.sourceFileName : null;
  const modelId = typeof data.modelId === "string" ? data.modelId : null;

  if (!key) {
    return NextResponse.json(
      { error: "Unable to resolve groceries storage key." },
      { status: 401 },
    );
  }

  const entries: GroceryEntry[] = parsedItems.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    receiptId,
    sourceFileName,
    modelId,
    purchaseDate: purchaseDateIso,
    createdAt,
  }));

  await redis.lpush(key, ...entries.map((entry) => JSON.stringify(entry)));

  return NextResponse.json({
    ok: true,
    month,
    receiptId,
    savedCount: entries.length,
  });
}

export async function GET(request: Request) {
  const identity = await getSessionIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Sign in to view groceries." },
      { status: 401 },
    );
  }

  if (!redis) {
    return NextResponse.json(
      { error: "Groceries storage is not configured on the server." },
      { status: 503 },
    );
  }

  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = resolveRequestedMonth(requestedMonth);
  const entries = await loadGroceriesEntries(identity, month);

  return NextResponse.json(buildGroceriesMonthPayload(month, entries));
}
