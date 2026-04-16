import { setRequestLocale } from "next-intl/server";

import { InviteAcceptanceCard } from "@/contents/invite/InviteAcceptanceCard";
import { getLocaleFromSegment } from "@/lib/i18n/config";

type InvitePageProps = {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ token?: string }>;
};

const InvitePage = async ({ params, searchParams }: InvitePageProps) => {
    const { locale } = await params;
    const resolvedLocale = getLocaleFromSegment(locale);
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const hasGoogleAuthConfigured = Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
    );

    setRequestLocale(resolvedLocale);

    return (
        <main className="mx-auto grid w-[min(900px,calc(100vw-32px))] gap-6 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),900px)] max-[900px]:pt-5">
            <InviteAcceptanceCard
                canUseGoogleAuth={hasGoogleAuthConfigured}
                locale={resolvedLocale}
                token={resolvedSearchParams?.token ?? null}
            />
        </main>
    );
};

export default InvitePage;