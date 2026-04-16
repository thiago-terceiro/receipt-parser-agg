"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleAuthControls } from "@/components/google-auth-controls";
import { useTranslations } from "@/components/locale-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localizePath, type AppLocale } from "@/lib/i18n/config";

type InviteAcceptanceCardProps = {
    canUseGoogleAuth: boolean;
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
    locale,
    token,
}: InviteAcceptanceCardProps) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const translations = useTranslations();
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const signedInEmail = session?.user?.email ?? null;
    const isInviteEmailMismatch = isInviteEmailMismatchError(error);

    useEffect(() => {
        if (!token || status !== "authenticated" || isAccepting) {
            return;
        }

        let ignore = false;

        const acceptInvite = async () => {
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
                const payload = (await response.json()) as {
                    error?: string;
                    invite?: { board_id?: string };
                };

                if (!response.ok || !payload.invite?.board_id) {
                    throw new Error(payload.error || "Unable to accept the invite.");
                }

                if (!ignore) {
                    router.replace(
                        `${localizePath("/groceries", locale)}?board=${payload.invite.board_id}`,
                    );
                    router.refresh();
                }
            } catch (requestError) {
                if (!ignore) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : "Unable to accept the invite.",
                    );
                }
            } finally {
                if (!ignore) {
                    setIsAccepting(false);
                }
            }
        };

        void acceptInvite();

        return () => {
            ignore = true;
        };
    }, [isAccepting, locale, router, signedInEmail, status, token]);

    if (!token) {
        return (
            <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
                <CardHeader>
                    <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                    <CardDescription>
                        No invite token was provided in the URL.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (status !== "authenticated") {
        return (
            <div className="grid gap-4">
                <GoogleAuthControls canUseGoogleAuth={canUseGoogleAuth} />
                <Card className="rounded-[28px] border-[var(--border)] shadow-[var(--shadow)]">
                    <CardHeader>
                        <CardTitle>{translations.groceries.boards.inviteTitle}</CardTitle>
                        <CardDescription>
                            Sign in with Google to accept this board invite.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : null}
                        <Button asChild variant="secondary">
                            <a href={localizePath("/", locale)}>{translations.groceries.backToHome}</a>
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
                    {isAccepting
                        ? "Validating the invite and attaching this account to the board..."
                        : "The invite is ready to be accepted."}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {error ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {isInviteEmailMismatch
                                ? "This invite belongs to a different email address than the one currently signed in. Sign out and continue with the invited Google account, then open the invite link again."
                                : error}
                        </AlertDescription>
                    </Alert>
                ) : null}
                {error && isInviteEmailMismatch ? (
                    <div className="grid gap-3">
                        {signedInEmail ? (
                            <p className="text-sm text-muted-foreground">
                                Current signed-in email: {signedInEmail}
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    void signOut({
                                        callbackUrl: `${localizePath("/invite", locale)}?token=${encodeURIComponent(token)}`,
                                    });
                                }}
                            >
                                Sign out and use another account
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setError(null);
                                    router.refresh();
                                }}
                            >
                                Retry invite check
                            </Button>
                        </div>
                    </div>
                ) : null}
                {!error ? (
                    <Alert>
                        <AlertDescription>
                            {isAccepting
                                ? "Processing invite..."
                                : "Invite accepted. Redirecting to the shared board..."}
                        </AlertDescription>
                    </Alert>
                ) : null}
            </CardContent>
        </Card>
    );
};