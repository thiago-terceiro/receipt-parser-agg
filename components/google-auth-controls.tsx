"use client";

import { KeyRound, Menu, X } from "lucide-react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale, useTranslations } from "@/components/locale-utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPathname } from "@/i18n/navigation";

const MOBILE_CONTROLS_QUERY = "(max-width: 700px)";

const GoogleMark = () => (
  <span
    className="inline-grid h-[22px] w-[22px] place-items-center"
    aria-hidden="true"
  >
    <svg viewBox="0 0 18 18" width="18" height="18" role="presentation">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.13 4.13 0 0 1-1.8 2.71v2.25h2.92c1.7-1.57 2.68-3.88 2.68-6.6Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.95-2.2l-2.92-2.25c-.81.54-1.85.86-3.03.86-2.33 0-4.3-1.57-5-3.68H1v2.32A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M4 10.73A5.4 5.4 0 0 1 3.72 9c0-.6.1-1.18.28-1.73V4.95H1A9 9 0 0 0 0 9c0 1.45.35 2.82 1 4.05l3-2.32Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.45.89 11.43 0 9 0A9 9 0 0 0 1 4.95l3 2.32c.7-2.1 2.67-3.69 5-3.69Z"
      />
    </svg>
  </span>
);

const getInitials = (
  name: string | null | undefined,
  email: string | null | undefined,
) => {
  const source = name?.trim() || email?.trim() || "Receipt AI";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

type GoogleAuthControlsProps = {
  canUseGoogleAuth: boolean;
  callbackUrl?: string;
};

export const GoogleAuthControls = ({
  canUseGoogleAuth,
  callbackUrl,
}: GoogleAuthControlsProps) => {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const translations = useTranslations();
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [username, setUsername] = useState("thiago");
  const [password, setPassword] = useState("password123");
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const homeHref = getPathname({ locale, href: "/" });
  const authCallbackUrl = callbackUrl ?? homeHref;
  const buttonLabel = isAuthenticated
    ? translations.auth.signOut
    : translations.auth.continueWithGoogle;

  const handleAuthClick = useCallback(() => {
    if (isAuthenticated) {
      void signOut({ callbackUrl: authCallbackUrl });
      return;
    }
    void signIn("google", { callbackUrl: authCallbackUrl });
  }, [authCallbackUrl, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_CONTROLS_QUERY);
    const updateMobileView = (event?: MediaQueryListEvent) => {
      setIsMobileView(event?.matches ?? mediaQuery.matches);
    };

    updateMobileView();
    mediaQuery.addEventListener("change", updateMobileView);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileView);
    };
  }, []);

  const renderAuthBlock = (buttonClassName: string) => (
    <div className="flex flex-col gap-1.5">
      {isAuthenticated ? (
        <div
          className="flex min-w-0 items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-2.5"
          aria-live="polite"
        >
          {session.user?.image ? (
            <Image
              className="size-[42px] rounded-full border border-[var(--border)] object-cover"
              src={session.user.image}
              alt={session.user.name ?? translations.auth.userAlt}
              width={42}
              height={42}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="grid size-[42px] place-items-center rounded-full bg-gradient-to-br from-[var(--accent-dark)] to-[var(--accent)] text-sm font-bold text-[#fffaf3]"
              aria-hidden="true"
            >
              {getInitials(session.user?.name, session.user?.email)}
            </div>
          )}
          <div className="grid min-w-0 gap-0.5">
            <p className="m-0 truncate text-[1rem] font-bold">
              {session.user?.name ?? translations.auth.signedInFallback}
            </p>
            <p className="m-0 truncate text-[0.9rem] text-muted-foreground">
              {session.user?.email ?? translations.auth.emailFallback}
            </p>
          </div>
        </div>
      ) : null}
      <Button
        variant="secondary"
        type="button"
        disabled={isLoading || (!isAuthenticated && !canUseGoogleAuth)}
        onClick={handleAuthClick}
        className={buttonClassName}
      >
        <GoogleMark />
        <span>{isLoading ? translations.auth.checking : buttonLabel}</span>
      </Button>
      {!isAuthenticated && !isLoading ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            type="button"
            className={buttonClassName}
            onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
          >
            <KeyRound className="size-4" />
            <span>Password / Test Login</span>
          </Button>
          {isCredentialsOpen ? (
            <div className="mt-2 flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain)] p-4 shadow-md">
              <div className="flex items-center justify-between">
                <p className="m-0 text-sm font-bold text-foreground">Sign in with Password</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCredentialsOpen(false)}
                  aria-label="Close credentials"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <p className="m-0 text-xs text-muted-foreground">
                Quick select an account or enter custom credentials:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Thiago", user: "thiago" },
                  { label: "Priscila", user: "priscila" },
                  { label: "Test Owner", user: "test" },
                  { label: "Test Partner", user: "partner" },
                ].map((account) => (
                  <Button
                    key={account.user}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs font-semibold"
                    onClick={() => {
                      setUsername(account.user);
                      setPassword("password123");
                      setCredentialsError(null);
                    }}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" htmlFor="credentials-username">
                  Username or Email
                </label>
                <input
                  id="credentials-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="thiago, test, etc."
                  className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" htmlFor="credentials-password">
                  Password
                </label>
                <input
                  id="credentials-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                />
              </div>
              {credentialsError ? (
                <p className="m-0 text-xs font-medium text-destructive">{credentialsError}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCredentialsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmittingCredentials || !username.trim() || !password.trim()}
                  onClick={async () => {
                    setIsSubmittingCredentials(true);
                    setCredentialsError(null);
                    try {
                      const res = await signIn("credentials", {
                        username: username.trim(),
                        password,
                        callbackUrl: authCallbackUrl,
                        redirect: false,
                      });
                      if (res?.error) {
                        setCredentialsError("Invalid username or password.");
                        setIsSubmittingCredentials(false);
                      } else if (res?.url) {
                        window.location.href = res.url;
                      } else {
                        window.location.reload();
                      }
                    } catch {
                      setCredentialsError("Sign in failed. Please check your credentials.");
                      setIsSubmittingCredentials(false);
                    }
                  }}
                >
                  {isSubmittingCredentials ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderPreferencesBlock = (className: string) => (
    <div className={className}>
      <ThemeToggle />
      <LocaleSwitcher />
    </div>
  );

  if (isMobileView) {
    return (
      <section
        className="mb-4 flex items-center justify-between rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 shadow-[var(--shadow)] backdrop-blur-[14px]"
        aria-label={translations.auth.sectionLabel}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] font-bold text-sm text-[#fffaf3] shadow-sm">
            R
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            Receipt AI
          </span>
          {isAuthenticated ? (
            <span className="ml-1 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {session.user?.name?.split(" ")[0]}
            </span>
          ) : null}
        </div>

        <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-10 rounded-full border-[var(--border)] bg-[var(--surface-plain)] shadow-sm hover:bg-[var(--surface-plain-soft)]"
              aria-label={translations.auth.sectionLabel}
            >
              <Menu className="size-5 text-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="mobile-controls-dialog fixed left-3 right-3 top-3 w-auto max-w-none rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-2xl"
            aria-describedby={undefined}
          >
            <DialogHeader className="pr-10">
              <DialogTitle className="text-xl font-bold">{translations.auth.sectionLabel}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-sm">
                {renderAuthBlock(
                  "h-11 w-full border-[var(--border)] bg-[var(--surface-plain)] font-medium text-sm",
                )}
              </div>
              <div className="flex flex-col gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-sm">
                {renderPreferencesBlock("flex flex-col gap-4")}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  return (
    <section
      className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px]"
      aria-label={translations.auth.sectionLabel}
    >
      <div className="flex flex-col gap-2">
        {renderAuthBlock(
          "h-11 min-w-[200px] border-[var(--border)] bg-[var(--surface-plain)] hover:bg-[var(--surface-plain-soft)] font-medium text-sm",
        )}
      </div>
      {renderPreferencesBlock("flex flex-row items-center gap-4")}
    </section>
  );
};
