// Alleen lokale PostgreSQL-fixtures. Nooit naar Supabase of een externe host verbinden.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const env={...process.env};
for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[name];
const docker=process.argv.includes('--docker');
const command=docker?'docker':'psql';
const prefix=docker?['--host=unix:///var/run/docker.sock','exec','-i','meldpunt-push-fixtures','psql']:['-h','127.0.0.1'];
const args=[...prefix,'-U','postgres','-d','meldpunt_push_test','-v','ON_ERROR_STOP=1','-q','-tA'];
// Negeer profielselectie zodat een ontwikkelaars-PGSERVICE nooit productie kan kiezen.
for(const name of Object.keys(env))if(name.startsWith('PG'))delete env[name];
function run(sql){
 const result=cp.spawnSync(command,args,{input:sql,encoding:'utf8',env});
 assert.equal(result.status,0,result.stderr||String(result.error));
 return result.stdout;
}
function runAsync(sql){return new Promise((resolve,reject)=>{
 const child=cp.spawn(command,args,{env});let stderr='';
 child.stderr.on('data',data=>stderr+=data);child.stdout.resume();
 child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(stderr)));
 child.stdin.end(sql);
})}
async function main(){
 run("DO $$ BEGIN IF current_database()<>'meldpunt_push_test' THEN RAISE EXCEPTION 'Verkeerde database'; END IF; END $$;");
 run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF; END $$;");
 run(fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8').split('insert into public.dm_settings(key,value)')[0]);
 const migration=fs.readFileSync(path.join(root,'supabase/UPGRADE-v5.9.0-ONDERWEG-PUSH.sql'),'utf8');
 run(migration);run(migration);
 const broadcast=fs.readFileSync(path.join(root,'supabase/UPGRADE-v5.9.1-HOOG-SPOED-PUSH.sql'),'utf8');
 run(broadcast);run(broadcast);
 const unassigned=fs.readFileSync(path.join(root,'supabase/UPGRADE-v5.9.2-ONDERWEG-ZONDER-TOEWIJZING.sql'),'utf8');
 run(unassigned);run(unassigned);
 const preferences=fs.readFileSync(path.join(root,'supabase/UPGRADE-v5.9.3-PERSOONLIJKE-PUSH.sql'),'utf8');
 run(preferences);run(preferences);
 run(fs.readFileSync(path.join(root,'scripts/push.test.sql'),'utf8'));
 console.log('PostgreSQL: herhaalbare migratie, ontvangers, urgenties, eigen status, rechten, audit en claim-deduplicatie OK');
 // Concurrerende requests op dezelfde melding moeten exact één overgang opleveren.
 run(`INSERT INTO dm_accounts(id,name,username,username_key,role,password_hash,password_salt,password_cipher,password_iv) VALUES
 ('30000000-0000-4000-8000-000000000001','Fixture actor','concurrent1','concurrent1','facility','x','x','x','x'),
 ('30000000-0000-4000-8000-000000000002','Fixture ontvanger','concurrent2','concurrent2','facility','x','x','x','x');
 INSERT INTO dm_tickets(id,ticket_no,reporter,location,category,urgency,title,description) VALUES(9001,'CONCURRENT-TEST','Fixture','Testruimte','Test','spoed','Fixture','Fixture');
 INSERT INTO dm_ticket_assignments(ticket_id,account_id) SELECT 9001,id FROM dm_accounts WHERE username_key='concurrent2';
 SELECT dm_register_push('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','concurrent-hash','https://fcm.googleapis.com/concurrent','fixture','fixture',null);`);
 try{
  const call=id=>`SELECT dm_set_on_way('30000000-0000-4000-8000-000000000001',9001,true,'40000000-0000-4000-8000-00000000000${id}');`;
  await Promise.all([runAsync(`BEGIN;${call(1)}SELECT pg_sleep(0.2);COMMIT;`),runAsync(call(1)),runAsync(call(2))]);
  assert.equal(run("SELECT count(*) FROM dm_push_deliveries d JOIN dm_push_events e ON e.id=d.event_id WHERE e.ticket_id=9001;").trim(),'1');
  assert.equal(run('SELECT count(*) FROM dm_ticket_history WHERE ticket_id=9001;').trim(),'1');
  assert.equal(run("SELECT dm_push_assigned(9001,'30000000-0000-4000-8000-000000000001');").trim(),'f');
  console.log('PostgreSQL: drie concurrerende requests zonder toewijzing => één statusovergang, één historyregel en één push per device');
  run("UPDATE dm_tickets SET urgency='normaal' WHERE id=9001;");
  await Promise.all([runAsync("BEGIN; UPDATE dm_tickets SET urgency='hoog' WHERE id=9001; SELECT pg_sleep(0.2); COMMIT;"),runAsync("UPDATE dm_tickets SET urgency='hoog' WHERE id=9001;")]);
  assert.equal(run("SELECT count(*) FROM dm_push_events WHERE ticket_id=9001 AND kind='urgency_raised';").trim(),'1');
  assert.equal(run("SELECT count(*) FROM dm_push_deliveries d JOIN dm_push_events e ON e.id=d.event_id WHERE e.ticket_id=9001 AND e.kind='urgency_raised';").trim(),'1');
  const claim="SELECT count(*) FROM dm_claim_push_deliveries((SELECT id FROM dm_push_events WHERE ticket_id=9001 AND kind='urgency_raised'),null);";
  await Promise.all([runAsync(claim),runAsync(claim)]);
  assert.equal(run("SELECT count(*) FROM dm_push_deliveries d JOIN dm_push_events e ON e.id=d.event_id WHERE e.ticket_id=9001 AND e.kind='urgency_raised' AND d.state='claimed';").trim(),'1');
  console.log('PostgreSQL: gelijktijdig urgentie verhogen en claimen => één gebeurtenis en één deviceclaim');
 }finally{
  run("DELETE FROM dm_tickets WHERE id=9001; DELETE FROM dm_accounts WHERE username_key IN ('concurrent1','concurrent2');");
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
