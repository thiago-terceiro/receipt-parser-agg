import { getTranslations, setRequestLocale } from "next-intl/server";

import { isTestAuthEnabled } from "@/auth";
import { GoogleAuthControls } from "@/components/google-auth-controls";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { dropdownAvailableModels } from "@/lib/receipt";

import { ReceiptWorkspace } from "../../contents/home/ReceiptWorkspace";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const HomePage = async ({ params }: HomePageProps) => {
  const { locale } = await params;
  const resolvedLocale = getLocaleFromSegment(locale);
  setRequestLocale(resolvedLocale);
  const t = await getTranslations({ locale: resolvedLocale, namespace: "home" });
  const hasGoogleAuthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="mx-auto w-[min(1180px,calc(100vw-32px))] px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
      <GoogleAuthControls
        canUseGoogleAuth={hasGoogleAuthConfigured}
        isTestAuthEnabled={isTestAuthEnabled()}
      />
      <section className="mb-4 flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px] max-[900px]:flex-col max-[900px]:items-stretch">
        <div className="grid gap-1">
          <p className="m-0 text-[1rem] font-bold">
            {t("dashboardTitle")}
          </p>
          <p className="m-0 text-[0.9rem] leading-[1.5] text-muted-foreground">
            {t("dashboardDescription")}
          </p>
        </div>
        <Button
          asChild
          variant="secondary"
          className="border-[var(--border)] bg-[var(--surface-plain)] max-[900px]:w-full"
        >
          <Link href="/groceries" locale={resolvedLocale}>
            {t("openGroceriesView")}
          </Link>
        </Button>
      </section>
      <ReceiptWorkspace availableModels={dropdownAvailableModels} />
    </main>
  );
};

export default HomePage;
