import { NextResponse } from "next/server";

import {
    BoardRouteError,
    listBoardMembersForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export const runtime = "nodejs";

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        logWarn("Board members request failed.", {
            [observabilityFields.event]: observabilityEvents.apiBoardsMembersRequestFailed,
            [observabilityFields.errorMessage]: error.message,
            [observabilityAttributes.httpStatusCode]: error.statusCode,
        });
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    logError("Board members request failed.", {
        [observabilityFields.event]: observabilityEvents.apiBoardsMembersRequestFailed,
        [observabilityFields.errorMessage]: message,
        [observabilityAttributes.httpStatusCode]: 500,
    });
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ boardId: string }> },
) {
    try {
        const response = await withSpan("api.boards.members.get", async (span) => {
            const identity = await requireBoardIdentity();
            const { boardId } = await params;
            const members = await listBoardMembersForIdentity(identity, boardId);

            span.setAttributes({
                [observabilityAttributes.boardMemberCount]: members.length,
            });
            logInfo("Loaded board members.", {
                [observabilityFields.event]: observabilityEvents.apiBoardsMembersListSuccess,
                [observabilityAttributes.boardMemberCount]: members.length,
            });

            return NextResponse.json({ members });
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to load board members.");
    }
}