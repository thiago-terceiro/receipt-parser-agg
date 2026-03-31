"use client";

import { SessionProvider } from "next-auth/react";

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export const AppSessionProvider = ({ children }: AppSessionProviderProps) => {
  return <SessionProvider>{children}</SessionProvider>;
};