export type CurrencyCode = string;

export const legacyDefaultCurrencyCode: CurrencyCode = "USD";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "MXN",
] as const;

export const sanitizeCurrencyCode = (
  value: unknown,
): CurrencyCode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

export const resolveCurrencyCode = (
  value: unknown,
  fallback: CurrencyCode = legacyDefaultCurrencyCode,
): CurrencyCode => {
  return sanitizeCurrencyCode(value) ?? fallback;
};

export const getSingleCurrencyCode = (
  values: Iterable<unknown>,
  errorMessage: string,
  fallback: CurrencyCode = legacyDefaultCurrencyCode,
): CurrencyCode => {
  const uniqueCurrencyCodes = new Set<CurrencyCode>();

  for (const value of values) {
    uniqueCurrencyCodes.add(resolveCurrencyCode(value, fallback));
  }

  if (uniqueCurrencyCodes.size === 0) {
    return fallback;
  }

  if (uniqueCurrencyCodes.size > 1) {
    throw new Error(errorMessage);
  }

  return uniqueCurrencyCodes.values().next().value as CurrencyCode;
};

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export const createCurrencyFormatter = (
  locale: string,
  currencyCode: CurrencyCode,
) => {
  const cacheKey = `${locale}:${currencyCode}`;
  let formatter = currencyFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
    currencyFormatterCache.set(cacheKey, formatter);
  }
  return formatter;
};
