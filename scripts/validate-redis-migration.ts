import { resolveCurrencyCode } from "../lib/currency";
import {
  chunk,
  collectResolvedStorageRecords,
  createRedisClientOrThrow,
  createSupabaseAdminClientOrThrow,
  parseRedisList,
  roundCurrency,
} from "./shared-board-migration-utils";

type GroceryValidationRow = {
  board_id: string;
  currency_code: string | null;
  id: string;
  line_total: number | string | null;
};

type ReceiptValidationRow = {
  board_id: string;
  currency_code: string | null;
  id: string;
  total: number | string | null;
};

type OwnerBoardRow = {
  id: string;
};

const loadOwnerBoardId = async (
  userId: string,
  boardCache: Map<string, string>,
  supabase: ReturnType<typeof createSupabaseAdminClientOrThrow>,
) => {
  if (boardCache.has(userId)) {
    return boardCache.get(userId) as string;
  }

  const { data, error } = await supabase
    .from("boards")
    .select("id")
    .eq("owner_user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<OwnerBoardRow>();

  if (error || !data?.id) {
    throw new Error(error?.message || `Unable to load owner board for ${userId}.`);
  }

  boardCache.set(userId, data.id);
  return data.id;
};

const validate = async () => {
  const redis = createRedisClientOrThrow();
  const supabase = createSupabaseAdminClientOrThrow();
  const boardCache = new Map<string, string>();
  const mismatches: Array<Record<string, number | string>> = [];

  const { records, unresolved } = await collectResolvedStorageRecords(redis, supabase);

  for (const record of records) {
    const items = await parseRedisList(redis, record.key);
    const boardId = await loadOwnerBoardId(record.userId, boardCache, supabase);

    if (record.namespace === "groceries") {
      const redisIds = items.map((item) => String((item as { id: string }).id));
      const redisCount = items.length;
      const redisTotal = roundCurrency(
        items.reduce(
          (sum, item) => sum + Number((item as { lineTotal?: number | string }).lineTotal || 0),
          0,
        ),
      );
      const redisCurrencies = Array.from(
        new Set(
          items.map((item) =>
            resolveCurrencyCode((item as { currencyCode?: string | null }).currencyCode),
          ),
        ),
      ).sort();

      const rows: GroceryValidationRow[] = [];
      for (const idBatch of chunk(redisIds, 200)) {
        const { data, error } = await supabase
          .from("grocery_entries")
          .select("id, line_total, currency_code, board_id")
          .eq("board_id", boardId)
          .eq("created_by_user_id", record.userId)
          .in("id", idBatch);

        if (error) {
          throw new Error(error.message || `Unable to validate ${record.key}.`);
        }

        rows.push(...(((data ?? []) as GroceryValidationRow[])));
      }

      const supabaseCount = rows.length;
      const supabaseTotal = roundCurrency(
        rows.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
      );
      const supabaseCurrencies = Array.from(
        new Set(rows.map((item) => resolveCurrencyCode(item.currency_code))),
      ).sort();

      if (
        redisCount !== supabaseCount ||
        redisTotal !== supabaseTotal ||
        JSON.stringify(redisCurrencies) !== JSON.stringify(supabaseCurrencies)
      ) {
        mismatches.push({
          key: record.key,
          namespace: record.namespace,
          month: record.month,
          redisCurrencies: redisCurrencies.join(","),
          redisCount,
          redisTotal,
          supabaseCurrencies: supabaseCurrencies.join(","),
          supabaseCount,
          supabaseTotal,
          userId: record.userId,
        });
      }

      continue;
    }

    const redisIds = items.map((item) => String((item as { id: string }).id));
    const redisCount = items.length;
    const redisTotal = roundCurrency(
      items.reduce(
        (sum, item) => sum + Number((item as { total?: number | string }).total || 0),
        0,
      ),
    );
    const redisCurrencies = Array.from(
      new Set(
        items.map((item) =>
          resolveCurrencyCode((item as { currencyCode?: string | null }).currencyCode),
        ),
      ),
    ).sort();

    const rows: ReceiptValidationRow[] = [];
    for (const idBatch of chunk(redisIds, 200)) {
      const { data, error } = await supabase
        .from("extracted_receipts")
        .select("id, total, currency_code, board_id")
        .eq("board_id", boardId)
        .eq("created_by_user_id", record.userId)
        .in("id", idBatch);

      if (error) {
        throw new Error(error.message || `Unable to validate ${record.key}.`);
      }

      rows.push(...(((data ?? []) as ReceiptValidationRow[])));
    }

    const supabaseCount = rows.length;
    const supabaseTotal = roundCurrency(
      rows.reduce((sum, item) => sum + Number(item.total || 0), 0),
    );
    const supabaseCurrencies = Array.from(
      new Set(rows.map((item) => resolveCurrencyCode(item.currency_code))),
    ).sort();

    if (
      redisCount !== supabaseCount ||
      redisTotal !== supabaseTotal ||
      JSON.stringify(redisCurrencies) !== JSON.stringify(supabaseCurrencies)
    ) {
      mismatches.push({
        key: record.key,
        namespace: record.namespace,
        month: record.month,
        redisCurrencies: redisCurrencies.join(","),
        redisCount,
        redisTotal,
        supabaseCurrencies: supabaseCurrencies.join(","),
        supabaseCount,
        supabaseTotal,
        userId: record.userId,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        checkedRecords: records.length,
        mismatches,
        unresolved,
      },
      null,
      2,
    ),
  );

  if (mismatches.length > 0) {
    process.exitCode = 1;
  }
};

void validate();