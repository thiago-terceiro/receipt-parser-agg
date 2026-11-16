import type { AppLocale } from "@/lib/i18n/config";

import type { enMessages } from "./en";
import type { esMessages } from "./es";
import type { ptBRMessages } from "./pt-BR";

export type LocaleMessageDictionary =
  | typeof enMessages
  | typeof esMessages
  | typeof ptBRMessages;

export type MessageNamespace = keyof typeof enMessages;

export const routeMessageNamespaces = {
  layout: ["locales", "common", "theme", "auth"],
  home: ["common", "receipt", "categories"],
  groceries: ["common", "groceries", "categories", "receipt"],
  invite: ["locales", "common", "theme", "auth", "invite", "groceries"],
} as const satisfies Record<string, readonly MessageNamespace[]>;

export const loadLocaleMessages = async (
  locale: AppLocale,
): Promise<LocaleMessageDictionary> => {
  switch (locale) {
    case "es":
      return (await import("./es")).esMessages;
    case "pt-BR":
      return (await import("./pt-BR")).ptBRMessages;
    case "en":
    default:
      return (await import("./en")).enMessages;
  }
};

export const pickMessageNamespaces = <K extends MessageNamespace>(
  messages: LocaleMessageDictionary,
  namespaces: readonly K[],
): Pick<LocaleMessageDictionary, K> => {
  const picked = {} as Pick<LocaleMessageDictionary, K>;
  for (const namespace of namespaces) {
    picked[namespace] = messages[namespace];
  }
  return picked;
};
