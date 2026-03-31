"use client";

import { signIn, signOut, useSession } from "next-auth/react";

const GoogleMark = () => {
  return (
    <span className="google-mark" aria-hidden="true">
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
};

const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
  const source = name?.trim() || email?.trim() || "Receipt AI";
  const toInitial = (part: string) => part.charAt(0).toUpperCase();

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map(toInitial)
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
    <section className="auth-strip" aria-label="Authentication controls">
      <div className="auth-copy">
        <p className="auth-title">Google login</p>
        <p className="auth-note">{authNote}</p>
      </div>

      <div className="auth-actions">
        {isAuthenticated ? (
          <div className="auth-identity" aria-live="polite">
            {session.user?.image ? (
              <img className="auth-avatar" src={session.user.image} alt={session.user.name ?? "User"} />
            ) : (
              <div className="auth-avatar auth-fallback-avatar" aria-hidden="true">
                {getInitials(session.user?.name, session.user?.email)}
              </div>
            )}
            <div className="auth-copy">
              <p className="auth-title">{session.user?.name ?? "Signed in"}</p>
              <p className="auth-note">{session.user?.email ?? "Google account"}</p>
            </div>
          </div>
        ) : null}

        <button
          className="google-button"
          type="button"
          disabled={isLoading || (!isAuthenticated && !canUseGoogleAuth)}
          onClick={handleAuthClick}
        >
          <GoogleMark />
          <span>{isLoading ? "Checking Google login..." : buttonLabel}</span>
        </button>
      </div>
    </section>
  );
};