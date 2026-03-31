import type { Metadata } from "next";

import "./globals.css";
import { AppSessionProvider } from "./session-provider";

const themeBootScript = `(() => {
  const storageKey = "receipt-ai-theme";
  const storedTheme = window.localStorage.getItem(storageKey);
  const theme =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";
  const resolvedTheme =
    theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : theme === "system"
        ? "light"
        : theme;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
})();`;

export const metadata: Metadata = {
  title: "Receipt AI",
  description: "Receipt extraction UI backed by Hugging Face Inference on Vercel.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
