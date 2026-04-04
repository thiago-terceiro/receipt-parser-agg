"use client";

import { SessionProvider } from "next-auth/react";

import { ReceiptWorkspaceStateProvider } from "@/components/receipt-workspace-state-provider";
import { ThemeProvider } from "@/components/theme-provider";
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
