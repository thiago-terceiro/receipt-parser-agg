export const THEME_STORAGE_KEY = "receipt-ai-theme";
export const THEME_COOKIE_NAME = "receipt-ai-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type Theme =
  | "light"
  | "dark"
  | "system"
  | "light-blue"
  | "yellow"
  | "light-yellow"
  | "green"
  | "purple";

export type ResolvedTheme = "light" | "dark";

export const THEME_CLASS_PREFIX = "theme-";

export const NAMED_THEMES: Theme[] = [
  "light-blue",
  "yellow",
  "light-yellow",
  "green",
  "purple",
];

export const isTheme = (value: unknown): value is Theme => {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system" ||
    value === "light-blue" ||
    value === "yellow" ||
    value === "light-yellow" ||
    value === "green" ||
    value === "purple"
  );
};

export const resolveServerTheme = (themeCookie: string | undefined) => {
  const initialTheme: Theme = isTheme(themeCookie) ? themeCookie : "system";
  const isDark = initialTheme === "dark";
  const namedThemeClass =
    initialTheme !== "light" &&
    initialTheme !== "dark" &&
    initialTheme !== "system"
      ? `${THEME_CLASS_PREFIX}${initialTheme}`
      : undefined;

  const className = [
    isDark ? "dark" : undefined,
    namedThemeClass,
  ].filter(Boolean).join(" ");

  const resolvedTheme: ResolvedTheme = isDark ? "dark" : "light";

  return {
    initialTheme,
    className: className || undefined,
    dataTheme: initialTheme === "system" ? undefined : resolvedTheme,
    colorScheme: initialTheme === "system" ? undefined : resolvedTheme,
  };
};
