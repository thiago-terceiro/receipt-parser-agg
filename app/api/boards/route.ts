import { NextResponse } from "next/server";

import {
    BoardRouteError,
    createBoardForIdentity,
    listBoardsForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

export const runtime = "nodejs";

type CreateBoardPayload = {
    name?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function GET() {
    try {
        const identity = await requireBoardIdentity();
        const boards = await listBoardsForIdentity(identity);

        return NextResponse.json({ boards });
    } catch (error) {
        return toErrorResponse(error, "Unable to load boards.");
    }
}

export async function POST(request: Request) {
    try {
        const identity = await requireBoardIdentity();
        const payload = (await request.json()) as CreateBoardPayload;
        const board = await createBoardForIdentity(identity, payload.name);

        return NextResponse.json({ board }, { status: 201 });
    } catch (error) {
        return toErrorResponse(error, "Unable to create the board.");
    }
}