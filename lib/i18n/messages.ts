import { getTranslations } from "next-intl/server";

import { enMessages } from "./dictionaries/en";
import { esMessages } from "./dictionaries/es";
import { ptBRMessages } from "./dictionaries/pt-BR";
import { createMessagesObject, type Messages } from "./messages-client";

import type { AppLocale } from "./config";

export { createMessagesObject, type Messages } from "./messages-client";

export const localeMessages = {
  en: enMessages,
  es: esMessages,
  "pt-BR": ptBRMessages,
} as const satisfies Record<AppLocale, Record<string, unknown>>;

export const getMessages = async (locale: AppLocale): Promise<Messages> => {
  const t = await getTranslations({ locale });

  return createMessagesObject(
    (key, values) => t(key as never, values as never),
    locale,
  );
};
