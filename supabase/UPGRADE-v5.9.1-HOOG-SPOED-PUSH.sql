-- Alleen Dalton meldpunt: xmmrplvhkfvyfqwjrugl. Zie SUPABASE-HANDLEIDING.txt.
-- Upgrade VANAF geïnstalleerde v5.9.0. Geen oude migraties opnieuw uitvoeren.
-- Geen bestaande tickets/accounts/toewijzingen wijzigen of oude meldingen verzenden.
begin;

-- Alleen nieuwe ticketgebeurtenissen hebben geen individuele actor.
alter table public.dm_push_events alter column actor_id drop not null;
alter table public.dm_push_events drop constraint if exists dm_push_events_kind_check;
alter table public.dm_push_events add constraint dm_push_events_kind_check
  check (kind in ('on_way','cancel','test','ticket_created','urgency_raised'));
alter table public.dm_push_events drop constraint if exists dm_push_events_actor_kind_check;
alter table public.dm_push_events add constraint dm_push_events_actor_kind_check
  check ((kind in ('on_way','cancel','test') and actor_id is not null)
      or (kind in ('ticket_created','urgency_raised') and actor_id is null));

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
        'body',(case when dm_push_allowed(s.account_id,'viewAssignment') then left(a.name,100) else 'Een medewerker' end)||' is onderweg naar '||left(t.location,150)||' voor melding '||coalesce(t.ticket_no,'M-'||t.id::text)||'.')
      from dm_push_subscriptions s
      where s.account_id<>p_actor
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
declare ev dm_push_events%rowtype;
begin
  select * into ev from dm_push_events where id=p_event and actor_id is not distinct from p_actor;
  if not found then raise exception 'Geen toegang'; end if;
  -- Hercontrole vlak voor verzenden; ontvangers hoeven niet toegewezen te zijn.
  update dm_push_deliveries d set state='dropped',updated_at=now() from dm_push_subscriptions s
    where d.event_id=p_event and d.subscription_id=s.id and d.state='pending' and (
      ev.created_at<now()-interval '1 hour'
      or not dm_push_allowed(s.account_id,'notifications') or not dm_push_allowed(s.account_id,'viewAllTickets')
      or (ev.kind in ('on_way','test') and not dm_push_allowed(p_actor,'viewAllTickets'))
      or (s.expiration_time is not null and s.expiration_time<=now())
      or (ev.kind='test' and s.account_id<>p_actor)
      or (ev.kind in ('ticket_created','urgency_raised') and not exists(
        select 1 from dm_tickets where id=ev.ticket_id and status<>'done' and urgency in ('hoog','spoed')))
      or (ev.kind='on_way' and (s.account_id=p_actor
        or not dm_push_assigned(ev.ticket_id,p_actor) or not dm_push_allowed(p_actor,'editStatus')
        or not exists(select 1 from dm_tickets where id=ev.ticket_id and status<>'done' and urgency in ('hoog','spoed'))
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

-- De echte database-overgang maakt de queue in dezelfde transactie.
-- Ticketnummer wordt pas na de oorspronkelijke insert/foto-afhandeling gezet.
-- Daardoor geen dubbele push bij die tweede update of bij ongewijzigd opslaan.
create or replace function public.dm_queue_urgent_ticket()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare event_kind text; event_id uuid;
begin
  if new.status='done' or new.urgency not in ('hoog','spoed') or new.ticket_no is null then return new; end if;
  if tg_op='INSERT' then
    event_kind := 'ticket_created';
  elsif old.ticket_no is null and new.ticket_no is not null then
    event_kind := 'ticket_created';
  elsif (case new.urgency when 'spoed' then 4 when 'hoog' then 3 else 0 end)
      > (case old.urgency when 'spoed' then 4 when 'hoog' then 3 when 'normaal' then 2 else 1 end) then
    event_kind := 'urgency_raised';
  else return new;
  end if;
  event_id := gen_random_uuid();
  insert into dm_push_events(id,actor_id,ticket_id,kind,changed) values(event_id,null,new.id,event_kind,true);
  insert into dm_push_deliveries(event_id,subscription_id,payload)
    select event_id,s.id,jsonb_build_object('eventId',event_id,'ticketId',new.id,
      'title','Meldpunt VWO – '||upper(new.urgency),
      'body',(case when event_kind='ticket_created' then 'Nieuwe melding ' else 'Urgentie verhoogd voor melding ' end)
        ||new.ticket_no||' bij '||left(new.location,150)||': '||upper(new.urgency)||'.')
    from dm_push_subscriptions s
    where dm_push_allowed(s.account_id,'notifications') and dm_push_allowed(s.account_id,'viewAllTickets')
      and (s.expiration_time is null or s.expiration_time>now())
    on conflict do nothing;
  return new;
end
$$;
drop trigger if exists dm_urgent_ticket_push on public.dm_tickets;
create trigger dm_urgent_ticket_push after insert or update of urgency,ticket_no on public.dm_tickets
  for each row execute function public.dm_queue_urgent_ticket();

-- Alleen de vertrouwde backend kan na de bestaande aanmaak-/bewerkactie verzenden.
-- Geen openbaar endpoint om willekeurige tickets of ontvangers te kiezen.
create or replace function public.dm_pending_ticket_push(p_ticket bigint)
returns table(event_id uuid) language sql stable security definer set search_path=public,pg_temp as $$
  select e.id from dm_push_events e
  where e.ticket_id=p_ticket and e.kind in ('ticket_created','urgency_raised')
    and e.created_at>now()-interval '1 hour'
    and exists(select 1 from dm_push_deliveries d where d.event_id=e.id and d.state='pending')
  order by e.created_at,e.id
$$;

revoke all on function public.dm_set_on_way(uuid,bigint,boolean,uuid),public.dm_claim_push_deliveries(uuid,uuid),
  public.dm_queue_urgent_ticket(),public.dm_pending_ticket_push(bigint) from public,anon,authenticated;
grant execute on function public.dm_set_on_way(uuid,bigint,boolean,uuid),public.dm_claim_push_deliveries(uuid,uuid),
  public.dm_queue_urgent_ticket(),public.dm_pending_ticket_push(bigint) to service_role;
commit;
