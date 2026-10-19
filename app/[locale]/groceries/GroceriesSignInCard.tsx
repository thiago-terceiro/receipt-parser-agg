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
        <div className="grid gap-6">
            <Card className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-soft)]/90 py-0 shadow-[var(--shadow)] backdrop-blur-[20px]">
                <CardContent className="grid min-h-[340px] place-items-center gap-4 p-8 text-center">
                    <div className="grid gap-3 place-items-center">
                        <h1 className="m-0 text-[2.5rem] font-extrabold tracking-tight text-foreground">
                            {title}
                        </h1>
                        <p className="m-0 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                        <div className="pt-2">
                            <Button asChild className="rounded-full h-11 px-6 font-semibold shadow-xs hover:shadow-md">
                                <Link href="/" locale={locale}>
                                    {backToHomeLabel}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};