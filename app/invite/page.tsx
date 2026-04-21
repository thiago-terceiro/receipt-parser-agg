import { getPreferredLocale } from "@/app/localized-redirect";
import { redirect } from "@/i18n/navigation";


const InviteRedirectPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = await getPreferredLocale();

  redirect({
    href: resolvedSearchParams?.token
      ? {
        pathname: "/invite",
        query: { token: resolvedSearchParams.token },
      }
      : "/invite",
    locale,
  });
};

export default InviteRedirectPage;