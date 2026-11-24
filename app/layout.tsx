import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { AppSessionProvider } from "@/context/AppSessionProvider";
import {
  getHtmlLang,
  getLocaleFromPreference,
  localeCookieName,
} from "@/lib/i18n/config";
import { defaultModelId } from "@/lib/receipt";
import {
  THEME_COOKIE_NAME,
  resolveServerTheme,
} from "@/lib/theme";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

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

  if (!document.cookie.includes("receipt-ai-theme=")) {
    document.cookie = "receipt-ai-theme=" + encodeURIComponent(theme) + "; path=/; max-age=31536000; SameSite=Lax";
  }
})();`;

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const [cookieStore, session] = await Promise.all([
    cookies(),
    getServerSession(authOptions),
  ]);
  const locale =
    getLocaleFromPreference(cookieStore.get(localeCookieName)?.value) ?? "en";
  const { className, dataTheme, colorScheme } = resolveServerTheme(
    cookieStore.get(THEME_COOKIE_NAME)?.value,
  );

  const htmlClassName = [
    className,
    plusJakartaSans.variable,
    jetbrainsMono.variable,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang={getHtmlLang(locale)}
      className={htmlClassName}
      data-theme={dataTheme}
      style={colorScheme ? { colorScheme } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script>{themeBootScript}</script>
      </head>
      <body>
        <AppSessionProvider session={session} defaultModelId={defaultModelId}>
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
