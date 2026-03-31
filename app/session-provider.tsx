"use client";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "@/components/theme-provider";

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export const AppSessionProvider = ({ children }: AppSessionProviderProps) => {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
};
