-- Uitsluitend een geïsoleerde lokale fixture-database; nooit uitvoeren in Supabase.
begin;
do $$ begin
  if current_database()<>'meldpunt_push_test' then raise exception 'Alleen lokale meldpunt_push_test gebruiken'; end if;
end $$;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'TEST FAILED: %',label; end if; end $$;

insert into dm_accounts(id,name,username,username_key,role,active,password_hash,password_salt,password_cipher,password_iv)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Fixture '||n,'fixture'||n,'fixture'||n,
  case when n=6 then 'staff' else 'facility' end,n<>4,'fixture','fixture','fixture','fixture'
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
-- Niet-toegewezen account 5 krijgt niets; account 3 heeft notificaties uit, 4 inactief, 6 staff.
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select count(*)=4 from dm_push_deliveries),'spoed: vier devices bij toegewezen actieve anderen (2,7,8)');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries d join dm_push_subscriptions s on s.id=d.subscription_id where s.account_id in
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000006')),'geen zelfmelding, niet-toegewezen, notificaties uit, inactief of personeel');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select count(*)=4 from dm_push_deliveries),'retry en tweede klik maken geen pushkopieën');
select pg_temp.check_true((select count(*)=1 from dm_ticket_history where ticket_id=1),'audit/historie eenmalig bij overgang');
select pg_temp.check_true((select count(*)=1 from dm_audit_logs where target_id='1'),'audit aanwezig');
update dm_settings set value='{"concierge":{"notifications":true,"viewAssignment":false,"editAssignment":false}}' where key='rolePermissions';
select dm_set_on_way('00000000-0000-4000-8000-000000000002',1,true,'20000000-0000-4000-8000-000000000003');
select pg_temp.check_true((select count(*)=2 from dm_ticket_on_way where ticket_id=1 and active),'meerdere medewerkers onafhankelijk onderweg');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',2,true,'20000000-0000-4000-8000-000000000004');
select pg_temp.check_true((select count(*)=4 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000004'),'hoog verstuurt push, geen colleganaam zonder toewijzingszicht');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',3,true,'20000000-0000-4000-8000-000000000005');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',4,true,'20000000-0000-4000-8000-000000000006');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries where event_id in ('20000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000006')),'normaal/laag alleen registratie, geen push');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,false,'20000000-0000-4000-8000-000000000007');
select pg_temp.check_true(not exists(select 1 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000007'),'intrekken verstuurt geen push');
select pg_temp.check_true((select count(*)=1 from dm_ticket_on_way where ticket_id=1 and active),'andere medewerker blijft onderweg');
select dm_set_on_way('00000000-0000-4000-8000-000000000001',1,true,'20000000-0000-4000-8000-000000000001');
select pg_temp.check_true(not exists(select 1 from dm_ticket_on_way where ticket_id=1 and account_id='00000000-0000-4000-8000-000000000001' and active),'oud verzoek na intrekken heractiveert niet');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001')),'ingetrokken gebeurtenis wordt niet meer verzonden');

-- Intussen niet meer toegewezen ontvanger valt weg vóór claim.
delete from dm_ticket_assignments where ticket_id=2 and account_id='00000000-0000-4000-8000-000000000007';
select pg_temp.check_true((select count(*)=3 from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001')),'ontvangers opnieuw gecontroleerd');
select pg_temp.check_true((select count(*)=0 from dm_claim_push_deliveries('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001')),'claim wordt nooit dubbel uitgegeven');
select dm_test_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000008');
select dm_test_push('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000008');
select pg_temp.check_true((select count(*)=1 from dm_push_deliveries where event_id='20000000-0000-4000-8000-000000000008'),'test alleen eigen device, retry eenmalig');

do $$ begin
  begin perform dm_set_on_way('00000000-0000-4000-8000-000000000005',1,true,gen_random_uuid());raise exception 'TEST FAILED: niet toegewezen actor toegelaten';
  exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
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
end $$;
rollback;
