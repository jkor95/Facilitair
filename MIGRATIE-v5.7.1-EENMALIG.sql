-- Meldpunt VWO v5.7.1 - ENIGE migratie die je voor deze versie hoeft uit te voeren.
-- Geen e-mailfunctionaliteit. Veilig bedoeld voor bestaande installaties:
-- objecten/kolommen worden alleen toegevoegd als ze ontbreken.

-- Meervoudige automatische toewijzing
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

insert into public.dm_routing_members(category,account_id)
select category,account_id from public.dm_routing where account_id is not null
on conflict do nothing;

insert into public.dm_ticket_assignments(ticket_id,account_id)
select id,assignee from public.dm_tickets where assignee is not null
on conflict do nothing;

alter table public.dm_routing_members enable row level security;
alter table public.dm_ticket_assignments enable row level security;
revoke all on table public.dm_routing_members from anon, authenticated;
revoke all on table public.dm_ticket_assignments from anon, authenticated;

-- Tekstgroottes meldpagina
insert into public.dm_settings(key,value) values
  ('reportHeroTitleSize','30'::jsonb),
  ('reportHeroIntroSize','14'::jsonb),
  ('reportHeroLocationSize','16'::jsonb),
  ('reportHeroEmergencySize','12'::jsonb)
on conflict (key) do nothing;

-- Dagelijkse ticketnummering M-YYMMDD###
create table if not exists public.dm_ticket_counters (
  ticket_date date primary key,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.dm_ticket_counters enable row level security;
revoke all on table public.dm_ticket_counters from anon, authenticated;

create or replace function public.dm_next_ticket_number()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_date date := (now() at time zone 'Europe/Amsterdam')::date;
  v_number integer;
begin
  insert into public.dm_ticket_counters(ticket_date,last_number,updated_at)
  values (v_date,1,now())
  on conflict (ticket_date) do update
    set last_number = public.dm_ticket_counters.last_number + 1,
        updated_at = now()
  returning last_number into v_number;

  if v_number > 999 then
    raise exception 'Maximaal 999 tickets per dag bereikt';
  end if;

  return jsonb_build_object(
    'ticket_date', to_char(v_date,'YYYY-MM-DD'),
    'number', v_number
  );
end;
$$;

revoke all on function public.dm_next_ticket_number() from public, anon, authenticated;
grant execute on function public.dm_next_ticket_number() to service_role;

-- Oude mailinstellingen uit eerdere proefversies worden bewust niet meer gebruikt.
-- We laten eventuele bestaande kolommen/waarden staan voor compatibiliteit; de app leest of gebruikt ze niet meer.
