import { NextResponse } from "next/server";

import {
    acceptBoardInviteForIdentity,
    BoardRouteError,
    requireBoardIdentity,
} from "@/lib/boards-server";

export const runtime = "nodejs";

type AcceptInvitePayload = {
    token?: unknown;
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
        const payload = (await request.json()) as AcceptInvitePayload;
        const invite = await acceptBoardInviteForIdentity(identity, payload.token);

        return NextResponse.json({ invite });
    } catch (error) {
        return toErrorResponse(error, "Unable to accept the board invite.");
    }
}