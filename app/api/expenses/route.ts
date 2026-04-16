import { NextResponse } from "next/server";

import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import {
  buildGroceriesMonthPayload,
  getMonthKey,
  resolveRequestedMonth,
  type GroceryEntry,
} from "@/lib/groceries";
import {
  deleteSavedReceipt,
  loadGroceriesEntries,
  persistGroceriesEntries,
} from "@/lib/groceries-server";
import { parseReceiptItems } from "@/lib/receipt";

type CreateExpensesPayload = {
  boardId?: unknown;
  items?: unknown;
  rawResponse?: unknown;
  purchaseDate?: unknown;
  sourceFileName?: unknown;
  modelId?: unknown;
};

type DeleteExpensesPayload = {
  boardId?: unknown;
  receiptId?: unknown;
};

export async function POST(request: Request) {
  let identity;

  try {
    identity = await requireBoardIdentity();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in to save groceries.";

    return NextResponse.json(
      { error: message },
      { status: message === "Boards are not configured on the server." ? 503 : 401 },
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
  const receiptId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sourceFileName =
    typeof data.sourceFileName === "string" ? data.sourceFileName : null;
  const modelId = typeof data.modelId === "string" ? data.modelId : null;

  const entries: GroceryEntry[] = parsedItems.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    receiptId,
    sourceFileName,
    modelId,
    purchaseDate: purchaseDateIso,
    createdAt,
  }));

  try {
    const result = await persistGroceriesEntries(identity, data.boardId, entries);

    return NextResponse.json({
      ok: true,
      boardId: result.activeBoard.id,
      month,
      receiptId,
      savedCount: result.savedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save groceries.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  let identity;

  try {
    identity = await requireBoardIdentity();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in to view groceries.";

    return NextResponse.json(
      { error: message },
      { status: message === "Boards are not configured on the server." ? 503 : 401 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedMonth = searchParams.get("month");
  const boardId = searchParams.get("boardId");
  const month = resolveRequestedMonth(requestedMonth);

  try {
    const entries = await loadGroceriesEntries(identity, month, boardId);

    return NextResponse.json(buildGroceriesMonthPayload(month, entries));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load groceries.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let identity;

  try {
    identity = await requireBoardIdentity();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in to manage groceries.";

    return NextResponse.json(
      { error: message },
      { status: message === "Boards are not configured on the server." ? 503 : 401 },
    );
  }

  const data = (await request.json()) as DeleteExpensesPayload;

  try {
    const result = await deleteSavedReceipt(identity, data.boardId, data.receiptId);

    return NextResponse.json({
      ok: true,
      boardId: result.board.id,
      deletedEntriesCount: result.deletedEntriesCount,
      receiptId: data.receiptId,
    });
  } catch (error) {
    if (error instanceof BoardRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to delete receipt.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
