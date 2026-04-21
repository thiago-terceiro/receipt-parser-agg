import { redirect } from "next/navigation";

import { getPreferredLocalizedUrl } from "@/app/localized-redirect";

const HomeRedirectPage = async () => {
  redirect(await getPreferredLocalizedUrl("/"));
};

export default HomeRedirectPage;