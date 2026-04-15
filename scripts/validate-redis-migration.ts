import {
  collectResolvedStorageRecords,
  createRedisClientOrThrow,
  createSupabaseAdminClientOrThrow,
  getMonthRange,
  parseRedisList,
  roundCurrency,
} from "./shared-board-migration-utils";

type GroceryValidationRow = {
  id: string;
  line_total: number | string | null;
};

type ReceiptValidationRow = {
  id: string;
  total: number | string | null;
};

const validate = async () => {
  const redis = createRedisClientOrThrow();
  const supabase = createSupabaseAdminClientOrThrow();
  const mismatches: Array<Record<string, number | string>> = [];

  const { records, unresolved } = await collectResolvedStorageRecords(redis, supabase);

  for (const record of records) {
    const items = await parseRedisList(redis, record.key);

    if (record.namespace === "groceries") {
      const redisCount = items.length;
      const redisTotal = roundCurrency(
        items.reduce(
          (sum, item) => sum + Number((item as { lineTotal?: number | string }).lineTotal || 0),
          0,
        ),
      );
      const { start, nextMonthStart } = getMonthRange(record.month);

      const { data, error } = await supabase
        .from("grocery_entries")
        .select("id, line_total")
        .eq("created_by_user_id", record.userId)
        .gte("purchase_date", start)
        .lt("purchase_date", nextMonthStart);

      if (error) {
        throw new Error(error.message || `Unable to validate ${record.key}.`);
      }

      const rows = (data ?? []) as GroceryValidationRow[];
      const supabaseCount = rows.length;
      const supabaseTotal = roundCurrency(
        rows.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
      );

      if (redisCount !== supabaseCount || redisTotal !== supabaseTotal) {
        mismatches.push({
          key: record.key,
          namespace: record.namespace,
          month: record.month,
          redisCount,
          redisTotal,
          supabaseCount,
          supabaseTotal,
          userId: record.userId,
        });
      }

      continue;
    }

    const redisCount = items.length;
    const redisTotal = roundCurrency(
      items.reduce(
        (sum, item) => sum + Number((item as { total?: number | string }).total || 0),
        0,
      ),
    );
    const { data, error } = await supabase
      .from("extracted_receipts")
      .select("id, total")
      .eq("created_by_user_id", record.userId)
      .eq("month", record.month);

    if (error) {
      throw new Error(error.message || `Unable to validate ${record.key}.`);
    }

    const rows = (data ?? []) as ReceiptValidationRow[];
    const supabaseCount = rows.length;
    const supabaseTotal = roundCurrency(
      rows.reduce((sum, item) => sum + Number(item.total || 0), 0),
    );

    if (redisCount !== supabaseCount || redisTotal !== supabaseTotal) {
      mismatches.push({
        key: record.key,
        namespace: record.namespace,
        month: record.month,
        redisCount,
        redisTotal,
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