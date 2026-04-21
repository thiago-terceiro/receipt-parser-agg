import { redirect } from "next/navigation";

import { getPreferredLocalizedUrl } from "@/app/localized-redirect";

type GroceriesPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

const GroceriesPage = async ({ searchParams }: GroceriesPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = new URLSearchParams();
  if (resolvedSearchParams?.month) {
    params.set("month", resolvedSearchParams.month);
  }

  redirect(await getPreferredLocalizedUrl("/groceries", params));
};

export default GroceriesPage;
