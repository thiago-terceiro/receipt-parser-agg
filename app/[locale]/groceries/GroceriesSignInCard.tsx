import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { type AppLocale } from "@/lib/i18n/config";

type GroceriesSignInCardProps = {
    locale: AppLocale;
    title: string;
    description: string;
    backToHomeLabel: string;
};

export const GroceriesSignInCard = ({
    backToHomeLabel,
    description,
    locale,
    title,
}: GroceriesSignInCardProps) => {
    return (
        <main className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
            <Card className="rounded-[30px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
                <CardContent className="grid min-h-[320px] place-items-center gap-4 p-8 text-center">
                    <div className="grid gap-3 place-items-center">
                        <h1 className="m-0 text-[2.4rem] tracking-[-0.05em]">
                            {title}
                        </h1>
                        <p className="m-0 max-w-[52ch] text-muted-foreground">
                            {description}
                        </p>
                        <div>
                            <Button asChild>
                                <Link href="/" locale={locale}>
                                    {backToHomeLabel}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
};