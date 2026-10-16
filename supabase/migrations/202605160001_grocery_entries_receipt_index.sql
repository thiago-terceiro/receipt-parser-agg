create index if not exists grocery_entries_board_receipt_idx
on public.grocery_entries(board_id, receipt_id);

create index if not exists extracted_receipts_board_month_extracted_idx
on public.extracted_receipts(board_id, month, extracted_at desc);
