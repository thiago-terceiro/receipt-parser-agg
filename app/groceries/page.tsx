import { getPreferredLocale } from "@/app/localized-redirect";
import { redirect } from "@/i18n/navigation";


type GroceriesPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

const GroceriesPage = async ({ searchParams }: GroceriesPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = await getPreferredLocale();

  redirect({
    href: resolvedSearchParams?.month
      ? {
        pathname: "/groceries",
        query: { month: resolvedSearchParams.month },
      }
      : "/groceries",
    locale,
  });
};

export default GroceriesPage;
