import { setRequestLocale } from "next-intl/server";

import { isCredentialsAuthEnabled, isTestAuthEnabled } from "@/auth";
import { InviteAcceptanceCard } from "@/contents/invite/InviteAcceptanceCard";
import { getPendingBoardInviteDetails } from "@/lib/boards-server";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { logInfo, withSpan } from "@/lib/observability";
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
    const hasGitHubAuthConfigured = Boolean(
        (process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID) &&
        (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET),
    );
    const identity = await getSessionIdentity();

    setRequestLocale(resolvedLocale);

    let inviteDetails = null;
    if (token) {
        try {
            inviteDetails = await withSpan("invite.page.details", async () => {
                return getPendingBoardInviteDetails(token);
            }, {
                [observabilityAttributes.inviteTokenPresent]: true,
                [observabilityAttributes.userIsAuthenticated]: Boolean(identity?.userId),
            });
            logInfo("Loaded invite details during invite page render.", {
                [observabilityFields.event]: observabilityEvents.invitePageView,
            });
        } catch {
            inviteDetails = null;
        }
    }

    return (
        <main className="mx-auto grid w-[min(900px,calc(100vw-32px))] gap-6 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),900px)] max-[900px]:pt-5">
            <InviteAcceptanceCard
                canUseGoogleAuth={hasGoogleAuthConfigured}
                canUseGitHubAuth={hasGitHubAuthConfigured}
                initialSignedInEmail={identity?.email ?? null}
                initialStatus={identity?.userId ? "authenticated" : "unauthenticated"}
                inviteDetails={inviteDetails}
                isCredentialsAuthEnabled={isCredentialsAuthEnabled()}
                isTestAuthEnabled={isTestAuthEnabled()}
                locale={resolvedLocale}
                token={token}
            />
        </main>
    );
};

export default InvitePage;
