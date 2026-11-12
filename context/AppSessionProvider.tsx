"use client";

import { SessionProvider } from "next-auth/react";

import { TelemetryClient } from "@/components/telemetry/TelemetryClient";
import { ReceiptWorkspaceStateProvider } from "@/context/ReceiptWorkspaceStateProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

import type { Session } from "next-auth";

type AppSessionProviderProps = {
  children: React.ReactNode;
  session?: Session | null;
  defaultModelId?: string;
};

export const AppSessionProvider = ({
  children,
  session,
  defaultModelId = "gemini-flash-latest",
}: AppSessionProviderProps) => {
  return (
    <SessionProvider basePath="/api/auth" session={session}>
      <TelemetryClient />
      <ReceiptWorkspaceStateProvider defaultModelId={defaultModelId}>
        <ThemeProvider>{children}</ThemeProvider>
      </ReceiptWorkspaceStateProvider>
    </SessionProvider>
  );
};
