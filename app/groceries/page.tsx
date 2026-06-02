import { getPreferredLocale } from "@/app/localized-redirect";
import { redirect } from "@/i18n/navigation";


type GroceriesPageProps = {
  searchParams?: Promise<{
    board?: string;
    month?: string;
    saved?: string;
  }>;
};

const GroceriesPage = async ({ searchParams }: GroceriesPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = await getPreferredLocale();
  const query = {
    ...(resolvedSearchParams?.board ? { board: resolvedSearchParams.board } : {}),
    ...(resolvedSearchParams?.month ? { month: resolvedSearchParams.month } : {}),
    ...(resolvedSearchParams?.saved ? { saved: resolvedSearchParams.saved } : {}),
  };

  redirect({
    href: Object.keys(query).length > 0
      ? {
        pathname: "/groceries",
        query,
      }
      : "/groceries",
    locale,
  });
};

export default GroceriesPage;
