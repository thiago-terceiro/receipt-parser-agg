"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

import { GoogleAuthControls } from "@/components/google-auth-controls";
import { useTranslations } from "@/components/locale-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import { type AppLocale } from "@/lib/i18n/config";
import { logInfo, logWarn } from "@/lib/observability";
import {
    observabilityAttributes,
    observabilityEvents,
    observabilityFields,
} from "@/lib/observability-schema";

export type PendingBoardInviteDetails = {
    boardId: string;
    boardName: string;
    role: string;
    email: string | null;
    status?: "pending" | "accepted" | "expired" | "invalid";
    isExpired?: boolean;
    isAccepted?: boolean;
};

type InviteAcceptanceCardProps = {
    canUseGoogleAuth: boolean;
    canUseGitHubAuth?: boolean;
    initialError?: string | null;
    initialSignedInEmail?: string | null;
    initialStatus?: "authenticated" | "unauthenticated";
    inviteDetails?: PendingBoardInviteDetails | null;
    isTestAuthEnabled?: boolean;
    isCredentialsAuthEnabled?: boolean;
    locale: AppLocale;
    token: string | null;
};

const isInviteEmailMismatchError = (message: string | null) => {
    if (!message) {
        return false;
    }

    return message.toLowerCase().includes("does not match this invite");
};

export const InviteAcceptanceCard = ({
    canUseGoogleAuth,
    canUseGitHubAuth,
    initialError = null,
    initialSignedInEmail = null,
    initialStatus,
    inviteDetails = null,
    isTestAuthEnabled,
    isCredentialsAuthEnabled,
    locale,
    token,
}: InviteAcceptanceCardProps) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const translations = useTranslations();
    const [error, setError] = useState<string | null>(initialError);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const resolvedStatus = status === "loading" && initialStatus
        ? initialStatus
        : status;
    const signedInEmail = session?.user?.email ?? initialSignedInEmail;
    const isInviteEmailMismatch = isInviteEmailMismatchError(error) || Boolean(
        inviteDetails?.email &&
        signedInEmail &&
        inviteDetails.email.toLowerCase() !== signedInEmail.toLowerCase(),
    );
    const inviteCallbackUrl = token
        ? getPathname({
            locale,
            href: {
                pathname: "/invite",
                query: { token },
            },
        })
        : getPathname({ locale, href: "/invite" });

    const handleAcceptInvite = async () => {
        if (!token) return;
        setIsAccepting(true);
        setError(null);

        try {
            const response = await fetch("/api/invites/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                const message = data?.error || "Unable to accept the board invite.";
                setError(message);
                logWarn("Invite acceptance failed in browser.", {
                    [observabilityFields.event]: observabilityEvents.uiInvitesAcceptFailed,
                    [observabilityFields.errorMessage]: message,
                });
                setIsAccepting(false);
                return;
            }

            logInfo("Accepted board invite in browser.", {
                [observabilityFields.event]: observabilityEvents.uiInvitesAcceptSuccess,
                [observabilityAttributes.inviteRole]: data?.invite?.role,
            });
            setIsSuccess(true);
            const boardId = data?.invite?.board_id;
            if (boardId) {
                router.push(
                    getPathname({
                        locale,
                        href: {
                            pathname: "/groceries",
                            query: { board: boardId },
                        },
                    }),
                );
            } else {
                router.push(getPathname({ locale, href: "/groceries" }));
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to accept the board invite.";
            setError(message);
            logWarn("Invite acceptance failed in browser.", {
                [observabilityFields.event]: observabilityEvents.uiInvitesAcceptFailed,
                [observabilityFields.errorMessage]: message,
            });
            setIsAccepting(false);
        }
    };

    if (!token) {
        return (
            <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
                <CardHeader>
                    <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                    <CardDescription>
                        {translations.invite.noToken}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!inviteDetails) {
        return (
            <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
                <CardHeader>
                    <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                    <CardDescription>
                        {translations.invite.expired}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="secondary">
                        <Link href="/" locale={locale}>{translations.groceries.backToHome}</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (resolvedStatus !== "authenticated") {
        return (
            <div className="grid gap-4">
                {!inviteDetails?.isExpired && !inviteDetails?.isAccepted ? (
                    <GoogleAuthControls
                        canUseGoogleAuth={canUseGoogleAuth}
                        canUseGitHubAuth={canUseGitHubAuth}
                        callbackUrl={inviteCallbackUrl}
                        isCredentialsAuthEnabled={isCredentialsAuthEnabled}
                        isTestAuthEnabled={isTestAuthEnabled}
                    />
                ) : null}
                <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
                    <CardHeader>
                        <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                        <CardDescription>
                            {translations.invite.signInPrompt(inviteDetails?.boardName)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {inviteDetails?.isAccepted ? (
                            <Alert className="mb-4">
                                <AlertDescription>{translations.invite.alreadyAccepted}</AlertDescription>
                            </Alert>
                        ) : null}
                        {inviteDetails?.isExpired ? (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{translations.invite.expired}</AlertDescription>
                            </Alert>
                        ) : null}
                        {error ? (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}
                        <Button asChild variant="secondary">
                            <Link href="/" locale={locale}>{translations.groceries.backToHome}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
            <CardHeader>
                <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                <CardDescription>
                    {isSuccess
                        ? translations.invite.acceptedDescription
                        : translations.invite.invitedDescription(inviteDetails?.boardName, inviteDetails?.role)}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {isSuccess ? (
                    <Alert>
                        <AlertDescription>
                            {translations.invite.redirecting}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {!isSuccess && inviteDetails && !inviteDetails.isExpired && !inviteDetails.isAccepted ? (
                    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4 text-sm grid gap-1">
                        <p className="font-semibold text-foreground m-0">
                            {translations.invite.boardLabel}: {inviteDetails.boardName}
                        </p>
                        <p className="text-muted-foreground capitalize m-0">
                            {translations.invite.roleLabel}: {inviteDetails.role}
                        </p>
                    </div>
                ) : null}

                {!isSuccess && signedInEmail ? (
                    <p className="text-sm text-muted-foreground m-0">
                        {translations.invite.signedInAs(signedInEmail)}
                    </p>
                ) : null}

                {inviteDetails?.isAccepted ? (
                    <Alert>
                        <AlertDescription>
                            {translations.invite.alreadyAccepted}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {inviteDetails?.isExpired ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {translations.invite.expired}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {error || isInviteEmailMismatch ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {isInviteEmailMismatch
                                ? translations.invite.emailMismatch
                                : error}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {!isSuccess ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        {isInviteEmailMismatch ? (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    void signOut({
                                        callbackUrl: getPathname({
                                            locale,
                                            href: {
                                                pathname: "/invite",
                                                query: { token },
                                            },
                                        }),
                                    });
                                }}
                            >
                                {translations.invite.signOutAnotherAccount}
                            </Button>
                        ) : null}
                        {inviteDetails?.isAccepted && inviteDetails?.boardId ? (
                            <Button asChild>
                                <Link
                                    href={{
                                        pathname: "/groceries",
                                        query: { board: inviteDetails.boardId },
                                    }}
                                    locale={locale}
                                >
                                    {translations.invite.goToBoard}
                                </Link>
                            </Button>
                        ) : !inviteDetails?.isExpired && !inviteDetails?.isAccepted ? (
                            <Button
                                type="button"
                                disabled={isAccepting || isInviteEmailMismatch}
                                onClick={handleAcceptInvite}
                            >
                                {isAccepting ? translations.invite.accepting : translations.invite.acceptInvitation}
                            </Button>
                        ) : null}
                        {initialError ? (
                            <Button
                                type="button"
                                variant={isInviteEmailMismatch ? "ghost" : "secondary"}
                                onClick={() => {
                                    setError(null);
                                    router.refresh();
                                }}
                            >
                                {translations.invite.retry}
                            </Button>
                        ) : null}
                        <Button asChild variant="outline">
                            <Link href="/" locale={locale}>
                                {translations.groceries.backToHome}
                            </Link>
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
};
