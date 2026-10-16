import { NextResponse } from "next/server";

import {
    BoardRouteError,
    createBoardForIdentity,
    listBoardsForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export const runtime = "nodejs";

type CreateBoardPayload = {
    name?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        logWarn("Boards route request failed.", {
            [observabilityFields.event]: observabilityEvents.apiBoardsRequestFailed,
            [observabilityFields.errorMessage]: error.message,
            [observabilityAttributes.httpStatusCode]: error.statusCode,
        });
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    logError("Boards route request failed.", {
        [observabilityFields.event]: observabilityEvents.apiBoardsRequestFailed,
        [observabilityFields.errorMessage]: message,
        [observabilityAttributes.httpStatusCode]: 500,
    });
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function GET() {
    try {
        const response = await withSpan("api.boards.get", async (span) => {
            const identity = await requireBoardIdentity();
            const boards = await listBoardsForIdentity(identity);

            span.setAttributes({
                [observabilityAttributes.boardCount]: boards.length,
            });
            logInfo("Loaded boards for identity.", {
                [observabilityFields.event]: observabilityEvents.apiBoardsListSuccess,
                [observabilityAttributes.boardCount]: boards.length,
            });

            return NextResponse.json(
                { boards },
                {
                    headers: {
                        "Cache-Control": "private, no-cache",
                    },
                },
            );
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to load boards.");
    }
}

export async function POST(request: Request) {
    try {
        const response = await withSpan("api.boards.create", async () => {
            const identity = await requireBoardIdentity();
            const payload = (await request.json()) as CreateBoardPayload;
            const board = await createBoardForIdentity(identity, payload.name);

            logInfo("Created board for identity.", {
                [observabilityFields.event]: observabilityEvents.apiBoardsCreateSuccess,
            });

            return NextResponse.json({ board }, { status: 201 });
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to create the board.");
    }
}