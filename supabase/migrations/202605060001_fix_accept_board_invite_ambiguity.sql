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
  on conflict on constraint board_members_unique_member
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
  select boards.id as board_id, boards.name as board_name, v_invite.role as role
  from public.boards
  where boards.id = v_invite.board_id;
end;
$$;