-- Uitsluitend een geïsoleerde lokale fixture-database; nooit uitvoeren in Supabase.
begin;
do $$ begin
  if current_database()<>'meldpunt_push_test' then raise exception 'Alleen lokale meldpunt_push_test gebruiken'; end if;
end $$;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'TEST FAILED: %',label; end if; end $$;

insert into dm_accounts(id,name,username,username_key,role,active,password_hash,password_salt,password_cipher,password_iv)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Fixture '||n,'fixture'||n,'fixture'||n,
  case when n=6 then 'staff' when n=8 then 'admin' else 'facility' end,n<>4,'fixture','fixture','fixture','fixture'
from generate_series(1,8) n;
insert into dm_settings(key,value) values
 ('accountRoleOverrides','{"00000000-0000-4000-8000-000000000003":"concierge"}'),
 ('rolePermissions','{"concierge":{"notifications":false}}');
insert into dm_tickets(id,ticket_no,reporter,location,category,urgency,title,description,status)
select n,'TEST-'||n,'Fixture','TEST-ruimte','ICT','spoed','Fixtureticket','Fixtureomschrijving','open' from generate_series(1,4) n;
update dm_tickets set urgency=case id when 2 then 'hoog' when 3 then 'normaal' when 4 then 'laag' end where id>1;
insert into dm_ticket_assignments(ticket_id,account_id)
select t.id,a.id from dm_tickets t cross join dm_accounts a where a.username_key<>'fixture5';
select dm_register_push(id,('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'hash-'||n,
 'https://fcm.googleapis.com/fixture/'||n,'fixture-key','fixture-auth',null)
from (select n,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid id from unnest(array[1,2,5,7,8]) n) q;
-- Inactief/uitgeschakeld/personeelsaccount worden alleen als corrupte oude fixture toegevoegd.
insert into dm_push_subscriptions(account_id,device_id,endpoint_hash,endpoint,p256dh,auth)
select id,gen_random_uuid(),'hash-'||username_key,'https://fcm.googleapis.com/fixture/'||username_key,'fixture','fixture'
from dm_accounts where username_key in ('fixture3','fixture4','fixture6');
select dm_register_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','hash-22','https://fcm.googleapis.com/fixture/22','fixture-key','fixture-auth',null);

-- Herhaald registreren van hetzelfde endpoint maakt geen duplicaat.
select dm_register_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','hash-22','https://fcm.googleapis.com/fixture/22','fixture-key','fixture-auth',null);
select pg_temp.check_true((select count(*)=2 from dm_push_subscriptions where account_id='00000000-0000-4000-8000-000000000002'),'twee apparaten, geen dubbele registratie');
-- Ook niet-toegewezen account 5 en beheerder 8 ontvangen push.
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select count(*)=5 from dm_push_deliveries),'spoed: vijf devices bij alle bevoegde anderen (2,5,7,8)');
select pg_temp.check_true(exists(select 1 from dm_push_deliveries d join dm_push_subscriptions s on s.id=d.subscription_id where s.account_id='00000000-0000-4000-8000-000000000005'),'ontvanger hoeft niet toegewezen te zijn');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries d join dm_push_subscriptions s on s.id=d.subscription_id where s.account_id in
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000006')),'geen zelfmelding, notificaties uit, inactief of gewone melder');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select count(*)=5 from dm_push_deliveries),'retry en tweede klik maken geen pushkopieën');
select pg_temp.check_true((select count(*)=1 from dm_ticket_history where ticket_id=1),'audit/historie eenmalig bij overgang');
select pg_temp.check_true((select count(*)=1 from dm_audit_logs where target_id='1'),'audit aanwezig');
update dm_settings set value='{"concierge":{"notifications":true,"viewAssignment":false,"editAssignment":false}}' where key='rolePermissions';
select dm_set_on_way('00000000-0000-4000-8000-000000000002',1,true,'20000000-0000-4000-8000-000000000003');
select pg_temp.check_true((select count(*)=2 from dm_ticket_on_way where ticket_id=1 and active),'meerdere medewerkers onafhankelijk onderweg');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',2,true,'20000000-0000-4000-8000-000000000004');
select pg_temp.check_true((select count(*)=6 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000004'),'hoog verstuurt naar alle zes bevoegde apparaten');
select pg_temp.check_true((select d.payload->>'body' like 'Een medewerker is onderweg%' from dm_push_deliveries d join dm_push_subscriptions s on s.id=d.subscription_id where d.event_id='20000000-0000-4000-8000-000000000004' and s.account_id='00000000-0000-4000-8000-000000000003'),'conciërge ontvangt generieke tekst zonder verborgen colleganaam');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',3,true,'20000000-0000-4000-8000-000000000005');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',4,true,'20000000-0000-4000-8000-000000000006');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries where event_id in ('20000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000006')),'normaal/laag alleen registratie, geen push');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,false,'20000000-0000-4000-8000-000000000007');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000007'),'intrekken verstuurt geen push');
select pg_temp.check_true((select count(*)=1 from dm_ticket_on_way where ticket_id=1 and active),'andere medewerker blijft onderweg');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select pg_temp.check_true(not exists(select 1 from dm_ticket_on_way where ticket_id=1 and account_id='00000000-0000-4000-8000-000000000001' and active),'oud verzoek na intrekken heractiveert niet');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001')),'ingetrokken gebeurtenis wordt niet meer verzonden');

-- Toewijzing blijft irrelevant; ingetrokken rechten en verborgen namen worden opnieuw gecontroleerd.
delete from dm_ticket_assignments where ticket_id=2 and account_id='00000000-0000-4000-8000-000000000007';
update dm_accounts set active=false where username_key='fixture5';
update dm_settings set value='{"facility":{"viewAssignment":false,"editAssignment":false},"concierge":{"notifications":true,"viewAssignment":false,"editAssignment":false}}' where key='rolePermissions';
create temporary table claimed_fixture as select * from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select count(*)=5 from claimed_fixture),'ontvangersrechten opnieuw gecontroleerd; verwijderde toewijzing blijft ontvangen');
select pg_temp.check_true(exists(select 1 from claimed_fixture c join dm_push_subscriptions s on s.id=c.subscription_id where s.account_id='00000000-0000-4000-8000-000000000007'),'ontvanger blijft na verwijderen toewijzing geldig');
select pg_temp.check_true(not exists(select 1 from claimed_fixture c join dm_push_subscriptions s on s.id=c.subscription_id where s.account_id<>'00000000-0000-4000-8000-000000000008' and c.payload->>'body' not like 'Een medewerker is onderweg%'),'na verlies toewijzingszicht ook eerder gemaakte payload anoniem');
update dm_accounts set active=true where username_key='fixture5';
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001')),'claim wordt nooit dubbel uitgegeven');
select dm_test_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000008');
select dm_test_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000008');
select pg_temp.check_true((select count(*)=1 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000008'),'test alleen eigen device, retry eenmalig');

-- Nieuwe Hoog/Spoed-tickets en echte urgentieverhogingen: zonder toewijzing,
-- ook voor publieke melders, vanuit de daadwerkelijke database-overgang.
insert into dm_tickets(id,reporter,location,category,urgency,title,description)
values(10,'Publieke fixture','Testlocatie','ICT','hoog','Nieuw hoog','Fixture');
select pg_temp.check_true(not exists(select 1 from dm_push_events where ticket_id=10),'wacht op definitief ticketnummer');
update dm_tickets set ticket_no='TEST-10' where id=10;
select pg_temp.check_true((select count(*)=1 from dm_push_events where ticket_id=10 and kind='ticket_created' and actor_id is null),'nieuwe hoogmelding maakt één systeemgebeurtenis');
select pg_temp.check_true((select count(*)=7 from dm_push_deliveries d join dm_push_events e on e.id=d.event_id where e.ticket_id=10),'nieuwe melding naar iedereen met rechten, inclusief eigen medewerker en onverdeelde medewerkers');
select pg_temp.check_true((select count(*)=1 from dm_pending_ticket_push(10)),'backend vindt wachtende ticketpush');
update dm_tickets set ticket_no='TEST-10',urgency='hoog',title='Gewijzigde tekst' where id=10;
select pg_temp.check_true((select count(*)=1 from dm_push_events where ticket_id=10),'ongewijzigde urgentie en opslaan geven geen dubbele push');
update dm_tickets set urgency='spoed' where id=10;
select pg_temp.check_true((select count(*)=1 from dm_push_events where ticket_id=10 and kind='urgency_raised'),'hoog naar spoed geeft nieuwe push');
update dm_tickets set urgency='hoog' where id=10;
select pg_temp.check_true((select count(*)=2 from dm_push_events where ticket_id=10),'verlaging geeft geen push');
update dm_tickets set urgency='normaal' where id=10;
update dm_tickets set urgency='hoog' where id=10;
select pg_temp.check_true((select count(*)=2 from dm_push_events where ticket_id=10 and kind='urgency_raised'),'normaal naar hoog geeft nieuwe push');
update dm_tickets set status='done',urgency='spoed' where id=10;
select pg_temp.check_true((select count(*)=3 from dm_push_events where ticket_id=10),'afgeronde melding geeft geen push');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries((select id from dm_push_events where ticket_id=10 and kind='ticket_created'),null)),'afgeronde ticketpush wordt niet verzonden');
insert into dm_tickets(id,ticket_no,reporter,location,category,urgency,title,description)
values(11,'TEST-11','Fixture','Testlocatie','ICT','spoed','Direct spoed','Fixture'),
 (12,'TEST-12','Fixture','Testlocatie','ICT','normaal','Normaal','Fixture'),
 (13,'TEST-13','Fixture','Testlocatie','ICT','laag','Laag','Fixture');
select pg_temp.check_true((select count(*)=1 from dm_push_events where ticket_id in (11,12,13)),'nieuwe spoed wel; nieuw normaal/laag geen push');
update dm_tickets set urgency='spoed' where id=12;
update dm_tickets set urgency='hoog' where id=13;
select pg_temp.check_true((select count(*)=2 from dm_push_events where ticket_id in (12,13) and kind='urgency_raised'),'normaal naar spoed en laag naar hoog versturen push');
update dm_push_subscriptions set expiration_time=now()-interval '1 second' where account_id='00000000-0000-4000-8000-000000000007';
update dm_settings set value='{"facility":{"notifications":false},"concierge":{"notifications":true}}' where key='rolePermissions';
select pg_temp.check_true((select count(*)=2 from dm_claim_push_deliveries((select id from dm_push_events where ticket_id=11),null)),'ticketpush hercontroleert verlopen apparaten en notificatierechten: alleen conciërge en admin');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries((select id from dm_push_events where ticket_id=11),null)),'ticketpush niet dubbel verzonden');
update dm_settings set value='{"facility":{"viewAllTickets":false},"concierge":{"notifications":true}}' where key='rolePermissions';
select pg_temp.check_true((select count(*)=2 from dm_claim_push_deliveries((select id from dm_push_events where ticket_id=12),null)),'geen push zonder ticketzicht, ook als notificaties aan staan');
update dm_settings set value='{}' where key='rolePermissions';
select pg_temp.check_true(not has_function_privilege('anon','dm_pending_ticket_push(bigint)','EXECUTE'),'geen publieke toegang tot ticketpushqueue');
select pg_temp.check_true(not has_function_privilege('authenticated','dm_claim_push_deliveries(uuid,uuid)','EXECUTE'),'browser kan systeemgebeurtenissen niet claimen');

-- Niet-toegewezen medewerker mag zelf onderweg gaan, zonder overname/toewijzing.
create temporary table assignments_before as select * from dm_ticket_assignments;
select dm_set_on_way('00000000-0000-4000-8000-000000000005',1,true,'50000000-0000-4000-8000-000000000001');
select pg_temp.check_true(exists(select 1 from dm_ticket_on_way where ticket_id=1 and account_id='00000000-0000-4000-8000-000000000005' and active),'niet-toegewezen actor opgeslagen');
select pg_temp.check_true(not dm_push_assigned(1,'00000000-0000-4000-8000-000000000005'),'onderweg wordt geen automatische toewijzing');
select pg_temp.check_true((select count(*)=5 from dm_claim_push_deliveries('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005')),'Hoog/Spoed-push wordt ook voor niet-toegewezen actor daadwerkelijk geclaimd');
select dm_set_on_way('00000000-0000-4000-8000-000000000005',1,true,'50000000-0000-4000-8000-000000000001');
select dm_set_on_way('00000000-0000-4000-8000-000000000005',1,true,'50000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select count(*)=1 from dm_ticket_history where ticket_id=1 and actor_id='00000000-0000-4000-8000-000000000005'),'ook zonder toewijzing geen dubbele historie');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005')),'ook zonder toewijzing geen dubbele verzending');
select dm_set_on_way('00000000-0000-4000-8000-000000000005',1,false,'50000000-0000-4000-8000-000000000003');
select pg_temp.check_true(not exists(select 1 from dm_ticket_on_way where ticket_id=1 and account_id='00000000-0000-4000-8000-000000000005' and active),'eigen status zonder toewijzing intrekken');
select pg_temp.check_true(exists(select 1 from dm_ticket_on_way where ticket_id=1 and account_id='00000000-0000-4000-8000-000000000002' and active),'status van andere medewerker blijft staan');
select pg_temp.check_true(not exists((select * from dm_ticket_assignments except select * from assignments_before) union all (select * from assignments_before except select * from dm_ticket_assignments)),'alle toewijzingen exact behouden');
insert into dm_tickets(id,ticket_no,reporter,location,category,urgency,title,description)
values(14,'TEST-14','Fixture','Testlocatie','ICT','normaal','Zonder toewijzingen','Fixture');
select dm_set_on_way('00000000-0000-4000-8000-000000000005',14,true,'50000000-0000-4000-8000-000000000004');
select pg_temp.check_true(exists(select 1 from dm_ticket_on_way where ticket_id=14 and account_id='00000000-0000-4000-8000-000000000005' and active),'ook bij volledig niet-toegewezen normale melding onderweg');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries where event_id='50000000-0000-4000-8000-000000000004'),'normale melding blijft zonder push');
select pg_temp.check_true(not exists(select 1 from dm_ticket_assignments where ticket_id=14) and (select assignee is null and status='open' from dm_tickets where id=14),'onverdeeld ticket en ticketstatus behouden');

do $$ begin
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000004',1,true,gen_random_uuid());raise exception 'TEST FAILED: inactief toegelaten';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000006',1,true,gen_random_uuid());raise exception 'TEST FAILED: staff toegelaten';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000002',2,true,'20000000-0000-4000-8000-000000000004');raise exception 'TEST FAILED: verzoek van ander hergebruikt';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  begin perform dm_test_push('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000022',gen_random_uuid());raise exception 'TEST FAILED: test op andermans device';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  begin perform dm_test_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022',gen_random_uuid());raise exception 'TEST FAILED: test zonder cooldown';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
update dm_tickets set status='done' where id=4;
do $$ begin
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000001',4,true,gen_random_uuid());raise exception 'TEST FAILED: afgerond toegelaten';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
select pg_temp.check_true(not has_table_privilege('anon','dm_push_subscriptions','SELECT'),'geen endpointlekkage via anon');
select pg_temp.check_true(not has_table_privilege('authenticated','dm_ticket_on_way','INSERT'),'geen browserwrites');
select pg_temp.check_true(not has_function_privilege('anon','dm_set_on_way(uuid,bigint,boolean,uuid)','EXECUTE'),'geen publieke RPC');
select pg_temp.check_true(has_function_privilege('service_role','dm_set_on_way(uuid,bigint,boolean,uuid)','EXECUTE'),'alleen backend kan RPC gebruiken');
update dm_settings set value='{"facility":{"editStatus":false}}' where key='rolePermissions';
do $$ begin
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,gen_random_uuid());raise exception 'TEST FAILED: afhandelrecht ontbreekt';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000005',1,true,gen_random_uuid());raise exception 'TEST FAILED: niet-toegewezen actor zonder afhandelrecht';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
rollback;
