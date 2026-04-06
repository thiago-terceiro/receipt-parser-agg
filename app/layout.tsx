import type { Metadata } from "next";
import { cookies } from "next/headers";

import { getHtmlLang, getLocaleFromPreference, localeCookieName } from "@/lib/i18n/config";
import "./globals.css";
import { AppSessionProvider } from "./session-provider";

const themeBootScript = `(() => {
  const localeSegment = window.location.pathname.split("/")[1]?.toLowerCase();
  const documentLanguage =
    localeSegment === "es" ? "es" : localeSegment === "pt-br" ? "pt-BR" : "en";

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
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.lang = documentLanguage;
  document.documentElement.style.colorScheme = resolvedTheme;
})();`;

export const metadata: Metadata = {
  title: "Receipt AI",
  description: "Receipt extraction UI backed by Hugging Face Inference on Vercel.",
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const cookieStore = await cookies();
  const locale = getLocaleFromPreference(cookieStore.get(localeCookieName)?.value) ?? "en";

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning>
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
