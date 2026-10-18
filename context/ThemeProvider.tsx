"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export const THEME_STORAGE_KEY = "receipt-ai-theme";
export const THEME_COOKIE_NAME = "receipt-ai-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type Theme =
  | "light"
  | "dark"
  | "system"
  | "light-blue"
  | "yellow"
  | "light-yellow"
  | "green"
  | "purple";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isLoaded: boolean;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

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

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isTheme(storedTheme) ? storedTheme : "system";
};

const subscribeToThemePreference = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => { };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  const handleThemeChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("receipt-ai-theme-change", handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("receipt-ai-theme-change", handleThemeChange);
  };
};

const subscribeToSystemTheme = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => { };
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }

  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
};

const getSystemThemeSnapshot = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  return getSystemTheme();
};

const THEME_CLASS_PREFIX = "theme-";
const NAMED_THEMES: Theme[] = [
  "light-blue",
  "yellow",
  "light-yellow",
  "green",
  "purple",
];

const applyThemeToDocument = (theme: Theme): ResolvedTheme => {
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? getSystemTheme() : theme === "dark" ? "dark" : "light";

  if (typeof document === "undefined") {
    return resolvedTheme;
  }

  const root = document.documentElement;

  // remove any previous theme- classes
  Array.from(root.classList).forEach((c) => {
    if (c.startsWith(THEME_CLASS_PREFIX)) {
      root.classList.remove(c);
    }
  });

  // if selected a named theme, add its class (e.g. theme-light-blue)
  if ((NAMED_THEMES as string[]).includes(theme as string)) {
    root.classList.add(`${THEME_CLASS_PREFIX}${theme}`);
  }

  root.dataset.theme = resolvedTheme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
};

const disableAnimation = () => {
  if (typeof document === "undefined") {
    return () => {};
  }

  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(css);

  return () => {
    try {
      window.getComputedStyle(document.body);
    } catch {
      // ignore
    }

    const cleanup = () => {
      if (css.parentNode) {
        document.head.removeChild(css);
      }
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        requestAnimationFrame(cleanup);
      });
    } else {
      setTimeout(cleanup, 0);
    }
  };
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useSyncExternalStore<Theme>(
    subscribeToThemePreference,
    getStoredTheme,
    () => "system",
  );
  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    () => "light",
  );
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme === "dark" ? "dark" : "light";
  const isLoaded = true;

  const setTheme = useCallback((nextTheme: Theme) => {
    const enableAnimation = disableAnimation();
    applyThemeToDocument(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    if (typeof document !== "undefined") {
      document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(nextTheme)}; path=/; max-age=31536000; SameSite=Lax`;
    }
    window.dispatchEvent(new Event("receipt-ai-theme-change"));
    enableAnimation();
  }, []);

  useEffect(() => {
    const enableAnimation = disableAnimation();
    applyThemeToDocument(theme);
    enableAnimation();
  }, [theme, resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isLoaded,
      setTheme,
    }),
    [isLoaded, resolvedTheme, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
};
