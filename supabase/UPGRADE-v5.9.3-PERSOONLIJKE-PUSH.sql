-- Alleen Dalton meldpunt: xmmrplvhkfvyfqwjrugl. Zie SUPABASE-HANDLEIDING.txt.
-- Upgrade vanaf v5.9.2. Geen bestaande tickets/accounts/toewijzingen wijzigen.
begin;

create table if not exists public.dm_push_preferences (
  account_id uuid primary key references public.dm_accounts(id) on delete cascade,
  laag boolean not null default false,
  normaal boolean not null default false,
  hoog boolean not null default true,
  spoed boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.dm_push_preferences enable row level security;
revoke all on public.dm_push_preferences from public,anon,authenticated;
grant all on public.dm_push_preferences to service_role;

-- Zonder persoonlijke keuze blijft het bestaande Hoog/Spoed-gedrag behouden.
-- Notificatie-/zichtrechten worden daarnaast op de bestaande plaatsen getoetst.
create or replace function public.dm_push_wants(p_account uuid,p_urgency text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select case p_urgency
    when 'laag' then p.laag when 'normaal' then p.normaal
    when 'hoog' then p.hoog when 'spoed' then p.spoed else false end
    from dm_push_preferences p where p.account_id=p_account),p_urgency in ('hoog','spoed'),false)
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
  if p_active and t.status='done' then raise exception 'Alleen bij een open melding'; end if;
  if not p_active and old.account_id is null then raise exception 'Geen eigen onderweg-status'; end if;
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
  if p_active and t.urgency in ('laag','normaal','hoog','spoed') then
    insert into dm_push_deliveries(event_id,subscription_id,payload)
      select p_request,s.id,jsonb_build_object('eventId',p_request,'ticketId',p_ticket,'urgency',t.urgency,
        'title','Meldpunt VWO – '||upper(t.urgency),
        'body',(case when dm_push_allowed(s.account_id,'viewAssignment') then left(a.name,100) else 'Een medewerker' end)||' is onderweg naar '||left(t.location,150)||' voor melding '||coalesce(t.ticket_no,'M-'||t.id::text)||'.')
      from dm_push_subscriptions s
      where s.account_id<>p_actor and dm_push_wants(s.account_id,t.urgency)
        and dm_push_allowed(s.account_id,'notifications') and dm_push_allowed(s.account_id,'viewAllTickets')
        and (s.expiration_time is null or s.expiration_time>now())
      on conflict do nothing;
  end if;
  return jsonb_build_object('eventId',p_request,'changed',true);
end
$$;

create or replace function public.dm_claim_push_deliveries(p_event uuid,p_actor uuid)
returns table(subscription_id uuid,endpoint text,p256dh text,auth text,payload jsonb,subscription_version timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare ev dm_push_events%rowtype; event_urgency text;
begin
  select * into ev from dm_push_events where id=p_event and actor_id is not distinct from p_actor;
  if not found then raise exception 'Geen toegang'; end if;
  -- Nieuwe payloads bewaren de urgentie; bestaande wachtende Hoog/Spoed-payloads
  -- blijven herkenbaar zonder data te herschrijven.
  select coalesce(d.payload->>'urgency',case d.payload->>'title'
    when 'Meldpunt VWO – HOOG' then 'hoog' when 'Meldpunt VWO – SPOED' then 'spoed' end)
    into event_urgency from dm_push_deliveries d where d.event_id=p_event limit 1;
  -- Hercontrole vlak voor verzenden, inclusief de nieuwste accountvoorkeur.
  -- De eigen apparaattest blijft onafhankelijk van de urgentiekeuze.
  update dm_push_deliveries d set state='dropped',updated_at=now() from dm_push_subscriptions s
    where d.event_id=p_event and d.subscription_id=s.id and d.state='pending' and (
      ev.created_at<now()-interval '1 hour'
      or (ev.kind<>'test' and not dm_push_wants(s.account_id,event_urgency))
      or not dm_push_allowed(s.account_id,'notifications') or not dm_push_allowed(s.account_id,'viewAllTickets')
      or (ev.kind in ('on_way','test') and not dm_push_allowed(p_actor,'viewAllTickets'))
      or (s.expiration_time is not null and s.expiration_time<=now())
      or (ev.kind='test' and s.account_id<>p_actor)
      or (ev.kind in ('ticket_created','urgency_raised') and not exists(
        select 1 from dm_tickets where id=ev.ticket_id and status<>'done' and urgency=event_urgency))
      or (ev.kind='on_way' and (s.account_id=p_actor
        or not dm_push_allowed(p_actor,'editStatus')
        or not exists(select 1 from dm_tickets where id=ev.ticket_id and status<>'done' and urgency=event_urgency)
        or not exists(select 1 from dm_ticket_on_way where ticket_id=ev.ticket_id and account_id=p_actor and active and event_id=p_event)))
    );
  -- At-most-once claim. Bij een onzekere netwerkuitkomst nooit blind opnieuw verzenden.
  return query with claimed as (
    update dm_push_deliveries d set state='claimed',updated_at=now()
    where d.event_id=p_event and d.state='pending' returning d.subscription_id,d.payload
  ) select s.id,s.endpoint,s.p256dh,s.auth,
    case when ev.kind='on_way' and not dm_push_allowed(s.account_id,'viewAssignment')
      then jsonb_set(c.payload,'{body}',to_jsonb('Een medewerker is onderweg naar '||left(t.location,150)||' voor melding '||coalesce(t.ticket_no,'M-'||t.id::text)||'.'))
      else c.payload end,
    s.updated_at from claimed c join dm_push_subscriptions s on s.id=c.subscription_id
    left join dm_tickets t on t.id=ev.ticket_id;
end
$$;

create or replace function public.dm_queue_urgent_ticket()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare event_kind text; event_id uuid;
begin
  if new.status='done' or new.urgency not in ('laag','normaal','hoog','spoed') or new.ticket_no is null then return new; end if;
  if tg_op='INSERT' then
    event_kind := 'ticket_created';
  elsif old.ticket_no is null and new.ticket_no is not null then
    event_kind := 'ticket_created';
  elsif (case new.urgency when 'spoed' then 4 when 'hoog' then 3 when 'normaal' then 2 else 1 end)
      > (case old.urgency when 'spoed' then 4 when 'hoog' then 3 when 'normaal' then 2 else 1 end) then
    event_kind := 'urgency_raised';
  else return new;
  end if;
  event_id := gen_random_uuid();
  insert into dm_push_events(id,actor_id,ticket_id,kind,changed) values(event_id,null,new.id,event_kind,true);
  insert into dm_push_deliveries(event_id,subscription_id,payload)
    select event_id,s.id,jsonb_build_object('eventId',event_id,'ticketId',new.id,'urgency',new.urgency,
      'title','Meldpunt VWO – '||upper(new.urgency),
      'body',(case when event_kind='ticket_created' then 'Nieuwe melding ' else 'Urgentie verhoogd voor melding ' end)
        ||new.ticket_no||' bij '||left(new.location,150)||': '||upper(new.urgency)||'.')
    from dm_push_subscriptions s
    where dm_push_wants(s.account_id,new.urgency) and dm_push_allowed(s.account_id,'notifications') and dm_push_allowed(s.account_id,'viewAllTickets')
      and (s.expiration_time is null or s.expiration_time>now())
    on conflict do nothing;
  return new;
end
$$;

revoke all on function public.dm_push_wants(uuid,text),public.dm_set_on_way(uuid,bigint,boolean,uuid),
  public.dm_claim_push_deliveries(uuid,uuid),public.dm_queue_urgent_ticket() from public,anon,authenticated;
grant execute on function public.dm_push_wants(uuid,text),public.dm_set_on_way(uuid,bigint,boolean,uuid),
  public.dm_claim_push_deliveries(uuid,uuid),public.dm_queue_urgent_ticket() to service_role;
commit;
