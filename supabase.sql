-- Cipher database setup. Paste into Supabase → SQL Editor → Run.
-- 1) CHANGE 'CHANGE-ME' on the line marked below to your own admin password first.

create table if not exists public.docs (
  path text primary key,
  coll text not null,
  data jsonb not null,
  t bigint not null default 0
);
create index if not exists docs_coll_t on public.docs (coll, t desc);
alter table public.docs replica identity full;
alter table public.docs enable row level security;

drop policy if exists "read all" on public.docs;
drop policy if exists "write non-bans" on public.docs;
drop policy if exists "update non-bans" on public.docs;
drop policy if exists "delete non-bans" on public.docs;
create policy "read all" on public.docs for select using (true);
create policy "write non-bans" on public.docs for insert with check (path not like 'bans/%');
create policy "update non-bans" on public.docs for update using (path not like 'bans/%') with check (path not like 'bans/%');
create policy "delete non-bans" on public.docs for delete using (path not like 'bans/%');

do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

create extension if not exists pgcrypto with schema extensions;
create table if not exists public.admin_secret (id int primary key default 1, hash text not null);
alter table public.admin_secret enable row level security;  -- no policies: nobody can read it

insert into public.admin_secret (id, hash)
values (1, encode(extensions.digest('CHANGE-ME', 'sha256'), 'hex'))   -- <== your admin password
on conflict (id) do update set hash = excluded.hash;

create or replace function public.admin_ban(num text, secret text, ban boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from admin_secret where hash = encode(digest(secret, 'sha256'), 'hex')) then
    raise exception 'Wrong admin password';
  end if;
  if num !~ '^\d{4,12}$' or num = '0001' then raise exception 'Invalid number'; end if;
  if ban then
    insert into docs (path, coll, data, t)
    values ('bans/' || num, 'bans', jsonb_build_object('t', (extract(epoch from now()) * 1000)::bigint, 'by', '0001'), 0)
    on conflict (path) do nothing;
  else
    delete from docs where path = 'bans/' || num;
  end if;
end $$;
revoke all on function public.admin_ban(text, text, boolean) from public;
grant execute on function public.admin_ban(text, text, boolean) to anon, authenticated;
