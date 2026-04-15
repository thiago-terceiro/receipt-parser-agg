import { NextResponse } from "next/server";

import {
    BoardRouteError,
    listBoardMembersForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

export const runtime = "nodejs";

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ boardId: string }> },
) {
    try {
        const identity = await requireBoardIdentity();
        const { boardId } = await params;
        const members = await listBoardMembersForIdentity(identity, boardId);

        return NextResponse.json({ members });
    } catch (error) {
        return toErrorResponse(error, "Unable to load board members.");
    }
}