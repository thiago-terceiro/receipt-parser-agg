import { NextResponse } from "next/server";

import {
    BoardRouteError,
    createBoardInviteForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

export const runtime = "nodejs";

type CreateBoardInvitePayload = {
    email?: unknown;
    role?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function POST(
    request: Request,
    { params }: { params: Promise<{ boardId: string }> },
) {
    try {
        const identity = await requireBoardIdentity();
        const { boardId } = await params;
        const payload = (await request.json()) as CreateBoardInvitePayload;
        const invite = await createBoardInviteForIdentity(
            identity,
            boardId,
            payload.email,
            payload.role,
        );

        return NextResponse.json({ invite }, { status: 201 });
    } catch (error) {
        return toErrorResponse(error, "Unable to create the board invite.");
    }
}