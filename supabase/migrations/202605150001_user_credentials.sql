create table if not exists public.user_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_credentials_email_idx on public.user_credentials(lower(email));
create index if not exists user_credentials_user_id_idx on public.user_credentials(user_id);

alter table public.user_credentials enable row level security;

drop trigger if exists user_credentials_touch_updated_at on public.user_credentials;
create trigger user_credentials_touch_updated_at
before update on public.user_credentials
for each row
execute function app_private.touch_updated_at();
