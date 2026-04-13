import type { AppLocale } from "@/lib/i18n/config";
import {
  formatCategoryLabel,
  groceryCategories,
  type GroceryCategory,
  type ReceiptItem,
} from "@/lib/receipt";

export type GroceryEntry = ReceiptItem & {
  id: string;
  receiptId: string;
  sourceFileName: string | null;
  modelId: string | null;
  purchaseDate: string;
  createdAt: string;
};

export type ExtractedReceipt = {
  id: string;
  month: string;
  sourceFileName: string | null;
  modelId: string | null;
  extractedAt: string;
  itemCount: number;
  total: number;
  categories: GroceryCategory[];
  items: ReceiptItem[];
};

export type GroceryDetailGroup = {
  normalizedItem: string;
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
  entries: GroceryEntry[];
};

export type GroceryCategorySummary = {
  category: GroceryCategory;
  label: string;
  total: number;
  itemCount: number;
  uniqueItemCount: number;
  share: number;
  groups: GroceryDetailGroup[];
};

export type GroceriesMonthSummary = {
  total: number;
  itemCount: number;
  receiptCount: number;
  categoryCount: number;
};

export type GroceriesMonthPayload = {
  month: string;
  summary: GroceriesMonthSummary;
  categories: GroceryCategorySummary[];
  entries: GroceryEntry[];
  extractedReceipts: ExtractedReceipt[];
};

export type MonthOption = {
  value: string;
  label: string;
};

export const getMonthKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const isValidMonthKey = (value: string) => {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
};

export const getMonthRange = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error("Month must use YYYY-MM format.");
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return { start, end };
};

export const shiftMonthKey = (monthKey: string, offset: number) => {
  const { start } = getMonthRange(monthKey);
  return getMonthKey(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)),
  );
};

export const formatMonthLabel = (
  monthKey: string,
  locale: AppLocale | string = "en",
) => {
  const { start } = getMonthRange(monthKey);

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
};

export const buildMonthOptions = (
  selectedMonth: string,
  totalMonths = 12,
  locale: AppLocale | string = "en",
): MonthOption[] => {
  const currentMonth = getMonthKey(new Date());
  const values = new Set<string>([selectedMonth]);

  for (let index = 0; index < totalMonths; index += 1) {
    values.add(shiftMonthKey(currentMonth, -index));
  }

  return Array.from(values)
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({
      value,
      label: formatMonthLabel(value, locale),
    }));
};

export const resolveRequestedMonth = (
  requestedMonth: string | null | undefined,
  currentMonth = getMonthKey(new Date()),
) => {
  return typeof requestedMonth === "string" &&
    isValidMonthKey(requestedMonth) &&
    requestedMonth <= currentMonth
    ? requestedMonth
    : currentMonth;
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const buildGroceriesMonthPayload = (
  month: string,
  entries: GroceryEntry[],
  extractedReceipts: ExtractedReceipt[] = [],
): GroceriesMonthPayload => {
  const monthTotal = entries.reduce((sum, entry) => sum + entry.lineTotal, 0);
  const receiptIds = new Set(entries.map((entry) => entry.receiptId));

  const categories = groceryCategories
    .map((category) => {
      const categoryEntries = entries.filter(
        (entry) => entry.category === category,
      );
      if (categoryEntries.length === 0) {
        return null;
      }

      const groupsMap = new Map<string, GroceryDetailGroup>();
      for (const entry of categoryEntries) {
        const existing = groupsMap.get(entry.normalizedItem);
        if (existing) {
          existing.quantity += entry.quantity;
          existing.total = roundCurrency(existing.total + entry.lineTotal);
          existing.unitPrice = roundCurrency(
            existing.total / existing.quantity,
          );
          existing.entries.push(entry);
          continue;
        }

        groupsMap.set(entry.normalizedItem, {
          normalizedItem: entry.normalizedItem,
          item: entry.item,
          quantity: entry.quantity,
          unitPrice: entry.unitPrice,
          total: entry.lineTotal,
          entries: [entry],
        });
      }

      const groups = Array.from(groupsMap.values()).sort(
        (left, right) => right.total - left.total,
      );
      const total = roundCurrency(
        categoryEntries.reduce((sum, entry) => sum + entry.lineTotal, 0),
      );

      return {
        category,
        label: formatCategoryLabel(category),
        total,
        itemCount: categoryEntries.reduce(
          (sum, entry) => sum + entry.quantity,
          0,
        ),
        uniqueItemCount: groups.length,
        share: monthTotal > 0 ? total / monthTotal : 0,
        groups,
      } satisfies GroceryCategorySummary;
    })
    .filter((value): value is GroceryCategorySummary => value !== null)
    .sort((left, right) => right.total - left.total);

  return {
    month,
    summary: {
      total: roundCurrency(monthTotal),
      itemCount: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      receiptCount: receiptIds.size,
      categoryCount: categories.length,
    },
    categories,
    entries,
    extractedReceipts: [...extractedReceipts].sort((left, right) =>
      right.extractedAt.localeCompare(left.extractedAt),
    ),
  };
};
