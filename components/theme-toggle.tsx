"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type Theme, useTheme } from "./theme-provider";

const themeOptions: Array<{
  value: Theme;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: "system", label: "System", Icon: LaptopMinimal },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export const ThemeToggle = () => {
  const { theme, resolvedTheme, isLoaded, setTheme } = useTheme();
  const themeSummary = isLoaded
    ? theme === "system"
      ? `Current preference: system (${resolvedTheme}).`
      : `Current preference: ${theme}.`
    : "Current preference: system.";

  return (
    <div className="grid gap-1">
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)]">
        Theme
      </span>
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-plain-soft)] p-1"
        role="group"
        aria-label="Theme switcher"
      >
        {themeOptions.map(({ value, label, Icon }) => {
          const isActive = isLoaded ? theme === value : value === "system";

          return (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "ghost"}
              aria-pressed={isActive}
              onClick={() => setTheme(value)}
              className={cn(
                "rounded-full px-3",
                !isActive &&
                  "text-muted-foreground hover:bg-[var(--surface-plain)] hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">{themeSummary}</span>
    </div>
  );
};
