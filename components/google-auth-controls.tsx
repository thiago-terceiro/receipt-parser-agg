"use client";

import { Menu } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
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
      <section className="mb-4 flex justify-start" aria-label={translations.auth.sectionLabel}>
        <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="border-[var(--border)] bg-[var(--surface-soft-muted)] shadow-[var(--shadow)]"
              aria-label={translations.auth.sectionLabel}
            >
              <Menu className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="mobile-controls-dialog right-auto max-w-none sm:left-3 sm:top-3 sm:max-w-none sm:translate-x-0 sm:translate-y-0"
            aria-describedby={undefined}
          >
            <DialogHeader className="pr-10">
              <DialogTitle>{translations.auth.sectionLabel}</DialogTitle>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-4">
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-[var(--shadow)]">
                {renderAuthBlock(
                  "mt-1 h-11 w-full border-[var(--border)] bg-[var(--surface-plain)]",
                )}
              </div>
              <div className="flex flex-col gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-[var(--shadow)]">
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
      className="mb-4 flex gap-5 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px]"
      aria-label={translations.auth.sectionLabel}
    >
      {renderAuthBlock(
        "mt-1 h-11 min-w-[190px] border-[var(--border)] bg-[var(--surface-plain)] md:w-auto",
      )}
      {renderPreferencesBlock("flex flex-row gap-4")}
    </section>
  );
};
