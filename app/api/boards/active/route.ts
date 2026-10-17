import { NextResponse } from "next/server";

import {
    BoardRouteError,
    requireBoardIdentity,
    setLastActiveBoardForIdentity,
} from "@/lib/boards-server";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export const runtime = "nodejs";

type SetActiveBoardPayload = {
    boardId?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        logWarn("Active board request failed.", {
            [observabilityFields.event]: observabilityEvents.apiBoardsActiveRequestFailed,
            [observabilityFields.errorMessage]: error.message,
            [observabilityAttributes.httpStatusCode]: error.statusCode,
        });
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    logError("Active board request failed.", {
        [observabilityFields.event]: observabilityEvents.apiBoardsActiveRequestFailed,
        [observabilityFields.errorMessage]: message,
        [observabilityAttributes.httpStatusCode]: 500,
    });
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function POST(request: Request) {
    try {
        const response = await withSpan("api.boards.active.set", async () => {
            const identity = await requireBoardIdentity();
            let payload: SetActiveBoardPayload;
            try {
                payload = (await request.json()) as SetActiveBoardPayload;
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
            const board = await setLastActiveBoardForIdentity(identity, payload.boardId);

            logInfo("Updated active board for identity.", {
                [observabilityFields.event]: observabilityEvents.apiBoardsActiveSetSuccess,
            });

            return NextResponse.json({ board });
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to set the active board.");
    }
}