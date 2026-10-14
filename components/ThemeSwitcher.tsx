"use client";

import { Check, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme, type Theme } from "@/context/ThemeProvider";

const THEMES: { id: Theme; label: string; sample: string }[] = [
    { id: "light", label: "Light (default)", sample: "#ffffff" },
    { id: "dark", label: "Dark", sample: "#0f172a" },
    { id: "light-blue", label: "Light Blue", sample: "#e0f2fe" },
    { id: "yellow", label: "Yellow", sample: "#fefce8" },
    { id: "light-yellow", label: "Light Yellow", sample: "#fffbeb" },
    { id: "green", label: "Green", sample: "#f0fdf4" },
    { id: "purple", label: "Purple", sample: "#f5f3ff" },
];

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost"><Palette className="mr-2 h-4 w-4" />Theme</Button>
            </SheetTrigger>
            <SheetContent side="right" className="max-w-md p-0 rounded-l-xl">
                <div className="flex flex-col">
                    <div className="bg-gradient-to-br from-primary/10 via-secondary/8 to-accent/6 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-lg">Theme</SheetTitle>
                                <div className="text-sm text-muted-foreground">Choose a color palette</div>
                            </div>
                            <SheetClose asChild>
                                <Button variant="ghost">Close</Button>
                            </SheetClose>
                        </div>
                        <div className="mt-4 rounded-lg border p-2 bg-background/70 shadow-sm">
                            <div className="h-12 w-full rounded" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(0,0,0,0.03))' }} />
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden pr-2">
                            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setTheme(t.id);
                                            try {
                                                window.localStorage.setItem("receipt-ai-theme", t.id);
                                                Array.from(document.documentElement.classList).forEach((c) => {
                                                    if (c.startsWith("theme-")) document.documentElement.classList.remove(c);
                                                });
                                                if (!["light", "dark", "system"].includes(t.id)) {
                                                    document.documentElement.classList.add("theme-" + t.id);
                                                }
                                                const resolved =
                                                    t.id === "system"
                                                        ? window.matchMedia("(prefers-color-scheme: dark)").matches
                                                            ? "dark"
                                                            : "light"
                                                        : t.id === "dark"
                                                            ? "dark"
                                                            : "light";
                                                document.documentElement.dataset.theme = resolved;
                                                document.documentElement.classList.toggle("dark", resolved === "dark");
                                            } catch {
                                                /* ignore */
                                            }
                                        }}
                                        className={`w-full flex flex-col items-start gap-3 rounded-lg p-3 transition-transform transform hover:scale-105 hover:shadow-lg focus:outline-none min-w-0 ${theme === t.id ? "ring-2 ring-offset-2 ring-primary" : "border bg-card"}`}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div
                                                aria-hidden={true}
                                                className="h-12 w-12 shrink-0 rounded-lg shadow-inner"
                                                style={{ background: t.sample, border: "1px solid rgba(0,0,0,0.06)" }}
                                            />
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{t.label}</div>
                                                <div className="text-xs text-muted-foreground">Preview</div>
                                            </div>
                                            {theme === t.id && (
                                                <Check className="h-5 w-5 text-primary" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="p-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="text-sm text-muted-foreground">Your selection is saved automatically</div>
                            <SheetClose asChild>
                                <Button variant="secondary">Done</Button>
                            </SheetClose>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default ThemeSwitcher;
