-- Meldpunt VWO v5.8.17
-- Eenmalig uitvoeren in Supabase SQL Editor VOORDAT de nieuwe smart-function wordt geplaatst.

alter table if exists public.dm_tickets
  add column if not exists public_visible boolean not null default true;

-- Bestaande meldingen van actieve Facilitair/Conciërge-accounts verbergen op de melderspagina.
-- Conciërge-accounts worden intern als facility opgeslagen en via instellingen als Conciërge getoond.
update public.dm_tickets t
set public_visible = false
where exists (
  select 1
  from public.dm_accounts a
  where a.active = true
    and a.role = 'facility'
    and (
      lower(regexp_replace(trim(t.reporter), '\s+', ' ', 'g')) = lower(regexp_replace(trim(a.name), '\s+', ' ', 'g'))
      or lower(regexp_replace(trim(t.reporter), '\s+', ' ', 'g')) = lower(split_part(regexp_replace(trim(a.name), '\s+', ' ', 'g'), ' ', 1))
    )
);

create index if not exists dm_tickets_public_overview_idx
  on public.dm_tickets (public_visible, status, category, created_at desc);
