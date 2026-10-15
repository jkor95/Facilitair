-- Alleen Dalton meldpunt: xmmrplvhkfvyfqwjrugl. Zie SUPABASE-HANDLEIDING.txt.
-- Additief en herhaalbaar; geen bestaande tickets/accounts/toewijzingen aanpassen.
begin;

create table if not exists public.dm_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.dm_accounts(id) on delete cascade,
  device_id uuid not null,
  endpoint_hash text not null unique,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists dm_push_device on public.dm_push_subscriptions(device_id);

create table if not exists public.dm_push_events (
  id uuid primary key,
  actor_id uuid not null references public.dm_accounts(id) on delete cascade,
  ticket_id bigint references public.dm_tickets(id) on delete cascade,
  kind text not null check (kind in ('on_way','cancel','test')),
  changed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dm_push_events_actor on public.dm_push_events(actor_id,created_at);

create table if not exists public.dm_ticket_on_way (
  ticket_id bigint not null references public.dm_tickets(id) on delete cascade,
  account_id uuid not null references public.dm_accounts(id) on delete cascade,
  active boolean not null default true,
  since timestamptz not null default now(),
  event_id uuid not null references public.dm_push_events(id),
  primary key(ticket_id,account_id)
);

create table if not exists public.dm_push_deliveries (
  event_id uuid not null references public.dm_push_events(id) on delete cascade,
  subscription_id uuid not null references public.dm_push_subscriptions(id) on delete cascade,
  payload jsonb not null,
  state text not null default 'pending' check (state in ('pending','claimed','sent','failed','dropped')),
  updated_at timestamptz not null default now(),
  primary key(event_id,subscription_id)
);

-- De app gebruikt eigen dm_sessions. Geen browsertoegang tot deze tabellen/RPC's.
alter table public.dm_push_subscriptions enable row level security;
alter table public.dm_push_events enable row level security;
alter table public.dm_ticket_on_way enable row level security;
alter table public.dm_push_deliveries enable row level security;
revoke all on public.dm_push_subscriptions,public.dm_push_events,public.dm_ticket_on_way,public.dm_push_deliveries from public,anon,authenticated;
grant all on public.dm_push_subscriptions,public.dm_push_events,public.dm_ticket_on_way,public.dm_push_deliveries to service_role;

create or replace function public.dm_push_allowed(p_account uuid,p_permission text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare role_name text; perms jsonb;
begin
  if p_permission not in ('viewAllTickets','editStatus','notifications','viewAssignment') then return false; end if;
  select case when (select value->>a.id::text from dm_settings where key='accountRoleOverrides')='concierge'
    then 'concierge' else a.role end into role_name from dm_accounts a where a.id=p_account and a.active;
  if not found then return false; end if;
  if role_name='admin' then return true; end if;
  if role_name not in ('facility','concierge') then return false; end if;
  select value->role_name into perms from dm_settings where key='rolePermissions';
  -- Zelfde normalisatie als de bestaande Edge Function: bewerken vereist zien.
  if p_permission='viewAssignment' and coalesce((perms->>'editAssignment')::boolean,true) then return true; end if;
  return coalesce((perms->>p_permission)::boolean,true);
end
$$;

create or replace function public.dm_push_assigned(p_ticket bigint,p_account uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from dm_ticket_assignments where ticket_id=p_ticket and account_id=p_account)
    or (not exists(select 1 from dm_ticket_assignments where ticket_id=p_ticket)
        and exists(select 1 from dm_tickets where id=p_ticket and assignee=p_account))
$$;

create or replace function public.dm_register_push(p_actor uuid,p_device uuid,p_hash text,p_endpoint text,p_p256dh text,p_auth text,p_expiration timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not dm_push_allowed(p_actor,'notifications') or not dm_push_allowed(p_actor,'viewAllTickets') then raise exception 'Geen toegang'; end if;
  -- Eén endpoint heeft precies één eigenaar. Opnieuw aanmelden verplaatst het apparaat.
  perform pg_advisory_xact_lock(hashtextextended(p_device::text,0));
  insert into dm_push_subscriptions(account_id,device_id,endpoint_hash,endpoint,p256dh,auth,expiration_time)
  values(p_actor,p_device,p_hash,p_endpoint,p_p256dh,p_auth,p_expiration)
  on conflict(endpoint_hash) do update set account_id=excluded.account_id,device_id=excluded.device_id,
    endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth,expiration_time=excluded.expiration_time,updated_at=now()
  returning id into v_id;
  delete from dm_push_subscriptions where device_id=p_device and id<>v_id;
end
$$;

create or replace function public.dm_set_on_way(p_actor uuid,p_ticket bigint,p_active boolean,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t dm_tickets%rowtype; a dm_accounts%rowtype; old dm_ticket_on_way%rowtype;
  ev dm_push_events%rowtype; changed boolean; action_text text;
begin
  if p_active is null then raise exception 'Onderweg-status ontbreekt'; end if;
  select * into t from dm_tickets where id=p_ticket for update;
  if not found or not dm_push_allowed(p_actor,'viewAllTickets') or not dm_push_allowed(p_actor,'editStatus') then raise exception 'Geen toegang'; end if;
  select * into a from dm_accounts where id=p_actor and active;
  select * into old from dm_ticket_on_way where ticket_id=p_ticket and account_id=p_actor;
  if p_active and (t.status='done' or not dm_push_assigned(p_ticket,p_actor)) then raise exception 'Alleen toegewezen medewerkers bij een open melding'; end if;
  if not p_active and old.account_id is null and not dm_push_assigned(p_ticket,p_actor) then raise exception 'Geen eigen onderweg-status'; end if;
  select * into ev from dm_push_events where id=p_request;
  if found then
    if ev.actor_id<>p_actor or ev.ticket_id is distinct from p_ticket or ev.kind<>(case when p_active then 'on_way' else 'cancel' end) then raise exception 'Verzoek-id al in gebruik'; end if;
    return jsonb_build_object('eventId',p_request,'changed',false);
  end if;
  changed := coalesce(old.active,false) is distinct from p_active;
  insert into dm_push_events(id,actor_id,ticket_id,kind,changed)
    values(p_request,p_actor,p_ticket,case when p_active then 'on_way' else 'cancel' end,changed);
  if not changed then return jsonb_build_object('eventId',p_request,'changed',false); end if;
  insert into dm_ticket_on_way(ticket_id,account_id,active,since,event_id)
    values(p_ticket,p_actor,p_active,now(),p_request)
    on conflict(ticket_id,account_id) do update set active=excluded.active,since=excluded.since,event_id=excluded.event_id;
  action_text := case when p_active then 'Ik ben onderweg' else 'Onderweg ingetrokken' end;
  insert into dm_ticket_history(ticket_id,actor,actor_id,action) values(p_ticket,a.name,p_actor,action_text);
  insert into dm_audit_logs(actor,actor_id,type,target_id,action) values(a.name,p_actor,'ticket',p_ticket::text,action_text);
  -- Beslis urgentie, ontvangers en inhoud uitsluitend met serverdata.
  if p_active and t.urgency in ('hoog','spoed') then
    insert into dm_push_deliveries(event_id,subscription_id,payload)
      select p_request,s.id,jsonb_build_object('eventId',p_request,'ticketId',p_ticket,
        'title','Meldpunt VWO – '||upper(t.urgency),
        'body',left(a.name,100)||' is onderweg naar '||left(t.location,150)||' voor melding '||coalesce(t.ticket_no,'M-'||t.id::text)||'.')
      from dm_push_subscriptions s
      where s.account_id<>p_actor and dm_push_assigned(p_ticket,s.account_id)
        and dm_push_allowed(s.account_id,'notifications') and dm_push_allowed(s.account_id,'viewAllTickets')
        and dm_push_allowed(s.account_id,'viewAssignment')
        and (s.expiration_time is null or s.expiration_time>now())
      on conflict do nothing;
  end if;
  return jsonb_build_object('eventId',p_request,'changed',true);
end
$$;

create or replace function public.dm_test_push(p_actor uuid,p_device uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare ev dm_push_events%rowtype; sub dm_push_subscriptions%rowtype;
begin
  if not dm_push_allowed(p_actor,'notifications') or not dm_push_allowed(p_actor,'viewAllTickets') then raise exception 'Geen toegang'; end if;
  select * into sub from dm_push_subscriptions where account_id=p_actor and device_id=p_device for update;
  if not found then raise exception 'Dit apparaat is niet aangemeld'; end if;
  select * into ev from dm_push_events where id=p_request;
  if found then
    if ev.actor_id<>p_actor or ev.kind<>'test' or not exists(select 1 from dm_push_deliveries where event_id=p_request and subscription_id=sub.id) then raise exception 'Verzoek-id al in gebruik'; end if;
    return p_request;
  end if;
  if exists(select 1 from dm_push_deliveries d join dm_push_events e on e.id=d.event_id
      where d.subscription_id=sub.id and e.kind='test' and e.created_at>now()-interval '10 seconds') then raise exception 'Wacht 10 seconden voor een nieuwe test'; end if;
  insert into dm_push_events(id,actor_id,kind,changed) values(p_request,p_actor,'test',true);
  insert into dm_push_deliveries(event_id,subscription_id,payload) values(p_request,sub.id,
    jsonb_build_object('eventId',p_request,'title','Meldpunt VWO – test','body','Pushmeldingen werken op dit apparaat.'));
  return p_request;
end
$$;

create or replace function public.dm_claim_push_deliveries(p_event uuid,p_actor uuid)
returns table(subscription_id uuid,endpoint text,p256dh text,auth text,payload jsonb,subscription_version timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare ev dm_push_events%rowtype;
begin
  select * into ev from dm_push_events where id=p_event and actor_id=p_actor;
  if not found then raise exception 'Geen toegang'; end if;
  -- Hercontrole vlak voor verzenden; ingetrokken/toewijzing verwijderd/account uit => laten vallen.
  update dm_push_deliveries d set state='dropped',updated_at=now() from dm_push_subscriptions s
    where d.event_id=p_event and d.subscription_id=s.id and d.state='pending' and (
      ev.created_at<now()-interval '1 hour'
      or not dm_push_allowed(s.account_id,'notifications') or not dm_push_allowed(s.account_id,'viewAllTickets')
      or not dm_push_allowed(p_actor,'viewAllTickets')
      or (s.expiration_time is not null and s.expiration_time<=now())
      or (ev.kind='test' and s.account_id<>p_actor)
      or (ev.kind='on_way' and (s.account_id=p_actor or not dm_push_assigned(ev.ticket_id,s.account_id)
        or not dm_push_allowed(s.account_id,'viewAssignment')
        or not dm_push_assigned(ev.ticket_id,p_actor) or not dm_push_allowed(p_actor,'editStatus')
        or not exists(select 1 from dm_tickets where id=ev.ticket_id and status<>'done' and urgency in ('hoog','spoed'))
        or not exists(select 1 from dm_ticket_on_way where ticket_id=ev.ticket_id and account_id=p_actor and active and event_id=p_event)))
    );
  -- At-most-once claim. Bij een onzekere netwerkuitkomst nooit blind opnieuw verzenden.
  return query with claimed as (
    update dm_push_deliveries d set state='claimed',updated_at=now()
    where d.event_id=p_event and d.state='pending' returning d.subscription_id,d.payload
  ) select s.id,s.endpoint,s.p256dh,s.auth,c.payload,s.updated_at from claimed c join dm_push_subscriptions s on s.id=c.subscription_id;
end
$$;

revoke all on function public.dm_push_allowed(uuid,text),public.dm_push_assigned(bigint,uuid),
  public.dm_register_push(uuid,uuid,text,text,text,text,timestamptz),public.dm_set_on_way(uuid,bigint,boolean,uuid),
  public.dm_test_push(uuid,uuid,uuid),public.dm_claim_push_deliveries(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dm_push_allowed(uuid,text),public.dm_push_assigned(bigint,uuid),
  public.dm_register_push(uuid,uuid,text,text,text,text,timestamptz),public.dm_set_on_way(uuid,bigint,boolean,uuid),
  public.dm_test_push(uuid,uuid,uuid),public.dm_claim_push_deliveries(uuid,uuid) to service_role;
commit;
