"use client";

import { SessionProvider } from "next-auth/react";

import { ReceiptWorkspaceStateProvider } from "@/context/ReceiptWorkspaceStateProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { defaultModelId } from "@/lib/receipt";

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export const AppSessionProvider = ({ children }: AppSessionProviderProps) => {
  return (
    <SessionProvider>
      <ReceiptWorkspaceStateProvider defaultModelId={defaultModelId}>
        <ThemeProvider>{children}</ThemeProvider>
      </ReceiptWorkspaceStateProvider>
    </SessionProvider>
  );
};
