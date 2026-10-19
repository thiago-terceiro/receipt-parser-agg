import { ArrowRight, LayoutDashboard } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

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

  return (
    <div className="grid gap-2">
      <section className="group mb-5 flex items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-6 py-4.5 shadow-[var(--shadow)] backdrop-blur-[20px] transition-all duration-200 hover:border-blue-500/25 hover:shadow-[var(--shadow-hover)] max-[900px]:flex-col max-[900px]:items-stretch">
        <Link
          href="/groceries"
          locale={resolvedLocale}
          prefetch={true}
          className="flex flex-1 items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <div className="inline-grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-plain-soft)] text-blue-600 dark:text-blue-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
            <LayoutDashboard className="size-5" aria-hidden="true" />
          </div>
          <div className="grid gap-0.5 text-left">
            <p className="m-0 text-[1rem] font-bold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {t("dashboardTitle")}
            </p>
            <p className="m-0 text-[0.88rem] leading-[1.5] text-muted-foreground">
              {t("dashboardDescription")}
            </p>
          </div>
        </Link>
        <Button
          asChild
          variant="secondary"
          className="border-[var(--border)] bg-[var(--surface-plain)] shadow-2xs hover:bg-[var(--surface-plain-soft)] hover:border-blue-500/30 max-[900px]:w-full rounded-full h-10 px-5 gap-2 shrink-0"
        >
          <Link href="/groceries" locale={resolvedLocale} prefetch={true}>
            <span>{t("openGroceriesView")}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
      <ReceiptWorkspace availableModels={dropdownAvailableModels} />
    </div>
  );
};

export default HomePage;
