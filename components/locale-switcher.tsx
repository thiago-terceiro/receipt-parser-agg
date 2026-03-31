"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appLocales, buildLocalizedUrl, type AppLocale } from "@/lib/i18n/config";

import { persistLocalePreference, useLocale, useTranslations } from "./locale-provider";

export const LocaleSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const translations = useTranslations();

  const switchLocale = (nextLocale: AppLocale) => {
    persistLocalePreference(nextLocale);
    router.replace(buildLocalizedUrl(pathname, nextLocale, searchParams.toString()));
  };

  return (
    <div className="grid gap-1">
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)]">
        {translations.common.language}
      </span>
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
              <span>{translations.locales[nextLocale]}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
