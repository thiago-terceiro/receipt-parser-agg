import { setRequestLocale } from "next-intl/server";

import { InviteAcceptanceCard } from "@/contents/invite/InviteAcceptanceCard";
import { redirect } from "@/i18n/navigation";
import { acceptBoardInviteForIdentity } from "@/lib/boards-server";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { logError, logInfo, logWarn, withSpan } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";
import { getSessionIdentity } from "@/lib/session";

type InvitePageProps = {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ token?: string }>;
};

const InvitePage = async ({ params, searchParams }: InvitePageProps) => {
    const { locale } = await params;
    const resolvedLocale = getLocaleFromSegment(locale);
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const token = resolvedSearchParams?.token?.trim() || null;
    const hasGoogleAuthConfigured = Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
    );
    const identity = token ? await getSessionIdentity() : null;
    let acceptedBoardId: string | null = null;
    let initialError: string | null = null;

    setRequestLocale(resolvedLocale);

    if (token && identity?.userId) {
        try {
            const authenticatedIdentity = {
                email: identity.email,
                image: identity.image,
                name: identity.name,
                userId: identity.userId,
            };

            const invite = await withSpan("invite.page.accept", async () => {
                return acceptBoardInviteForIdentity(
                    authenticatedIdentity,
                    token,
                );
            }, {
                [observabilityAttributes.inviteTokenPresent]: true,
                [observabilityAttributes.userIsAuthenticated]: true,
            });
            acceptedBoardId = invite.board_id;
            logInfo("Accepted board invite during invite page render.", {
                [observabilityFields.event]: observabilityEvents.invitePageAcceptSuccess,
                [observabilityAttributes.inviteRole]: invite.role,
            });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Unable to accept the board invite.";

            if (error instanceof Error) {
                logWarn("Invite page failed to accept board invite.", {
                    [observabilityFields.event]: observabilityEvents.invitePageAcceptFailed,
                    [observabilityFields.errorMessage]: message,
                });
            } else {
                logError("Invite page failed to accept board invite.", {
                    [observabilityFields.event]: observabilityEvents.invitePageAcceptFailed,
                    [observabilityFields.errorMessage]: message,
                });
            }

            initialError = error instanceof Error
                ? error.message
                : "Unable to accept the board invite.";
        }
    }

    if (acceptedBoardId) {
        logInfo("Redirecting to accepted board from invite page.", {
            [observabilityFields.event]: observabilityEvents.invitePageRedirectToBoard,
        });
        redirect({
            href: {
                pathname: "/groceries",
                query: { board: acceptedBoardId },
            },
            locale: resolvedLocale,
        });
    }

    return (
        <main className="mx-auto grid w-[min(900px,calc(100vw-32px))] gap-6 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),900px)] max-[900px]:pt-5">
            <InviteAcceptanceCard
                canUseGoogleAuth={hasGoogleAuthConfigured}
                initialError={initialError}
                initialSignedInEmail={identity?.email ?? null}
                initialStatus={identity?.userId ? "authenticated" : "unauthenticated"}
                locale={resolvedLocale}
                token={token}
            />
        </main>
    );
};

export default InvitePage;