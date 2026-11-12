-- 1. Composite indexes for multi-tenant board queries, RLS lookups, and sorted scans
create index if not exists board_members_user_id_status_idx
on public.board_members (user_id, status);

create index if not exists board_members_board_status_joined_idx
on public.board_members (board_id, status, joined_at asc nulls last);

create index if not exists grocery_entries_board_created_idx
on public.grocery_entries (board_id, created_at desc);

create index if not exists grocery_entries_board_category_idx
on public.grocery_entries (board_id, category);

create index if not exists extracted_receipts_board_created_idx
on public.extracted_receipts (board_id, created_at desc);

-- 2. Enforce FORCE ROW LEVEL SECURITY across all public tables
alter table public.profiles force row level security;
alter table public.boards force row level security;
alter table public.board_members force row level security;
alter table public.board_invites force row level security;
alter table public.grocery_entries force row level security;
alter table public.extracted_receipts force row level security;
alter table public.user_credentials force row level security;

-- 3. Optimize app_private.user_has_board_role to evaluate current_app_user_id() via InitPlan
create or replace function app_private.user_has_board_role(
  p_board_id uuid,
  p_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.board_members
    where board_id = p_board_id
      and user_id = (select app_private.current_app_user_id())
      and status = 'active'
      and (
        p_roles is null
        or role = any(p_roles)
      )
  );
$$;

revoke all on function app_private.user_has_board_role(uuid, text[]) from public, anon;
grant execute on function app_private.user_has_board_role(uuid, text[]) to authenticated;

-- 4. Wrap direct current_app_user_id() calls in RLS policies with (select ...) for per-statement InitPlan caching
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  id = (select app_private.current_app_user_id())
  or exists (
    select 1
    from public.board_members
    where user_id = public.profiles.id
      and status = 'active'
      and app_private.user_has_board_role(board_id)
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select app_private.current_app_user_id()))
with check (id = (select app_private.current_app_user_id()));

drop policy if exists "boards_insert_owner" on public.boards;
create policy "boards_insert_owner"
on public.boards
for insert
to authenticated
with check (owner_user_id = (select app_private.current_app_user_id()));

drop policy if exists "grocery_entries_write_editor" on public.grocery_entries;
create policy "grocery_entries_write_editor"
on public.grocery_entries
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner', 'editor']))
with check (
  app_private.user_has_board_role(board_id, array['owner', 'editor'])
  and created_by_user_id = (select app_private.current_app_user_id())
);

drop policy if exists "extracted_receipts_write_editor" on public.extracted_receipts;
create policy "extracted_receipts_write_editor"
on public.extracted_receipts
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner', 'editor']))
with check (
  app_private.user_has_board_role(board_id, array['owner', 'editor'])
  and created_by_user_id = (select app_private.current_app_user_id())
);
