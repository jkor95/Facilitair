-- Meldpunt VWO v5.6.7 - e-mailvoorkeuren facilitair
-- Eenmalig uitvoeren in Supabase > SQL Editor.

alter table public.dm_accounts
  add column if not exists email_notifications boolean not null default false;
