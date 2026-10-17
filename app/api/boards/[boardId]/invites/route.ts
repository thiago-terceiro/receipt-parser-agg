import { NextResponse } from "next/server";

import {
    BoardRouteError,
    createBoardInviteForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export const runtime = "nodejs";

type CreateBoardInvitePayload = {
    email?: unknown;
    role?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        logWarn("Board invite request failed.", {
            [observabilityFields.event]: observabilityEvents.apiBoardsInvitesRequestFailed,
            [observabilityFields.errorMessage]: error.message,
            [observabilityAttributes.httpStatusCode]: error.statusCode,
        });
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    logError("Board invite request failed.", {
        [observabilityFields.event]: observabilityEvents.apiBoardsInvitesRequestFailed,
        [observabilityFields.errorMessage]: message,
        [observabilityAttributes.httpStatusCode]: 500,
    });
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function POST(
    request: Request,
    { params }: { params: Promise<{ boardId: string }> },
) {
    try {
        const response = await withSpan("api.boards.invites.create", async () => {
            const identity = await requireBoardIdentity();
            const { boardId } = await params;
            let payload: CreateBoardInvitePayload;
            try {
                payload = (await request.json()) as CreateBoardInvitePayload;
            } catch {
                return NextResponse.json(
                    { error: "Invalid JSON request body." },
                    { status: 400 },
                );
            }
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return NextResponse.json(
                    { error: "Invalid JSON request body." },
                    { status: 400 },
                );
            }
            const invite = await createBoardInviteForIdentity(
                identity,
                boardId,
                payload.email,
                payload.role,
            );

            logInfo("Created board invite.", {
                [observabilityFields.event]: observabilityEvents.apiBoardsInvitesCreateSuccess,
                [observabilityAttributes.inviteHasEmailRestriction]: Boolean(invite.email),
                [observabilityAttributes.inviteRole]: invite.role,
            });

            return NextResponse.json({ invite }, { status: 201 });
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to create the board invite.");
    }
}