-- Meldpunt VWO v5.8.11 - eenmalige database-upgrade
-- Nodig voor de nieuwe planning / uitvoerdatum per melding.

alter table public.dm_tickets
  add column if not exists planned_for date;

create index if not exists dm_tickets_planned_for_idx
  on public.dm_tickets(planned_for)
  where status <> 'done';

-- Bestaande RLS en rechten op dm_tickets blijven ongewijzigd.
-- GitHub Pages benadert deze tabel niet rechtstreeks; toegang blijft via de Edge Function lopen.
