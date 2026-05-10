-- Fix auth profile creation and RLS helper recursion.
-- Run this in Supabase SQL Editor after the initial schema.

create or replace function public.get_my_unit_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unit_id
  from public.users
  where id = auth.uid();
$$;

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() = 'super_admin'::public.user_role;
$$;

grant execute on function public.get_my_unit_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, 'Pengguna Baru'), '@', 1),
      'Pengguna Baru'
    ),
    'petugas'::public.user_role,
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;

create trigger trg_handle_new_user
after insert on auth.users
for each row
execute function public.fn_handle_new_user();
