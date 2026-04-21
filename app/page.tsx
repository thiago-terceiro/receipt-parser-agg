import { getPreferredLocale } from "@/app/localized-redirect";
import { redirect } from "@/i18n/navigation";


const HomeRedirectPage = async () => {
  redirect({ href: "/", locale: await getPreferredLocale() });
};

export default HomeRedirectPage;