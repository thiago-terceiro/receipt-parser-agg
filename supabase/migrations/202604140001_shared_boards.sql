create extension if not exists pgcrypto;

create schema if not exists app_private;

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id text primary key,
  email text unique,
  display_name text,
  image_url text,
  last_active_board_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id text not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint boards_name_length_check check (char_length(trim(name)) between 1 and 80)
);

alter table public.profiles
drop constraint if exists profiles_last_active_board_id_fkey;

alter table public.profiles
add constraint profiles_last_active_board_id_fkey
foreign key (last_active_board_id)
references public.boards(id)
on delete set null;

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_by_user_id text references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_members_role_check check (role in ('owner', 'editor')),
  constraint board_members_status_check check (status in ('active', 'removed')),
  constraint board_members_unique_member unique (board_id, user_id)
);

create table if not exists public.board_invites (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  email text,
  invite_token_hash text not null unique,
  role text not null default 'editor',
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id text references public.profiles(id) on delete set null,
  invited_by_user_id text not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  constraint board_invites_role_check check (role in ('editor')),
  constraint board_invites_status_check check (status in ('pending', 'accepted', 'expired', 'revoked'))
);

create table if not exists public.grocery_entries (
  id uuid primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by_user_id text not null references public.profiles(id) on delete restrict,
  receipt_id uuid not null,
  normalized_item text not null,
  item text not null,
  category text not null,
  quantity numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  source_file_name text,
  model_id text,
  purchase_date timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint grocery_entries_quantity_positive check (quantity > 0),
  constraint grocery_entries_unit_price_non_negative check (unit_price >= 0),
  constraint grocery_entries_line_total_non_negative check (line_total >= 0)
);

create table if not exists public.extracted_receipts (
  id uuid primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by_user_id text not null references public.profiles(id) on delete restrict,
  month text not null,
  source_file_name text,
  model_id text,
  extracted_at timestamptz not null,
  item_count integer not null,
  total numeric(12, 2) not null,
  categories jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint extracted_receipts_item_count_non_negative check (item_count >= 0),
  constraint extracted_receipts_total_non_negative check (total >= 0)
);

create index if not exists boards_owner_user_id_idx
on public.boards(owner_user_id);

create index if not exists board_members_user_id_idx
on public.board_members(user_id);

create index if not exists board_members_board_id_idx
on public.board_members(board_id);

create index if not exists board_invites_board_id_idx
on public.board_invites(board_id);

create index if not exists board_invites_expires_at_idx
on public.board_invites(expires_at);

create index if not exists grocery_entries_board_purchase_idx
on public.grocery_entries(board_id, purchase_date desc);

create index if not exists extracted_receipts_board_extracted_idx
on public.extracted_receipts(board_id, extracted_at desc);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function app_private.touch_updated_at();

drop trigger if exists boards_touch_updated_at on public.boards;
create trigger boards_touch_updated_at
before update on public.boards
for each row
execute function app_private.touch_updated_at();

drop trigger if exists board_members_touch_updated_at on public.board_members;
create trigger board_members_touch_updated_at
before update on public.board_members
for each row
execute function app_private.touch_updated_at();

drop trigger if exists board_invites_touch_updated_at on public.board_invites;
create trigger board_invites_touch_updated_at
before update on public.board_invites
for each row
execute function app_private.touch_updated_at();

create or replace function app_private.current_app_user_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_user_id', nullif(auth.uid()::text, ''));
$$;

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
      and user_id = app_private.current_app_user_id()
      and status = 'active'
      and (
        p_roles is null
        or role = any(p_roles)
      )
  );
$$;

revoke all on function app_private.user_has_board_role(uuid, text[]) from public;
grant execute on function app_private.user_has_board_role(uuid, text[]) to authenticated;

create or replace function public.create_board_for_user(
  p_user_id text,
  p_name text
)
returns public.boards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_board public.boards;
begin
  insert into public.boards (name, owner_user_id)
  values (trim(p_name), p_user_id)
  returning * into v_board;

  insert into public.board_members (
    board_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    joined_at
  )
  values (
    v_board.id,
    p_user_id,
    'owner',
    'active',
    p_user_id,
    timezone('utc', now())
  )
  on conflict (board_id, user_id)
  do update set
    role = excluded.role,
    status = excluded.status,
    joined_at = coalesce(public.board_members.joined_at, excluded.joined_at),
    updated_at = timezone('utc', now());

  update public.profiles
  set last_active_board_id = v_board.id
  where id = p_user_id;

  return v_board;
end;
$$;

create or replace function public.set_last_active_board(
  p_user_id text,
  p_board_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
begin
  if not exists (
    select 1
    from public.board_members
    where board_id = p_board_id
      and user_id = p_user_id
      and status = 'active'
  ) then
    raise exception 'Board membership is required before setting it active.';
  end if;

  update public.profiles
  set last_active_board_id = p_board_id
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found for active board update.';
  end if;

  return v_profile;
end;
$$;

create or replace function public.accept_board_invite(
  p_user_id text,
  p_email text,
  p_token_hash text
)
returns table(board_id uuid, board_name text, role text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.board_invites;
begin
  select *
  into v_invite
  from public.board_invites
  where invite_token_hash = p_token_hash
    and status = 'pending'
    and expires_at > timezone('utc', now())
  limit 1;

  if v_invite.id is null then
    raise exception 'Invite token is invalid or expired.';
  end if;

  if v_invite.email is not null and lower(v_invite.email) <> lower(coalesce(p_email, '')) then
    raise exception 'The signed-in email does not match this invite.';
  end if;

  insert into public.board_members (
    board_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    joined_at
  )
  values (
    v_invite.board_id,
    p_user_id,
    v_invite.role,
    'active',
    v_invite.invited_by_user_id,
    timezone('utc', now())
  )
  on conflict (board_id, user_id)
  do update set
    role = excluded.role,
    status = 'active',
    joined_at = coalesce(public.board_members.joined_at, excluded.joined_at),
    updated_at = timezone('utc', now());

  update public.board_invites
  set
    accepted_at = timezone('utc', now()),
    accepted_by_user_id = p_user_id,
    status = 'accepted'
  where id = v_invite.id;

  update public.profiles
  set last_active_board_id = v_invite.board_id
  where id = p_user_id;

  return query
  select boards.id, boards.name, v_invite.role
  from public.boards
  where boards.id = v_invite.board_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_invites enable row level security;
alter table public.grocery_entries enable row level security;
alter table public.extracted_receipts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  id = app_private.current_app_user_id()
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
using (id = app_private.current_app_user_id())
with check (id = app_private.current_app_user_id());

drop policy if exists "boards_select_member" on public.boards;
create policy "boards_select_member"
on public.boards
for select
to authenticated
using (app_private.user_has_board_role(id));

drop policy if exists "boards_insert_owner" on public.boards;
create policy "boards_insert_owner"
on public.boards
for insert
to authenticated
with check (owner_user_id = app_private.current_app_user_id());

drop policy if exists "boards_update_owner" on public.boards;
create policy "boards_update_owner"
on public.boards
for update
to authenticated
using (app_private.user_has_board_role(id, array['owner']))
with check (app_private.user_has_board_role(id, array['owner']));

drop policy if exists "board_members_select_member" on public.board_members;
create policy "board_members_select_member"
on public.board_members
for select
to authenticated
using (app_private.user_has_board_role(board_id));

drop policy if exists "board_members_manage_owner" on public.board_members;
create policy "board_members_manage_owner"
on public.board_members
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner']))
with check (app_private.user_has_board_role(board_id, array['owner']));

drop policy if exists "board_invites_owner_only" on public.board_invites;
create policy "board_invites_owner_only"
on public.board_invites
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner']))
with check (app_private.user_has_board_role(board_id, array['owner']));

drop policy if exists "grocery_entries_select_member" on public.grocery_entries;
create policy "grocery_entries_select_member"
on public.grocery_entries
for select
to authenticated
using (app_private.user_has_board_role(board_id));

drop policy if exists "grocery_entries_write_editor" on public.grocery_entries;
create policy "grocery_entries_write_editor"
on public.grocery_entries
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner', 'editor']))
with check (
  app_private.user_has_board_role(board_id, array['owner', 'editor'])
  and created_by_user_id = app_private.current_app_user_id()
);

drop policy if exists "extracted_receipts_select_member" on public.extracted_receipts;
create policy "extracted_receipts_select_member"
on public.extracted_receipts
for select
to authenticated
using (app_private.user_has_board_role(board_id));

drop policy if exists "extracted_receipts_write_editor" on public.extracted_receipts;
create policy "extracted_receipts_write_editor"
on public.extracted_receipts
for all
to authenticated
using (app_private.user_has_board_role(board_id, array['owner', 'editor']))
with check (
  app_private.user_has_board_role(board_id, array['owner', 'editor'])
  and created_by_user_id = app_private.current_app_user_id()
);