import { NextIntlClientProvider } from "next-intl";

import { getLocaleFromSegment } from "@/lib/i18n/config";
import {
  loadLocaleMessages,
  pickMessageNamespaces,
} from "@/lib/i18n/dictionaries";

type InviteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

const InviteLayout = async ({ children, params }: InviteLayoutProps) => {
  const { locale } = await params;
  const resolvedLocale = getLocaleFromSegment(locale);
  const allMessages = await loadLocaleMessages(resolvedLocale);
  const inviteMessages = pickMessageNamespaces(allMessages, [
    "locales",
    "common",
    "theme",
    "auth",
    "invite",
  ]);

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={inviteMessages}>
      {children}
    </NextIntlClientProvider>
  );
};

export default InviteLayout;
