-- Meldpunt VWO v5.6.5 - eenmalige migratie voor bestaande installatie
alter table public.dm_routing add column if not exists assign_all boolean not null default false;

create table if not exists public.dm_routing_members (
  category text not null references public.dm_routing(category) on delete cascade,
  account_id uuid not null references public.dm_accounts(id) on delete cascade,
  primary key(category,account_id)
);

create table if not exists public.dm_ticket_assignments (
  ticket_id bigint not null references public.dm_tickets(id) on delete cascade,
  account_id uuid not null references public.dm_accounts(id) on delete cascade,
  primary key(ticket_id,account_id)
);

-- Neem bestaande enkelvoudige routing/toewijzingen over.
insert into public.dm_routing_members(category,account_id)
select category,account_id from public.dm_routing where account_id is not null
on conflict do nothing;

insert into public.dm_ticket_assignments(ticket_id,account_id)
select id,assignee from public.dm_tickets where assignee is not null
on conflict do nothing;

insert into public.dm_settings(key,value) values
  ('reportHeroTitleSize','30'::jsonb),
  ('reportHeroIntroSize','14'::jsonb),
  ('reportHeroLocationSize','16'::jsonb),
  ('reportHeroEmergencySize','12'::jsonb)
on conflict (key) do nothing;

alter table public.dm_routing_members enable row level security;
alter table public.dm_ticket_assignments enable row level security;
revoke all on table public.dm_routing_members from anon, authenticated;
revoke all on table public.dm_ticket_assignments from anon, authenticated;
