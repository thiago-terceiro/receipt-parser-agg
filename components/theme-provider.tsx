"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const THEME_STORAGE_KEY = "receipt-ai-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isLoaded: boolean;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark" || value === "system";

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";

const applyThemeToDocument = (theme: Theme): ResolvedTheme => {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
};

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setResolvedTheme(applyThemeToDocument(nextTheme));
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = isTheme(storedTheme) ? storedTheme : "system";

    setThemeState(initialTheme);
    setResolvedTheme(applyThemeToDocument(initialTheme));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleChange = () => {
      if (theme !== "system") {
        return;
      }

      setResolvedTheme(applyThemeToDocument("system"));
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isLoaded,
      setTheme,
    }),
    [isLoaded, resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
};
