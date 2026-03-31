"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

const GoogleMark = () => (
  <span className="inline-grid h-[22px] w-[22px] place-items-center" aria-hidden="true">
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

const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
  const source = name?.trim() || email?.trim() || "Receipt AI";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

type GoogleAuthControlsProps = {
  canUseGoogleAuth: boolean;
};

export const GoogleAuthControls = ({ canUseGoogleAuth }: GoogleAuthControlsProps) => {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const buttonLabel = isAuthenticated ? "Sign out" : "Continue with Google";
  const authNote = canUseGoogleAuth
    ? isAuthenticated
      ? "Google account connected."
      : "Use Google to start a session in this workspace."
    : "Set AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET to enable Google login.";

  const handleAuthClick = () => {
    if (isAuthenticated) {
      void signOut({ callbackUrl: "/" });
      return;
    }
    void signIn("google", { callbackUrl: "/" });
  };

  return (
    <section
      className="mb-4 flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[rgba(255,250,243,0.72)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px] max-[900px]:flex-col max-[900px]:items-stretch"
      aria-label="Authentication controls"
    >
      {/* Auth description */}
      <div className="grid gap-1">
        <p className="m-0 text-[1rem] font-bold">Google login</p>
        <p className="m-0 text-muted-foreground text-[0.9rem] leading-[1.5]">{authNote}</p>
      </div>

      {/* Auth actions */}
      <div className="flex items-center gap-3 max-[900px]:justify-between max-[900px]:flex-wrap">
        {isAuthenticated ? (
          <div className="flex items-center gap-2.5" aria-live="polite">
            {session.user?.image ? (
              <img
                className="size-[42px] rounded-full border border-[var(--border)] object-cover"
                src={session.user.image}
                alt={session.user.name ?? "User"}
              />
            ) : (
              <div
                className="grid size-[42px] place-items-center rounded-full bg-gradient-to-br from-[var(--accent-dark)] to-[var(--accent)] text-sm font-bold text-[#fffaf3]"
                aria-hidden="true"
              >
                {getInitials(session.user?.name, session.user?.email)}
              </div>
            )}
            <div className="grid gap-0.5">
              <p className="m-0 text-[1rem] font-bold">{session.user?.name ?? "Signed in"}</p>
              <p className="m-0 text-muted-foreground text-[0.9rem]">
                {session.user?.email ?? "Google account"}
              </p>
            </div>
          </div>
        ) : null}

        <Button
          variant="secondary"
          type="button"
          disabled={isLoading || (!isAuthenticated && !canUseGoogleAuth)}
          onClick={handleAuthClick}
          className="min-w-[220px] border-[var(--border)] bg-white/95 max-[900px]:w-full"
        >
          <GoogleMark />
          <span>{isLoading ? "Checking Google login..." : buttonLabel}</span>
        </Button>
      </div>
    </section>
  );
};
