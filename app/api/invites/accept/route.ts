import { NextResponse } from "next/server";

import {
    acceptBoardInviteForIdentity,
    BoardRouteError,
    requireBoardIdentity,
} from "@/lib/boards-server";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export const runtime = "nodejs";

type AcceptInvitePayload = {
    token?: unknown;
};

const toErrorResponse = (error: unknown, fallback: string) => {
    if (error instanceof BoardRouteError) {
        logWarn("Invite accept request failed.", {
            [observabilityFields.event]: observabilityEvents.apiInvitesAcceptRequestFailed,
            [observabilityFields.errorMessage]: error.message,
            [observabilityAttributes.httpStatusCode]: error.statusCode,
        });
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : fallback;
    logError("Invite accept request failed.", {
        [observabilityFields.event]: observabilityEvents.apiInvitesAcceptRequestFailed,
        [observabilityFields.errorMessage]: message,
        [observabilityAttributes.httpStatusCode]: 500,
    });
    return NextResponse.json({ error: message }, { status: 500 });
};

export async function POST(request: Request) {
    try {
        const response = await withSpan("api.invites.accept.post", async () => {
            const identity = await requireBoardIdentity();
            let payload: AcceptInvitePayload;
            try {
                payload = (await request.json()) as AcceptInvitePayload;
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
            const invite = await acceptBoardInviteForIdentity(identity, payload.token);

            logInfo("Accepted board invite.", {
                [observabilityFields.event]: observabilityEvents.apiInvitesAcceptSuccess,
                [observabilityAttributes.inviteRole]: invite.role,
            });

            return NextResponse.json({ invite });
        });

        return response;
    } catch (error) {
        return toErrorResponse(error, "Unable to accept the board invite.");
    }
}