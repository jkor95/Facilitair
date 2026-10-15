const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const {webcrypto,createECDH,randomBytes}=require('node:crypto');
const ACTOR='00000000-0000-4000-8000-000000000001',DEVICE='10000000-0000-4000-8000-000000000001',EVENT='20000000-0000-4000-8000-000000000001';
function subscription(){const ecdh=createECDH('prime256v1');ecdh.generateKeys();return {endpoint:'https://fcm.googleapis.com/fixture',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}}}
function server(options={}){
 const records=[],sent=[];
 const actor={id:ACTOR,role:options.role||'facility',name:'Fixture',active:true};
 const sub=subscription();
 let handler,claimed=false;
 const queue=options.queue||[{subscription_id:DEVICE,endpoint:sub.endpoint,...sub.keys,subscription_version:'2026-10-15T10:00:00Z',payload:{eventId:EVENT,title:'Fixture',body:'Fixture'}}];
 function query(table){
  const q={table,kind:'select',filters:[],values:null};
  for(const method of ['select','order','in','limit','eq','neq','lt','upsert','insert','delete','update','maybeSingle','single'])q[method]=(...args)=>{
   if(['insert','delete','update','upsert'].includes(method)){q.kind=method;q.values=args[0]}
   if(['eq','neq','lt','in'].includes(method))q.filters.push([method,...args]);
   if(['maybeSingle','single'].includes(method))q.one=true;
   return q;
  };
  q.then=(resolve,reject)=>{
   records.push({table:q.table,kind:q.kind,filters:q.filters,values:q.values});
   let data=[];
   if(table==='dm_sessions')data={account_id:ACTOR,expires_at:options.expired?'2000-01-01':new Date(Date.now()+86400000).toISOString()};
   if(table==='dm_accounts')data=q.one?actor:[actor];
   if(table==='dm_settings')data=options.settings||[];
   if(table==='dm_ticket_on_way')data=options.onWay||[];
   if(table==='dm_ticket_assignments')data=options.assignments||[];
   if(table==='dm_tickets')data=options.tickets||[];
   return Promise.resolve({data,error:null}).then(resolve,reject);
  };
  return q;
 }
 const db={from:query,rpc:async(name,args)=>{
  records.push({rpc:name,args});
  if(name==='dm_claim_push_deliveries'){if(claimed)return {data:[],error:null};claimed=true;return {data:queue,error:null}}
  return {data:{changed:true},error:null};
 }};
 const env={SUPABASE_URL:'https://xmmrplvhkfvyfqwjrugl.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture',DALTON_MASTER_KEY:'fixture',
  ...(options.configured===false?{}:{DM_WEB_PUSH_ENABLED:'true',DM_VAPID_PUBLIC_KEY:'fixture-public',DM_VAPID_PRIVATE_KEY:'fixture-private',DM_VAPID_SUBJECT:'mailto:fixture@example.invalid'})};
 const context=vm.createContext({Deno:{env:{get:name=>env[name]},serve:value=>handler=value},
  fixtures:{createClient:()=>db,webpush:{sendNotification:async(...args)=>{sent.push(args);if(options.sendError)throw Object.assign(new Error('Provider secret body must not escape'),{statusCode:options.sendError})}}},
  crypto:webcrypto,TextEncoder,TextDecoder,URL,Request,Response,atob,btoa,console:{error:()=>{throw new Error('Onverwacht backendlog')}},Uint8Array});
 let source=fs.readFileSync(path.join(__dirname,'../supabase/functions/dalton-api/index.ts'),'utf8');
 source=source.replace(/^import .*\n/gm,'');
 source="const {createClient,webpush}=fixtures;\n"+source+'\nglobalThis.apiTests={pushSubscription,pushUuid,deliverPushEvent};';
 vm.runInContext(stripTypeScriptTypes(source),context);
 const call=async(action,payload={},authenticated=true)=>{
  const response=await handler(new Request('https://example.invalid',{method:'POST',headers:authenticated?{Authorization:'Bearer fixture-token'}:{},body:JSON.stringify({action,payload})}));
  return {status:response.status,body:await response.json()};
 };
 return {...context.apiTests,records,sent,call,sub};
}

test('Pushsubscripties staan alleen bekende HTTPS-pushdiensten met geldige sleutels toe',()=>{
 const api=server(),sub=api.sub;
 for(const endpoint of ['https://fcm.googleapis.com/fixture','https://web.push.apple.com/fixture','https://updates.push.services.mozilla.com/fixture','https://wns2-fixture.notify.windows.com/w/?token=fixture'])assert.equal(api.pushSubscription({...sub,endpoint}).endpoint,endpoint);
 for(const endpoint of ['http://fcm.googleapis.com/fixture','https://127.0.0.1/','https://fcm.googleapis.com.attacker.invalid/','https://user:pass@fcm.googleapis.com/','https://fcm.googleapis.com:8443/','https://example.invalid/'])assert.throws(()=>api.pushSubscription({...sub,endpoint}));
 assert.throws(()=>api.pushSubscription({...sub,keys:{p256dh:'bad',auth:'bad'}}));
 assert.throws(()=>api.pushSubscription({...sub,expirationTime:1}));
 assert.throws(()=>api.pushUuid('onveilig'));
 assert.equal(api.pushUuid(EVENT),EVENT);
});

test('Geen authenticatie of verlopen sessie geeft geen toegang tot push en onderweg',async()=>{
 const api=server();
 for(const action of ['push_register','push_unregister','push_test','on_way_state','set_on_way'])assert.equal((await api.call(action,{},false)).status,401);
 assert.equal((await server({expired:true}).call('push_config')).status,401);
 assert.equal(api.records.length,0);
});

test('Publieke health en eigen pushconfig lekken geen private sleutels',async()=>{
 const api=server();
 const health=await api.call('health',{},false);
 assert.equal(health.body.features.onWay,1);
 const config=await api.call('push_config');
 assert.equal(config.body.publicKey,'fixture-public');
 assert(!JSON.stringify(config).includes('fixture-private'));
 assert.equal((await server({configured:false}).call('push_register',{deviceId:DEVICE})).status,503);
});

test('Registratie en tests gebruiken uitsluitend het geauthenticeerde account en eigen apparaat',async()=>{
 const api=server();
 assert.equal((await api.call('push_register',{deviceId:DEVICE,subscription:api.sub,accountId:'aanvaller'})).status,200);
 const registration=api.records.find(r=>r.rpc==='dm_register_push');
 assert.equal(registration.args.p_actor,ACTOR);
 assert.equal(registration.args.p_device,DEVICE);
 assert.equal((await api.call('push_test',{deviceId:DEVICE,requestId:EVENT,accountId:'aanvaller',recipients:['aanvaller']})).status,200);
 const event=api.records.find(r=>r.rpc==='dm_test_push');
 assert.deepEqual(JSON.parse(JSON.stringify(event.args)),{p_actor:ACTOR,p_device:DEVICE,p_request:EVENT});
});

test('Onderwegacties vertrouwen geen browserurgentie of ontvangers; intrekken verzendt niet',async()=>{
 const api=server();
 assert.equal((await api.call('set_on_way',{dbId:1,active:false,requestId:EVENT,urgency:'spoed',recipients:['aanvaller']})).status,200);
 const call=api.records.find(r=>r.rpc==='dm_set_on_way');
 assert.deepEqual(JSON.parse(JSON.stringify(call.args)),{p_actor:ACTOR,p_ticket:1,p_active:false,p_request:EVENT});
 assert.equal(api.sent.length,0);
 assert.equal((await api.call('set_on_way',{dbId:'ongeldig',active:true,requestId:EVENT})).status,400);
});

test('Bestaande rollen en notificatierechten begrenzen pushinstellingen',async()=>{
 assert.equal((await server({role:'staff'}).call('push_config')).status,403);
 const api=server({settings:[{key:'rolePermissions',value:{facility:{notifications:false}}}]});
 assert.equal((await api.call('push_config')).status,403);
 assert.deepEqual((await server({role:'staff'}).call('on_way_state')).body.rows,[]);
 assert.equal((await server({role:'staff'}).call('set_on_way',{dbId:1,active:true,requestId:EVENT})).status,403);
});

test('Verborgen toewijzingen lekken geen namen van onderweg-collega’s',async()=>{
 const other='00000000-0000-4000-8000-000000000002';
 const api=server({settings:[{key:'rolePermissions',value:{facility:{viewAssignment:false,editAssignment:false}}}],
  onWay:[ACTOR,other].map(id=>({ticket_id:1,account_id:id,since:'2026-10-15T10:00:00Z',dm_accounts:{name:id===ACTOR?'Eigen fixture':'Verborgen naam',active:true}})),
  assignments:[ACTOR,other].map(account_id=>({ticket_id:1,account_id})),tickets:[{id:1}]});
 const result=await api.call('on_way_state');
 assert.equal(result.body.rows.length,1);
 assert.equal(result.body.rows[0].accountId,ACTOR);
 assert(!JSON.stringify(result.body).includes('Verborgen naam'));
});

test('Pushdispatcher claimt eenmaal, verzendt echte payloadstructuur en bevestigt resultaat',async()=>{
 const api=server();
 assert.equal((await api.deliverPushEvent(EVENT,ACTOR)).sent,1);
 assert.equal((await api.deliverPushEvent(EVENT,ACTOR)).sent,0);
 assert.equal(api.sent.length,1);
 const [sub,payload,options]=api.sent[0];
 assert.equal(sub.endpoint,api.sub.endpoint);
 assert.equal(JSON.parse(payload).eventId,EVENT);
 assert.equal(options.TTL,3600);
 assert.equal(options.vapidDetails.privateKey,'fixture-private');
 assert(api.records.some(r=>r.table==='dm_push_deliveries'&&r.values?.state==='sent'));
});

test('Alleen verlopen/404/410-registraties worden opgeruimd, geen onzekere retry',async()=>{
 for(const status of [404,410,500]){
  const api=server({sendError:status});
  assert.equal((await api.deliverPushEvent(EVENT,ACTOR)).failed,1);
  const removed=api.records.filter(r=>r.table==='dm_push_subscriptions'&&r.kind==='delete'&&r.filters.some(f=>f[1]==='id'));
  assert.equal(removed.length,status===500?0:1);
  assert.equal((await api.deliverPushEvent(EVENT,ACTOR)).sent,0);
  assert.equal(api.sent.length,1);
 }
 const unconfigured=server({configured:false});
 assert.equal((await unconfigured.deliverPushEvent(EVENT,ACTOR)).configured,false);
 assert(!unconfigured.records.some(r=>r.rpc==='dm_claim_push_deliveries'));
});
