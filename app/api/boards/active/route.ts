import { NextResponse } from "next/server";

import {
    BoardRouteError,
    requireBoardIdentity,
    setLastActiveBoardForIdentity,
} from "@/lib/boards-server";

export const runtime = "nodejs";

type SetActiveBoardPayload = {
    boardId?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function POST(request: Request) {
    try {
        const identity = await requireBoardIdentity();
        const payload = (await request.json()) as SetActiveBoardPayload;
        const board = await setLastActiveBoardForIdentity(identity, payload.boardId);

        return NextResponse.json({ board });
    } catch (error) {
        return toErrorResponse(error, "Unable to set the active board.");
    }
}