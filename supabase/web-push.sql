-- Meldpunt VWO: Web Push subscriptions. Uitvoeren in SQL Editor van JUISTE project.
-- Alleen nieuwe tabel; bestaande tickets, accounts en instellingen blijven ongemoeid.
create table if not exists public.dm_push_subscriptions (
 id bigint generated always as identity primary key,
 account_id uuid not null references public.dm_accounts(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 urgencies jsonb not null default '{"laag":true,"normaal":true,"hoog":true,"spoed":true}'::jsonb,
 scope jsonb not null default '{"mine":true,"unassigned":true}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists dm_push_subscriptions_account_idx on public.dm_push_subscriptions(account_id);
alter table public.dm_push_subscriptions enable row level security;
-- Geen policies: alleen de service-role Edge Function mag lezen/schrijven.
revoke all on public.dm_push_subscriptions from anon, authenticated;
revoke all on sequence public.dm_push_subscriptions_id_seq from anon, authenticated;
