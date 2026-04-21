export const appLocales = ["en", "es", "pt-BR"] as const;

export type AppLocale = (typeof appLocales)[number];

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "receipt-ai-locale";

const localeToSegmentMap: Record<AppLocale, string> = {
  en: "en",
  es: "es",
  "pt-BR": "pt-br",
};

const segmentToLocaleMap = {
  en: "en",
  es: "es",
  "pt-br": "pt-BR",
} as const satisfies Record<string, AppLocale>;

export type LocaleSegment = keyof typeof segmentToLocaleMap;

export const getLocaleSegment = (locale: AppLocale): LocaleSegment => {
  return localeToSegmentMap[locale] as LocaleSegment;
};

export const getHtmlLang = (locale: AppLocale) => {
  return locale === "pt-BR" ? "pt-BR" : locale;
};

export const isLocaleSegment = (
  value: string | null | undefined,
): value is LocaleSegment => {
  return Boolean(value && value.toLowerCase() in segmentToLocaleMap);
};

export const getLocaleFromSegment = (
  value: string | null | undefined,
): AppLocale => {
  if (!value) {
    return defaultLocale;
  }

  const normalized = value.toLowerCase();
  if (isLocaleSegment(normalized)) {
    return segmentToLocaleMap[normalized];
  }

  return defaultLocale;
};

export const getLocaleFromPreference = (
  value: string | null | undefined,
): AppLocale | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "en") {
    return "en";
  }

  if (normalized === "es") {
    return "es";
  }

  if (normalized === "pt-br" || normalized === "pt_br" || normalized === "pt") {
    return "pt-BR";
  }

  return null;
};

export const detectLocaleFromAcceptLanguage = (
  acceptLanguage: string | null | undefined,
): AppLocale => {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const normalized = acceptLanguage.toLowerCase();
  if (normalized.includes("pt-br") || normalized.includes("pt")) {
    return "pt-BR";
  }

  if (normalized.includes("es")) {
    return "es";
  }

  return defaultLocale;
};

export const resolveRequestLocale = (options: {
  localeSegment?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale => {
  if (options.localeSegment && isLocaleSegment(options.localeSegment)) {
    return getLocaleFromSegment(options.localeSegment);
  }

  const preferredLocale = getLocaleFromPreference(options.cookieLocale);
  if (preferredLocale) {
    return preferredLocale;
  }

  return detectLocaleFromAcceptLanguage(options.acceptLanguage);
};

export const stripLocaleFromPathname = (pathname: string): string => {
  const segments = pathname.split("/");
  const possibleLocale = segments[1];

  if (!isLocaleSegment(possibleLocale)) {
    return pathname || "/";
  }

  const nextPath = `/${segments.slice(2).join("/")}`.replace(/\/+/g, "/");
  return nextPath === "/" ? "/" : nextPath.replace(/\/$/, "") || "/";
};

export const localizePath = (pathname: string, locale: AppLocale): string => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const strippedPath = stripLocaleFromPathname(normalizedPath);
  const localePrefix = `/${getLocaleSegment(locale)}`;

  if (strippedPath === "/") {
    return localePrefix;
  }

  return `${localePrefix}${strippedPath}`;
};

export const buildLocalizedUrl = (
  pathname: string,
  locale: AppLocale,
  searchParams?: URLSearchParams | string,
): string => {
  const basePath = localizePath(pathname, locale);
  const query =
    typeof searchParams === "string"
      ? searchParams
      : searchParams instanceof URLSearchParams
        ? searchParams.toString()
        : "";

  return query ? `${basePath}?${query}` : basePath;
};
