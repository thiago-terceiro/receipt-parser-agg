import { cookies } from "next/headers";

import { AppSessionProvider } from "@/context/AppSessionProvider";
import {
  getHtmlLang,
  getLocaleFromPreference,
  localeCookieName,
} from "@/lib/i18n/config";

import "./globals.css";

const themeBootScript = `(() => {
  const localeSegment = window.location.pathname.split("/")[1]?.toLowerCase();
  const documentLanguage =
    localeSegment === "es" ? "es" : localeSegment === "pt-br" ? "pt-BR" : "en";

  const storageKey = "receipt-ai-theme";
  const storedTheme = window.localStorage.getItem(storageKey);
  const known = [
    "light",
    "dark",
    "system",
    "light-blue",
    "yellow",
    "light-yellow",
    "green",
    "purple",
  ];

  const theme = known.includes(storedTheme) ? storedTheme : "system";

  const resolvedTheme =
    theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme === "dark"
        ? "dark"
        : "light";

  // Remove existing theme-* classes
  document.documentElement.classList.forEach((c) => {
    if (c.startsWith("theme-")) {
      document.documentElement.classList.remove(c);
    }
  });

  // Add named theme class when appropriate
  if (theme !== "light" && theme !== "dark" && theme !== "system") {
    document.documentElement.classList.add("theme-" + theme);
  }

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.lang = documentLanguage;
  document.documentElement.style.colorScheme = resolvedTheme;
})();`;

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const cookieStore = await cookies();
  const locale =
    getLocaleFromPreference(cookieStore.get(localeCookieName)?.value) ?? "en";

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
