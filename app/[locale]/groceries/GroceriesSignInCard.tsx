import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type AppLocale, localizePath } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type GroceriesSignInCardProps = {
    locale: AppLocale;
    translations: Messages["groceries"];
};

export const GroceriesSignInCard = ({
    locale,
    translations,
}: GroceriesSignInCardProps) => {
    return (
        <main className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
            <Card className="rounded-[30px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
                <CardContent className="grid min-h-[320px] place-items-center gap-4 p-8 text-center">
                    <div className="grid gap-3 place-items-center">
                        <h1 className="m-0 text-[2.4rem] tracking-[-0.05em]">
                            {translations.signInTitle}
                        </h1>
                        <p className="m-0 max-w-[52ch] text-muted-foreground">
                            {translations.signInDescription}
                        </p>
                        <div>
                            <Button asChild>
                                <Link href={localizePath("/", locale)}>
                                    {translations.backToHome}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
};