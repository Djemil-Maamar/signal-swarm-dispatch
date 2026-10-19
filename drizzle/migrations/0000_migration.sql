create type public.app_role as enum ('admin', 'operator');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "Users see own roles, admins see all" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant insert, update, delete on public.user_roles to authenticated;

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'operator');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users
  for each row execute function public.handle_new_user_role();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text,
  email text,
  tags text[] not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contacts to authenticated;
grant all on public.contacts to service_role;
alter table public.contacts enable row level security;
create policy "Members manage contacts" on public.contacts for all to authenticated
  using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;
alter table public.templates enable row level security;
create policy "Members manage templates" on public.templates for all to authenticated
  using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  scheduled_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Members manage campaigns" on public.campaigns for all to authenticated
  using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  phone text not null,
  body text not null,
  status text not null default 'pending',
  error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  device_id uuid,
  created_at timestamptz not null default now()
);
create index messages_due_idx on public.messages (status, scheduled_at);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Members manage messages" on public.messages for all to authenticated
  using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "Members view devices" on public.devices for select to authenticated using (public.is_member(auth.uid()));
create policy "Admins manage devices" on public.devices for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Atomically claim due messages for a gateway device
create or replace function public.claim_messages(_device uuid, _limit int)
returns setof public.messages language sql security definer set search_path = public as $$
  update public.messages m set status = 'sending', device_id = _device
  where m.id in (
    select id from public.messages where status = 'pending' and scheduled_at <= now()
    order by scheduled_at limit _limit for update skip locked
  ) returning m.*;
$$;
revoke execute on function public.claim_messages(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_messages(uuid, int) to service_role;

alter publication supabase_realtime add table public.messages;