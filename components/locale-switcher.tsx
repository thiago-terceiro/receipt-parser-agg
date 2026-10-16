"use client";

import { Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { appLocales, localeNativeNames, type AppLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import {
  syncDocumentLocale,
  useLocale,
  useTranslations,
} from "./locale-utils";

const COMPACT_LOCALE_SWITCHER_QUERY = "(max-width: 980px)";

export const LocaleSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const translations = useTranslations();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COMPACT_LOCALE_SWITCHER_QUERY);
    const updateCompactState = (event?: MediaQueryListEvent) => {
      setIsCompact(event?.matches ?? mediaQuery.matches);
    };

    updateCompactState();
    mediaQuery.addEventListener("change", updateCompactState);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactState);
    };
  }, []);

  const switchLocale = (nextLocale: AppLocale) => {
    syncDocumentLocale(nextLocale);
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      locale: nextLocale,
    });
  };

  return (
    <div className="flex flex-col items-start">
      <p className="text-[0.82rem] py-1 font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] pl-2">
        {translations.common.language}
      </p>
      {isCompact ? (
        <Select value={locale} onValueChange={(value) => switchLocale(value as AppLocale)}>
          <SelectTrigger
            className="min-w-[180px] rounded-full border-[var(--border)] bg-[var(--surface-plain-soft)]"
            aria-label={translations.common.language}
          >
            <SelectValue aria-label={localeNativeNames[locale]}>
              <span className="flex items-center gap-2">
                <Languages className="size-4" />
                <span>{localeNativeNames[locale]}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {appLocales.map((nextLocale) => (
              <SelectItem key={nextLocale} value={nextLocale}>
                <span className="flex items-center gap-2">
                  <Languages className="size-4" />
                  <span>{localeNativeNames[nextLocale]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-plain-soft)] p-1"
          role="group"
          aria-label={translations.common.language}
        >
          {appLocales.map((nextLocale) => {
            const isActive = locale === nextLocale;

            return (
              <Button
                key={nextLocale}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                aria-pressed={isActive}
                onClick={() => switchLocale(nextLocale)}
                className={cn(
                  "rounded-full px-3",
                  !isActive &&
                    "text-muted-foreground hover:bg-[var(--surface-plain)] hover:text-foreground",
                )}
              >
                <Languages className="size-4" />
                <span>{localeNativeNames[nextLocale]}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
