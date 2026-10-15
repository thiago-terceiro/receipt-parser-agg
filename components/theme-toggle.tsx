"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Theme, useTheme } from "@/context/ThemeProvider";
import { cn } from "@/lib/utils";

import { useTranslations } from "./locale-utils";

export const ThemeToggle = () => {
  const { theme, isLoaded, setTheme } = useTheme();
  const translations = useTranslations();

  const themeOptions: Array<{
    value: Theme;
    label: string;
    Icon: typeof Sun;
  }> = [
      { value: "system", label: translations.theme.system, Icon: LaptopMinimal },
      { value: "light", label: translations.theme.light, Icon: Sun },
      { value: "dark", label: translations.theme.dark, Icon: Moon },
    ];

  return (
    <div className="flex flex-col items-start">
      <p className="text-[0.82rem] py-1 font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] pl-2">
        {translations.theme.label}
      </p>
      <div
        className="inline-flex w-fit flex-wrap items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-plain-soft)] p-1"
        role="group"
        aria-label={translations.theme.switcherLabel}
      >
        {themeOptions.map(({ value, label, Icon }) => {
          const isActive = isLoaded ? theme === value : value === "system";

          return (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "ghost"}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => setTheme(value)}
              className={cn(
                "rounded-full px-3",
                !isActive &&
                "text-muted-foreground hover:bg-[var(--surface-plain)] hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
};
