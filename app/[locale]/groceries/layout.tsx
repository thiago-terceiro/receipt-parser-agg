import { NextIntlClientProvider } from "next-intl";

import { getLocaleFromSegment } from "@/lib/i18n/config";
import {
  loadLocaleMessages,
  pickMessageNamespaces,
} from "@/lib/i18n/dictionaries";

type GroceriesLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

const GroceriesLayout = async ({ children, params }: GroceriesLayoutProps) => {
  const { locale } = await params;
  const resolvedLocale = getLocaleFromSegment(locale);
  const allMessages = await loadLocaleMessages(resolvedLocale);
  const groceriesMessages = pickMessageNamespaces(allMessages, [
    "common",
    "groceries",
    "categories",
  ]);

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={groceriesMessages}>
      {children}
    </NextIntlClientProvider>
  );
};

export default GroceriesLayout;
