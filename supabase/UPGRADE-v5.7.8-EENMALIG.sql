-- Meldpunt VWO v5.7.8 - eenmalige database-upgrade
-- Voer dit 1x uit in de SQL Editor van het bestaande Supabase-project.

alter table public.dm_tickets
  add column if not exists reporter_email text not null default '';

insert into public.dm_settings(key,value,updated_at)
values ('publicOutageOverview','true'::jsonb,now())
on conflict (key) do nothing;
