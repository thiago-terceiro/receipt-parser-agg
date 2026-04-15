import {
  chunk,
  collectResolvedStorageRecords,
  createRedisClientOrThrow,
  createSupabaseAdminClientOrThrow,
  ensureOwnerBoard,
  ensureProfile,
  parseRedisList,
  type ResolvedStorageRecord,
} from "./shared-board-migration-utils";

type GroceryRedisItem = {
  id: string;
  receiptId: string;
  normalizedItem: string;
  item: string;
  category: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  sourceFileName?: string | null;
  modelId?: string | null;
  purchaseDate: string;
  createdAt: string;
};

type ReceiptRedisItem = {
  id: string;
  month: string;
  sourceFileName?: string | null;
  modelId?: string | null;
  extractedAt: string;
  itemCount: number | string;
  total: number | string;
  categories?: unknown;
  items?: unknown;
};

const shouldApply = process.argv.includes("--apply");

const migrate = async () => {
  const redis = createRedisClientOrThrow();
  const supabase = createSupabaseAdminClientOrThrow();
  const boardCache = new Map<string, string>();
  const summary = {
    apply: shouldApply,
    groceriesRows: 0,
    receiptRows: 0,
    records: 0,
    unresolved: 0,
  };

  const { records, unresolved } = await collectResolvedStorageRecords(redis, supabase);
  summary.records = records.length;
  summary.unresolved = unresolved.length;

  for (const record of records) {
    const items = await parseRedisList(redis, record.key);
    if (items.length === 0) {
      continue;
    }

    if (!shouldApply) {
      if (record.namespace === "groceries") {
        summary.groceriesRows += items.length;
      } else {
        summary.receiptRows += items.length;
      }
      continue;
    }

    await ensureProfile(supabase, record.userId, record.email);
    const boardId = await ensureOwnerBoard(supabase, record.userId, boardCache);

    if (record.namespace === "groceries") {
      const rows = items.map((item) => {
        const groceryItem = item as unknown as GroceryRedisItem;
        return {
          id: groceryItem.id,
          board_id: boardId,
          created_by_user_id: record.userId,
          receipt_id: groceryItem.receiptId,
          normalized_item: groceryItem.normalizedItem,
          item: groceryItem.item,
          category: groceryItem.category,
          quantity: Number(groceryItem.quantity),
          unit_price: Number(groceryItem.unitPrice),
          line_total: Number(groceryItem.lineTotal),
          source_file_name: groceryItem.sourceFileName ?? null,
          model_id: groceryItem.modelId ?? null,
          purchase_date: groceryItem.purchaseDate,
          created_at: groceryItem.createdAt,
        };
      });

      for (const batch of chunk(rows, 200)) {
        const { error } = await supabase
          .from("grocery_entries")
          .upsert(batch, { onConflict: "id" });

        if (error) {
          throw new Error(error.message || `Unable to migrate ${record.key}.`);
        }
      }

      summary.groceriesRows += rows.length;
      continue;
    }

    const rows = items.map((item) => {
      const receiptItem = item as unknown as ReceiptRedisItem;
      return {
        id: receiptItem.id,
        board_id: boardId,
        created_by_user_id: record.userId,
        month: receiptItem.month,
        source_file_name: receiptItem.sourceFileName ?? null,
        model_id: receiptItem.modelId ?? null,
        extracted_at: receiptItem.extractedAt,
        item_count: Number(receiptItem.itemCount),
        total: Number(receiptItem.total),
        categories: Array.isArray(receiptItem.categories)
          ? receiptItem.categories
          : [],
        items: Array.isArray(receiptItem.items) ? receiptItem.items : [],
        created_at: receiptItem.extractedAt,
      };
    });

    for (const batch of chunk(rows, 200)) {
      const { error } = await supabase
        .from("extracted_receipts")
        .upsert(batch, { onConflict: "id" });

      if (error) {
        throw new Error(error.message || `Unable to migrate ${record.key}.`);
      }
    }

    summary.receiptRows += rows.length;
  }

  console.log(JSON.stringify({ summary, unresolved }, null, 2));

  if (!shouldApply) {
    console.log("Dry run complete. Re-run with --apply to write to Supabase.");
  }
};

void migrate();