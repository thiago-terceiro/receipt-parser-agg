"use client";

import { KeyRound, Menu, X } from "lucide-react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useState } from "react";

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

const GitHubMark = () => (
  <span
    className="inline-grid h-[22px] w-[22px] place-items-center"
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" role="presentation">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
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
  canUseGitHubAuth?: boolean;
  callbackUrl?: string;
  isTestAuthEnabled?: boolean;
  isCredentialsAuthEnabled?: boolean;
};

export const GoogleAuthControls = ({
  canUseGoogleAuth,
  canUseGitHubAuth = true,
  callbackUrl,
  isTestAuthEnabled: isTestAuthEnabledProp,
  isCredentialsAuthEnabled: isCredentialsAuthEnabledProp,
}: GoogleAuthControlsProps) => {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const translations = useTranslations();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isTestAuthActive =
    isCredentialsAuthEnabledProp ??
    isTestAuthEnabledProp ??
    (process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_TEST_AUTH === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === "true");

  const isQuickSelectEnabled =
    isTestAuthEnabledProp ??
    (process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_TEST_AUTH === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === "true");

  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState(isQuickSelectEnabled ? "test" : "");
  const [password, setPassword] = useState(isQuickSelectEnabled ? "password123" : "");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [credentialsSuccess, setCredentialsSuccess] = useState<string | null>(null);
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
      if (typeof window !== "undefined") {
        try {
          Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith("receipt-ai-groceries-dashboard")) {
              window.localStorage.removeItem(key);
            }
          });
        } catch {
          // ignore storage clearing errors
        }
      }
      void signOut({ callbackUrl: authCallbackUrl });
      return;
    }
    void signIn("google", { callbackUrl: authCallbackUrl });
  }, [authCallbackUrl, isAuthenticated]);

  const handleGitHubAuthClick = useCallback(() => {
    void signIn("github", { callbackUrl: authCallbackUrl });
  }, [authCallbackUrl]);



  const renderAuthBlock = (buttonClassName: string, prefix: "mobile" | "desktop" = "desktop") => (
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
      {!isAuthenticated ? (
        <Button
          variant="secondary"
          type="button"
          disabled={isLoading || canUseGitHubAuth === false}
          onClick={handleGitHubAuthClick}
          className={buttonClassName}
        >
          <GitHubMark />
          <span>{isLoading ? translations.auth.checking : translations.auth.continueWithGitHub}</span>
        </Button>
      ) : null}
      {!isAuthenticated && !isLoading && isTestAuthActive ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            type="button"
            className={buttonClassName}
            aria-expanded={isCredentialsOpen}
            aria-controls={`${prefix}-credentials-auth-panel`}
            onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
          >
            <KeyRound className="size-4" aria-hidden="true" />
            <span>{translations.auth.credentials.buttonLabel}</span>
          </Button>
          {isCredentialsOpen ? (
            <div
              id={`${prefix}-credentials-auth-panel`}
              role="group"
              aria-labelledby={`${prefix}-credentials-auth-heading`}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsCredentialsOpen(false);
                }
              }}
              className="mt-2 flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain)] p-4 shadow-md"
            >
              <div className="flex items-center justify-between">
                <p id={`${prefix}-credentials-auth-heading`} className="m-0 text-sm font-bold text-foreground">
                  {authMode === "signin"
                    ? translations.auth.credentials.signInTitle
                    : translations.auth.credentials.signUpTitle}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCredentialsOpen(false)}
                  aria-label={translations.auth.credentials.closeAria}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Mode Toggle */}
              <div
                role="group"
                aria-label={translations.auth.credentials.modeAria}
                className="grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--surface-plain-soft)] p-1"
              >
                <Button
                  type="button"
                  variant={authMode === "signin" ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={authMode === "signin"}
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    setAuthMode("signin");
                    setCredentialsError(null);
                    setCredentialsSuccess(null);
                  }}
                >
                  {translations.auth.credentials.signInTab}
                </Button>
                <Button
                  type="button"
                  variant={authMode === "signup" ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={authMode === "signup"}
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    setAuthMode("signup");
                    setCredentialsError(null);
                    setCredentialsSuccess(null);
                    setUsername("");
                    setPassword("");
                  }}
                >
                  {translations.auth.credentials.signUpTab}
                </Button>
              </div>

              {authMode === "signin" && isQuickSelectEnabled ? (
                <>
                  <p className="m-0 text-xs text-muted-foreground">
                    {translations.auth.credentials.quickSelectHint}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
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
                          setCredentialsSuccess(null);
                        }}
                      >
                        {account.label}
                      </Button>
                    ))}
                  </div>
                </>
              ) : null}

              {authMode === "signup" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" htmlFor={`${prefix}-credentials-fullname`}>
                    {translations.auth.credentials.fullNameLabel}
                  </label>
                  <input
                    id={`${prefix}-credentials-fullname`}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={translations.auth.credentials.fullNamePlaceholder}
                    className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" htmlFor={`${prefix}-credentials-username`}>
                  {authMode === "signup"
                    ? translations.auth.credentials.emailLabel
                    : translations.auth.credentials.usernameLabel}
                </label>
                <input
                  id={`${prefix}-credentials-username`}
                  type={authMode === "signup" ? "email" : "text"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    authMode === "signup"
                      ? translations.auth.credentials.emailPlaceholder
                      : translations.auth.credentials.usernamePlaceholder
                  }
                  className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" htmlFor={`${prefix}-credentials-password`}>
                  {translations.auth.credentials.passwordLabel}
                </label>
                <input
                  id={`${prefix}-credentials-password`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    authMode === "signup"
                      ? translations.auth.credentials.passwordSignUpPlaceholder
                      : translations.auth.credentials.passwordPlaceholder
                  }
                  className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                />
              </div>

              {authMode === "signup" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" htmlFor={`${prefix}-credentials-confirm`}>
                    {translations.auth.credentials.confirmPasswordLabel}
                  </label>
                  <input
                    id={`${prefix}-credentials-confirm`}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={translations.auth.credentials.confirmPasswordPlaceholder}
                    className="h-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ) : null}

              {credentialsError ? (
                <p role="alert" className="m-0 text-xs font-medium text-destructive">
                  {credentialsError}
                </p>
              ) : null}
              {credentialsSuccess ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="m-0 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                >
                  {credentialsSuccess}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                  onClick={() => {
                    const nextMode = authMode === "signin" ? "signup" : "signin";
                    setAuthMode(nextMode);
                    setCredentialsError(null);
                    setCredentialsSuccess(null);
                    if (nextMode === "signup") {
                      setUsername("");
                      setPassword("");
                    }
                  }}
                >
                  {authMode === "signin"
                    ? translations.auth.credentials.switchToSignUp
                    : translations.auth.credentials.switchToSignIn}
                </button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCredentialsOpen(false)}
                  >
                    {translations.common.cancel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isSubmittingCredentials ||
                      !username.trim() ||
                      !password.trim() ||
                      (authMode === "signup" && (!confirmPassword.trim() || password.length < 8))
                    }
                    onClick={async () => {
                      setIsSubmittingCredentials(true);
                      setCredentialsError(null);
                      setCredentialsSuccess(null);

                      if (authMode === "signup") {
                        if (password !== confirmPassword) {
                          setCredentialsError(translations.auth.credentials.passwordsDoNotMatch);
                          setIsSubmittingCredentials(false);
                          return;
                        }
                        if (password.length < 8) {
                          setCredentialsError(translations.auth.credentials.passwordTooShort);
                          setIsSubmittingCredentials(false);
                          return;
                        }

                        try {
                          const res = await fetch("/api/auth/register", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: username.trim(),
                              password,
                              name: fullName.trim() || null,
                            }),
                          });

                          const data = await res.json().catch(() => null);

                          if (!res.ok) {
                            setCredentialsError(data?.error || translations.auth.credentials.registrationFailed);
                            setIsSubmittingCredentials(false);
                            return;
                          }

                          setCredentialsSuccess(translations.auth.credentials.accountCreated);

                          const signInRes = await signIn("credentials", {
                            username: username.trim(),
                            password,
                            callbackUrl: authCallbackUrl,
                            redirect: false,
                          });

                          if (signInRes?.error) {
                            setCredentialsError(translations.auth.credentials.accountCreatedSignInFailed);
                            setIsSubmittingCredentials(false);
                          } else if (signInRes?.url) {
                            window.location.href = signInRes.url;
                          } else {
                            window.location.reload();
                          }
                        } catch {
                          setCredentialsError(translations.auth.credentials.registrationNetworkError);
                          setIsSubmittingCredentials(false);
                        }
                        return;
                      }

                      // Sign in
                      try {
                        const res = await signIn("credentials", {
                          username: username.trim(),
                          password,
                          callbackUrl: authCallbackUrl,
                          redirect: false,
                        });
                        if (res?.error) {
                          setCredentialsError(translations.auth.credentials.invalidCredentials);
                          setIsSubmittingCredentials(false);
                        } else if (res?.url) {
                          window.location.href = res.url;
                        } else {
                          window.location.reload();
                        }
                      } catch {
                        setCredentialsError(translations.auth.credentials.signInFailed);
                        setIsSubmittingCredentials(false);
                      }
                    }}
                  >
                    {isSubmittingCredentials
                      ? authMode === "signup"
                        ? translations.auth.credentials.submittingSignUp
                        : translations.auth.credentials.submittingSignIn
                      : authMode === "signup"
                        ? translations.auth.credentials.submitSignUp
                        : translations.auth.credentials.submitSignIn}
                  </Button>
                </div>
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

  return (
    <>
      {/* Mobile Controls (<981px) */}
      <section
        className="min-[981px]:hidden mb-4 flex items-center justify-between rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 shadow-[var(--shadow)] backdrop-blur-[14px]"
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
                  "mobile",
                )}
              </div>
              <div className="flex flex-col gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-sm">
                {renderPreferencesBlock("flex flex-col gap-4")}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {/* Desktop Controls (>=981px) */}
      <section
        className="hidden min-[981px]:flex mb-4 flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px]"
        aria-label={translations.auth.sectionLabel}
      >
        <div className="flex flex-col gap-2">
          {renderAuthBlock(
            "h-11 min-w-[200px] border-[var(--border)] bg-[var(--surface-plain)] hover:bg-[var(--surface-plain-soft)] font-medium text-sm",
            "desktop",
          )}
        </div>
        {renderPreferencesBlock("flex flex-row items-center gap-4")}
      </section>
    </>
  );
};
