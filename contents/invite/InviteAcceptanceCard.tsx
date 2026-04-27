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

type InviteAcceptanceCardProps = {
    canUseGoogleAuth: boolean;
    initialError?: string | null;
    initialSignedInEmail?: string | null;
    initialStatus?: "authenticated" | "unauthenticated";
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
    initialError = null,
    initialSignedInEmail = null,
    initialStatus,
    locale,
    token,
}: InviteAcceptanceCardProps) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const translations = useTranslations();
    const [error, setError] = useState<string | null>(initialError);
    const resolvedStatus = status === "loading" && initialStatus
        ? initialStatus
        : status;
    const signedInEmail = session?.user?.email ?? initialSignedInEmail;
    const isInviteEmailMismatch = isInviteEmailMismatchError(error);
    const inviteCallbackUrl = token
        ? getPathname({
            locale,
            href: {
                pathname: "/invite",
                query: { token },
            },
        })
        : getPathname({ locale, href: "/invite" });

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

    if (resolvedStatus !== "authenticated") {
        return (
            <div className="grid gap-4">
                <GoogleAuthControls
                    canUseGoogleAuth={canUseGoogleAuth}
                    callbackUrl={inviteCallbackUrl}
                />
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
                    {error
                        ? "The invite could not be completed automatically."
                        : "The invite is being finalized."}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {error ? (
                    <div className="grid gap-3">
                        <Alert variant="destructive">
                            <AlertDescription>
                                {isInviteEmailMismatch
                                    ? "This invite belongs to a different email address than the one currently signed in. Sign out and continue with the invited Google account, then open the invite link again."
                                    : error}
                            </AlertDescription>
                        </Alert>
                        {signedInEmail ? (
                            <p className="text-sm text-muted-foreground">
                                Current signed-in email: {signedInEmail}
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
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
                                    Sign out and use another account
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                variant={isInviteEmailMismatch ? "ghost" : "secondary"}
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
                            Invite accepted. Redirecting to the shared board...
                        </AlertDescription>
                    </Alert>
                ) : null}
            </CardContent>
        </Card>
    );
};