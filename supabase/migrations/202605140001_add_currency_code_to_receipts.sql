alter table public.grocery_entries
add column if not exists currency_code text;

update public.grocery_entries
set currency_code = 'USD'
where currency_code is null;

alter table public.grocery_entries
alter column currency_code set default 'USD';

alter table public.grocery_entries
alter column currency_code set not null;

alter table public.grocery_entries
drop constraint if exists grocery_entries_currency_code_check;

alter table public.grocery_entries
add constraint grocery_entries_currency_code_check
check (currency_code ~ '^[A-Z]{3}$');

alter table public.extracted_receipts
add column if not exists currency_code text;

update public.extracted_receipts
set currency_code = 'USD'
where currency_code is null;

alter table public.extracted_receipts
alter column currency_code set default 'USD';

alter table public.extracted_receipts
alter column currency_code set not null;

alter table public.extracted_receipts
drop constraint if exists extracted_receipts_currency_code_check;

alter table public.extracted_receipts
add constraint extracted_receipts_currency_code_check
check (currency_code ~ '^[A-Z]{3}$');