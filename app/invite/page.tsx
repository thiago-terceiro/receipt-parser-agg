import { redirect } from "next/navigation";

import { getPreferredLocalizedUrl } from "@/app/localized-redirect";

const InviteRedirectPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const redirectParams = new URLSearchParams();
  if (resolvedSearchParams?.token) {
    redirectParams.set("token", resolvedSearchParams.token);
  }

  redirect(await getPreferredLocalizedUrl("/invite", redirectParams));
};

export default InviteRedirectPage;