const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const SESSION_DAYS = 30;
const INVITE_HOURS = 24;

const enc = new TextEncoder();

function now() { return new Date().toISOString(); }
function uid(prefix='id') { return `${prefix}-${crypto.randomUUID()}`; }
function b64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function unb64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function safeText(v, max=4000) { return String(v ?? '').trim().slice(0, max); }
function escapeHtml(s='') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toBool(v) { return v === true || v === 1 || v === '1'; }
function addHours(h) { return new Date(Date.now() + h * 3600_000).toISOString(); }
function addDays(d) { return new Date(Date.now() + d * 86400_000).toISOString(); }

function response(data, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}
function error(message, status=400, code='bad_request') { return response({ ok:false, error:message, code }, status); }

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = safeText(env.ALLOWED_ORIGIN || '', 500);
  const originAllowed = !origin || !allowed || origin === allowed || (allowed.endsWith('/') && origin === allowed.slice(0,-1));
  return {
    'Access-Control-Allow-Origin': originAllowed && origin ? origin : (allowed || '*'),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

async function sha256(input) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}
async function deriveAesKey(secret) {
  if (!secret || secret.length < 16) throw new Error('PASSWORD_KEY ontbreekt of is te kort.');
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
}
async function encryptPassword(password, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(secret);
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(password));
  return { cipher:b64(cipher), iv:b64(iv) };
}
async function decryptPassword(cipher, iv, secret) {
  const key = await deriveAesKey(secret);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(iv)}, key, unb64(cipher));
  return new TextDecoder().decode(plain);
}
async function hashPassword(password, saltB64=null) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations:150000 }, material, 256);
  return { hash:b64(bits), salt:b64(salt) };
}
function constantEqual(a,b) {
  if (!a || !b || a.length !== b.length) return false;
  let x=0; for (let i=0;i<a.length;i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x===0;
}
async function setAccountPassword(env, accountId, password, mustChange=0) {
  const clean = String(password ?? '');
  if (!clean.length) throw new Error('Wachtwoord mag niet leeg zijn.');
  const {hash,salt} = await hashPassword(clean);
  const {cipher,iv} = await encryptPassword(clean, env.PASSWORD_KEY);
  await env.DB.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,password_cipher=?,password_iv=?,must_change=?,updated_at=? WHERE id=?`)
    .bind(hash,salt,cipher,iv,mustChange?1:0,now(),accountId).run();
}

async function ensureAdmin(env) {
  const existing = await env.DB.prepare(`SELECT id FROM accounts WHERE username = ? COLLATE NOCASE LIMIT 1`).bind('Admin').first();
  if (existing) return;
  const anyAdmin = await env.DB.prepare(`SELECT id FROM accounts WHERE role='admin' LIMIT 1`).first();
  if (anyAdmin) return;
  const id = uid('u');
  const t = now();
  await env.DB.prepare(`INSERT INTO accounts(id,name,username,email,role,active,must_change,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .bind(id,'Hoofdbeheerder','Admin','','admin',1,0,t,t).run();
  await setAccountPassword(env,id,'Admin',0);
  await writeAudit(env,{actorId:id,actorName:'Hoofdbeheerder',type:'account',targetId:id,action:'Eerste hoofdbeheeraccount aangemaakt (Admin).'});
}

async function writeAudit(env,{actorId=null,actorName='Systeem',type='system',targetId='',action=''}) {
  await env.DB.prepare(`INSERT INTO audit_log(id,at,actor_id,actor_name,type,target_id,action) VALUES(?,?,?,?,?,?,?)`)
    .bind(uid('log'),now(),actorId,actorName,type,targetId,action).run();
}
async function writeHistory(env,ticketId,actor,action) {
  const t=now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO ticket_history(id,ticket_id,at,actor_id,actor_name,action) VALUES(?,?,?,?,?,?)`)
      .bind(uid('hist'),ticketId,t,actor?.id||null,actor?.name||'Systeem',action),
    env.DB.prepare(`UPDATE tickets SET updated_at=? WHERE id=?`).bind(t,ticketId),
    env.DB.prepare(`INSERT INTO audit_log(id,at,actor_id,actor_name,type,target_id,action) VALUES(?,?,?,?,?,?,?)`)
      .bind(uid('log'),t,actor?.id||null,actor?.name||'Systeem','ticket',ticketId,action)
  ]);
}
async function notify(env, accountId, ticketId, title, body) {
  if (!accountId) return;
  await env.DB.prepare(`INSERT INTO notifications(id,account_id,ticket_id,title,body,created_at) VALUES(?,?,?,?,?,?)`)
    .bind(uid('ntf'),accountId,ticketId||null,safeText(title,160),safeText(body,500),now()).run();
}

async function sendEmail(env,{to,subject,html}) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !to) return {sent:false,reason:'email_not_configured'};
  const r = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${env.RESEND_API_KEY}`},
    body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject,html})
  });
  if (!r.ok) return {sent:false,reason:`email_http_${r.status}`,detail:await r.text()};
  return {sent:true,data:await r.json()};
}

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
async function sessionAccount(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1`).bind(tokenHash,now()).first();
  return row || null;
}
function publicAccount(a) {
  if (!a) return null;
  return {id:a.id,name:a.name,username:a.username,email:a.email||'',role:a.role,active:!!a.active,mustChange:!!a.must_change,createdAt:a.created_at,updatedAt:a.updated_at};
}
async function requireRole(request, env, roles) {
  const a = await sessionAccount(request,env);
  if (!a) return {err:error('Niet ingelogd.',401,'unauthorized')};
  if (!roles.includes(a.role)) return {err:error('Geen toegang.',403,'forbidden')};
  return {account:a};
}

async function nextTicketId(env) {
  const year = new Date().getFullYear();
  for (let i=0;i<10;i++) {
    const n = Math.floor(1000 + Math.random()*9000);
    const id = `M-${year}-${n}`;
    const exists = await env.DB.prepare(`SELECT id FROM tickets WHERE id=?`).bind(id).first();
    if (!exists) return id;
  }
  return `M-${year}-${Date.now().toString().slice(-6)}`;
}

async function ticketRow(env,id) {
  return env.DB.prepare(`SELECT t.*, a.name AS assignee_name, a.username AS assignee_username FROM tickets t LEFT JOIN accounts a ON a.id=t.assignee_id WHERE t.id=?`).bind(id).first();
}
function mapTicket(t, includePhoto=true) {
  if (!t) return null;
  return {
    id:t.id,createdAt:t.created_at,updatedAt:t.updated_at,reporter:t.reporter,reporterEmail:t.reporter_email||'',location:t.location,
    category:t.category,urgency:t.urgency,title:t.title,description:t.description,canContinue:t.can_continue,photo:includePhoto?t.photo_data:null,
    status:t.status,assignee:t.assignee_id||'',assigneeName:t.assignee_name||'',assigneeUsername:t.assignee_username||'',internalNote:t.internal_note||'',
    mailReporterOnComplete:!!t.mail_reporter_on_complete,completionMailSentAt:t.completion_mail_sent_at||null
  };
}

async function handlePublicCreate(request, env) {
  const b = await readJson(request); if (!b) return error('Ongeldige invoer.');
  const reporter=safeText(b.reporter,120), location=safeText(b.location,180), category=safeText(b.category,120), urgency=safeText(b.urgency,20), title=safeText(b.title,180), description=safeText(b.description,4000);
  if (!reporter || !location || !category || !title || !description) return error('Vul alle verplichte velden in.');
  if (!['laag','normaal','hoog','spoed'].includes(urgency)) return error('Ongeldige urgentie.');
  const photo = b.photo ? String(b.photo) : null;
  if (photo && photo.length > 900000) return error('Foto is te groot. Kies een kleinere foto.',413,'photo_too_large');
  const route = await env.DB.prepare(`SELECT account_id FROM routing WHERE category=?`).bind(category).first();
  let assignee = route?.account_id || null;
  if (assignee) {
    const active = await env.DB.prepare(`SELECT id FROM accounts WHERE id=? AND role='facility' AND active=1`).bind(assignee).first();
    if (!active) assignee=null;
  }
  const id=await nextTicketId(env), t=now();
  await env.DB.prepare(`INSERT INTO tickets(id,created_at,updated_at,reporter,reporter_email,location,category,urgency,title,description,can_continue,photo_data,status,assignee_id,internal_note,mail_reporter_on_complete) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,t,t,reporter,safeText(b.reporterEmail,180),location,category,urgency,title,description,safeText(b.canContinue,10)||'ja',photo,'open',assignee,'',toBool(b.mailReporterOnComplete)?1:0).run();
  await writeHistory(env,id,null,'Melding aangemaakt door personeel.');
  if (assignee) {
    await notify(env,assignee,id,'Nieuwe melding aan jou toegewezen',`${id} - ${title}`);
  } else {
    const facs=(await env.DB.prepare(`SELECT id FROM accounts WHERE role='facility' AND active=1`).all()).results||[];
    for(const f of facs) await notify(env,f.id,id,'Nieuwe niet-toegewezen melding',`${id} - ${title}`);
  }
  const admins=(await env.DB.prepare(`SELECT id FROM accounts WHERE role='admin' AND active=1`).all()).results||[];
  for(const ad of admins) await notify(env,ad.id,id,'Nieuwe facilitaire melding',`${id} - ${title}`);
  if (env.CONCIERGE_EMAIL) {
    await sendEmail(env,{to:env.CONCIERGE_EMAIL,subject:`Nieuwe facilitaire melding ${id}: ${title}`,html:`<h2>Nieuwe melding ${escapeHtml(id)}</h2><p><b>Melder:</b> ${escapeHtml(reporter)}<br><b>Locatie:</b> ${escapeHtml(location)}<br><b>Categorie:</b> ${escapeHtml(category)}<br><b>Urgentie:</b> ${escapeHtml(urgency)}</p><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(env.APP_URL||'')}">Open Dalton Meldpunt</a></p>`});
  }
  return response({ok:true,id,assignee});
}

async function handleLogin(request,env) {
  await ensureAdmin(env);
  const b=await readJson(request); if(!b) return error('Ongeldige invoer.');
  const username=safeText(b.username,80), password=String(b.password??'');
  const a=await env.DB.prepare(`SELECT * FROM accounts WHERE username=? COLLATE NOCASE LIMIT 1`).bind(username).first();
  if(!a || !a.active || !a.password_hash) return error('Onjuiste gebruikersnaam of wachtwoord.',401,'invalid_login');
  const hp=await hashPassword(password,a.password_salt);
  if(!constantEqual(hp.hash,a.password_hash)) return error('Onjuiste gebruikersnaam of wachtwoord.',401,'invalid_login');
  const token=b64(crypto.getRandomValues(new Uint8Array(32))); const th=await sha256(token); const t=now();
  await env.DB.prepare(`INSERT INTO sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)`).bind(th,a.id,addDays(SESSION_DAYS),t).run();
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'session',targetId:a.id,action:'Ingelogd.'});
  return response({ok:true,token,account:publicAccount(a)});
}

async function handleLogout(request,env,a) {
  const token=(request.headers.get('Authorization')||'').slice(7).trim();
  if(token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(await sha256(token)).run();
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'session',targetId:a.id,action:'Uitgelogd.'});
  return response({ok:true});
}

async function listTickets(request,env,a) {
  const url=new URL(request.url); const q=safeText(url.searchParams.get('q'),120).toLowerCase();
  let rows=(await env.DB.prepare(`SELECT t.*, ac.name AS assignee_name, ac.username AS assignee_username FROM tickets t LEFT JOIN accounts ac ON ac.id=t.assignee_id ORDER BY t.created_at DESC LIMIT 500`).all()).results||[];
  if(a.role==='facility' && url.searchParams.get('mine')==='1') rows=rows.filter(x=>x.assignee_id===a.id);
  if(q) rows=rows.filter(x=>`${x.id} ${x.reporter} ${x.location} ${x.title} ${x.category}`.toLowerCase().includes(q));
  return response({ok:true,tickets:rows.map(x=>mapTicket(x,false))});
}
async function getTicket(env,a,id) {
  const t=await ticketRow(env,id); if(!t)return error('Melding niet gevonden.',404,'not_found');
  let history=[];
  if(a.role==='admin') history=(await env.DB.prepare(`SELECT * FROM ticket_history WHERE ticket_id=? ORDER BY at DESC`).bind(id).all()).results||[];
  return response({ok:true,ticket:mapTicket(t,true),history:history.map(h=>({at:h.at,actor:h.actor_name,action:h.action}))});
}

async function patchTicket(request,env,a,id) {
  const old=await ticketRow(env,id); if(!old)return error('Melding niet gevonden.',404,'not_found');
  const b=await readJson(request); if(!b)return error('Ongeldige invoer.');
  const allowedStatus=['open','progress','wait','done']; const allowedUrg=['laag','normaal','hoog','spoed'];
  const next={
    status:allowedStatus.includes(b.status)?b.status:old.status,
    assignee_id:b.assignee===null||b.assignee===''?null:(b.assignee!==undefined?safeText(b.assignee,100):old.assignee_id),
    internal_note:b.internalNote!==undefined?safeText(b.internalNote,4000):old.internal_note,
    mail_reporter_on_complete:b.mailReporterOnComplete!==undefined?(toBool(b.mailReporterOnComplete)?1:0):old.mail_reporter_on_complete,
    reporter:a.role==='admin'&&b.reporter!==undefined?safeText(b.reporter,120):old.reporter,
    reporter_email:a.role==='admin'&&b.reporterEmail!==undefined?safeText(b.reporterEmail,180):old.reporter_email,
    location:a.role==='admin'&&b.location!==undefined?safeText(b.location,180):old.location,
    category:a.role==='admin'&&b.category!==undefined?safeText(b.category,120):old.category,
    urgency:a.role==='admin'&&allowedUrg.includes(b.urgency)?b.urgency:old.urgency,
    title:a.role==='admin'&&b.title!==undefined?safeText(b.title,180):old.title,
    description:a.role==='admin'&&b.description!==undefined?safeText(b.description,4000):old.description,
    can_continue:a.role==='admin'&&b.canContinue!==undefined?safeText(b.canContinue,10):old.can_continue
  };
  if(next.assignee_id){const fa=await env.DB.prepare(`SELECT id FROM accounts WHERE id=? AND role='facility' AND active=1`).bind(next.assignee_id).first();if(!fa)return error('Gekozen medewerker bestaat niet of is niet actief.');}
  const changes=[];
  const labels={status:'status',assignee_id:'toewijzing',internal_note:'interne notitie',mail_reporter_on_complete:'afrondingsmail',reporter:'melder',reporter_email:'e-mail melder',location:'locatie',category:'categorie',urgency:'urgentie',title:'titel',description:'omschrijving',can_continue:'onderwijs kan doorgaan'};
  for(const k of Object.keys(next)) if(String(next[k]??'')!==String(old[k]??'')) changes.push(labels[k]);
  await env.DB.prepare(`UPDATE tickets SET status=?,assignee_id=?,internal_note=?,mail_reporter_on_complete=?,reporter=?,reporter_email=?,location=?,category=?,urgency=?,title=?,description=?,can_continue=?,updated_at=? WHERE id=?`)
    .bind(next.status,next.assignee_id,next.internal_note,next.mail_reporter_on_complete,next.reporter,next.reporter_email,next.location,next.category,next.urgency,next.title,next.description,next.can_continue,now(),id).run();
  const silent = a.role==='admin' && b.silent!==false;
  if(changes.length) await writeHistory(env,id,a,`Gewijzigd: ${changes.join(', ')}.`);
  if(!silent && next.assignee_id && next.assignee_id!==old.assignee_id) await notify(env,next.assignee_id,id,'Melding aan jou toegewezen',`${id} - ${next.title}`);
  let completionMail={sent:false};
  if(old.status!=='done' && next.status==='done' && next.mail_reporter_on_complete && next.reporter_email){
    completionMail=await sendEmail(env,{to:next.reporter_email,subject:`Melding ${id} is afgerond`,html:`<p>Beste ${escapeHtml(next.reporter)},</p><p>Je facilitaire melding <b>${escapeHtml(id)} - ${escapeHtml(next.title)}</b> is afgerond.</p><p>Locatie: ${escapeHtml(next.location)}</p><p>Met vriendelijke groet,<br>Facilitair</p>`});
    if(completionMail.sent) await env.DB.prepare(`UPDATE tickets SET completion_mail_sent_at=? WHERE id=?`).bind(now(),id).run();
  }
  return response({ok:true,ticket:mapTicket(await ticketRow(env,id),true),completionMail});
}

async function listAccounts(env) {
  const rows=(await env.DB.prepare(`SELECT * FROM accounts ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,name`).all()).results||[];
  return response({ok:true,accounts:rows.map(publicAccount)});
}
async function createAccount(request,env,a) {
  const b=await readJson(request);if(!b)return error('Ongeldige invoer.');
  const name=safeText(b.name,120), username=safeText(b.username,80), emailAddr=safeText(b.email,180), role=b.role==='admin'?'admin':'facility';
  if(!name||!username)return error('Naam en inlognaam zijn verplicht.');
  const id=uid('u'),t=now();
  try{await env.DB.prepare(`INSERT INTO accounts(id,name,username,email,role,active,must_change,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,name,username,emailAddr,role,b.active===false?0:1,1,t,t).run();}catch{return error('Deze inlognaam bestaat al.',409,'username_exists');}
  if(b.password!==undefined && String(b.password).length) await setAccountPassword(env,id,String(b.password),0);
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:id,action:`Account aangemaakt voor ${name} (${username}), rol ${role}.`});
  return response({ok:true,account:publicAccount(await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first())});
}
async function patchAccount(request,env,a,id) {
  const old=await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first();if(!old)return error('Account niet gevonden.',404);
  const b=await readJson(request);if(!b)return error('Ongeldige invoer.');
  const name=b.name!==undefined?safeText(b.name,120):old.name, username=b.username!==undefined?safeText(b.username,80):old.username, emailAddr=b.email!==undefined?safeText(b.email,180):old.email, role=b.role==='admin'?'admin':(b.role==='facility'?'facility':old.role), active=b.active!==undefined?(toBool(b.active)?1:0):old.active;
  if(!name||!username)return error('Naam en inlognaam zijn verplicht.');
  if(id===a.id && active===0)return error('Je kunt je eigen account niet blokkeren.');
  try{await env.DB.prepare(`UPDATE accounts SET name=?,username=?,email=?,role=?,active=?,updated_at=? WHERE id=?`).bind(name,username,emailAddr,role,active,now(),id).run();}catch{return error('Deze inlognaam bestaat al.',409,'username_exists');}
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:id,action:`Account bijgewerkt: ${name} (${username}), rol ${role}, ${active?'actief':'geblokkeerd'}.`});
  return response({ok:true,account:publicAccount(await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first())});
}
async function revealPassword(env,a,id) {
  const row=await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first();if(!row)return error('Account niet gevonden.',404);
  if(!row.password_cipher||!row.password_iv)return response({ok:true,password:null,message:'Voor dit account is nog geen wachtwoord ingesteld.'});
  try{
    const password=await decryptPassword(row.password_cipher,row.password_iv,env.PASSWORD_KEY);
    await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:id,action:`Wachtwoord van ${row.name} ingezien.`});
    return response({ok:true,password});
  }catch{return error('Wachtwoord kon niet worden ontsleuteld. Controleer PASSWORD_KEY.',500,'decrypt_failed');}
}
async function adminSetPassword(request,env,a,id) {
  const row=await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first();if(!row)return error('Account niet gevonden.',404);
  const b=await readJson(request);if(!b||String(b.password??'').length<1)return error('Vul een wachtwoord in.');
  await setAccountPassword(env,id,String(b.password),toBool(b.mustChange)?1:0);
  await env.DB.prepare(`DELETE FROM sessions WHERE account_id=?`).bind(id).run();
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:id,action:`Wachtwoord van ${row.name} aangepast.`});
  return response({ok:true});
}
async function selfSetPassword(request,env,a) {
  const b=await readJson(request);if(!b)return error('Ongeldige invoer.');
  const old=String(b.currentPassword??''), next=String(b.newPassword??''); if(!next.length)return error('Nieuw wachtwoord mag niet leeg zijn.');
  const hp=await hashPassword(old,a.password_salt);if(!constantEqual(hp.hash,a.password_hash))return error('Huidig wachtwoord klopt niet.',401);
  await setAccountPassword(env,a.id,next,0); await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:a.id,action:'Eigen wachtwoord gewijzigd.'}); return response({ok:true});
}
async function inviteAccount(request,env,a,id) {
  const row=await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(id).first();if(!row)return error('Account niet gevonden.',404);
  const b=await readJson(request)||{};const kind=b.kind==='reset'?'reset':'create';
  const raw=b64(crypto.getRandomValues(new Uint8Array(32))), th=await sha256(raw), expires=addHours(INVITE_HOURS);
  await env.DB.prepare(`INSERT INTO invites(token_hash,account_id,kind,expires_at,created_at) VALUES(?,?,?,?,?)`).bind(th,id,kind,expires,now()).run();
  const link=`${String(env.APP_URL||'').replace(/\/?$/,'/')}?invite=${encodeURIComponent(raw)}`;
  let mail={sent:false,reason:'no_email'};
  if(row.email){mail=await sendEmail(env,{to:row.email,subject:kind==='reset'?'Wachtwoord wijzigen - Dalton Meldpunt':'Uitnodiging Dalton Meldpunt',html:`<p>Hallo ${escapeHtml(row.name)},</p><p>${kind==='reset'?'Je kunt via onderstaande link een nieuw wachtwoord instellen.':'Je bent uitgenodigd voor Dalton Meldpunt. Stel via onderstaande link je wachtwoord in.'}</p><p><a href="${escapeHtml(link)}">Account openen</a></p><p>De link verloopt binnen ${INVITE_HOURS} uur.</p>`});}
  await writeAudit(env,{actorId:a.id,actorName:a.name,type:'account',targetId:id,action:`${kind==='reset'?'Wachtwoordreset':'Accountuitnodiging'} gemaakt voor ${row.name}${mail.sent?' en gemaild':''}.`});
  return response({ok:true,link,mailSent:!!mail.sent,expiresAt:expires});
}
async function inviteInfo(env,token) {
  const th=await sha256(token);const row=await env.DB.prepare(`SELECT i.kind,i.expires_at,i.used_at,a.name,a.username FROM invites i JOIN accounts a ON a.id=i.account_id WHERE i.token_hash=?`).bind(th).first();
  if(!row||row.used_at||row.expires_at<=now())return error('Deze uitnodiging is ongeldig of verlopen.',410,'invite_invalid');
  return response({ok:true,kind:row.kind,expiresAt:row.expires_at,name:row.name,username:row.username});
}
async function acceptInvite(request,env,token) {
  const th=await sha256(token);const row=await env.DB.prepare(`SELECT * FROM invites WHERE token_hash=?`).bind(th).first();if(!row||row.used_at||row.expires_at<=now())return error('Deze uitnodiging is ongeldig of verlopen.',410,'invite_invalid');
  const b=await readJson(request);const password=String(b?.password??'');if(!password.length)return error('Vul een wachtwoord in.');
  await setAccountPassword(env,row.account_id,password,0);await env.DB.prepare(`UPDATE invites SET used_at=? WHERE token_hash=?`).bind(now(),th).run();
  const acct=await env.DB.prepare(`SELECT * FROM accounts WHERE id=?`).bind(row.account_id).first();await writeAudit(env,{actorId:acct.id,actorName:acct.name,type:'account',targetId:acct.id,action:'Wachtwoord ingesteld via uitnodigingslink.'});return response({ok:true});
}

async function listStaff(env) {
  const rows=(await env.DB.prepare(`SELECT id,name,username,email FROM accounts WHERE role='facility' AND active=1 ORDER BY name`).all()).results||[];
  return response({ok:true,staff:rows});
}

async function getRouting(env) {
  const rows=(await env.DB.prepare(`SELECT category,account_id FROM routing ORDER BY category`).all()).results||[];return response({ok:true,routing:Object.fromEntries(rows.map(r=>[r.category,r.account_id||'']))});
}
async function putRouting(request,env,a) {
  const b=await readJson(request);if(!b||!b.routing||typeof b.routing!=='object')return error('Ongeldige routering.');
  const stmts=[];for(const [category,accountIdRaw] of Object.entries(b.routing)){const cat=safeText(category,120),accountId=safeText(accountIdRaw,100)||null;stmts.push(env.DB.prepare(`INSERT INTO routing(category,account_id) VALUES(?,?) ON CONFLICT(category) DO UPDATE SET account_id=excluded.account_id`).bind(cat,accountId));}
  if(stmts.length)await env.DB.batch(stmts);await writeAudit(env,{actorId:a.id,actorName:a.name,type:'routing',targetId:'routing',action:'Automatische categorie-toewijzing bijgewerkt.'});return response({ok:true});
}
async function getAudit(request,env) {
  const u=new URL(request.url);const from=safeText(u.searchParams.get('from'),30),to=safeText(u.searchParams.get('to'),30);let sql=`SELECT * FROM audit_log WHERE 1=1`,args=[];if(from){sql+=` AND at>=?`;args.push(`${from}T00:00:00.000Z`);}if(to){sql+=` AND at<=?`;args.push(`${to}T23:59:59.999Z`);}sql+=` ORDER BY at DESC LIMIT 5000`;const rows=(await env.DB.prepare(sql).bind(...args).all()).results||[];return response({ok:true,rows:rows.map(r=>({id:r.id,at:r.at,actor:r.actor_name,type:r.type,targetId:r.target_id,action:r.action}))});
}
async function getNotifications(env,a) {
  const rows=(await env.DB.prepare(`SELECT * FROM notifications WHERE account_id=? AND read_at IS NULL ORDER BY created_at DESC LIMIT 50`).bind(a.id).all()).results||[];
  const openRow=a.role==='admin'
    ? await env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status!='done'`).first()
    : await env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status!='done' AND (assignee_id=? OR assignee_id IS NULL)`).bind(a.id).first();
  return response({ok:true,notifications:rows.map(r=>({id:r.id,ticketId:r.ticket_id,title:r.title,body:r.body,createdAt:r.created_at})),badge:Number(openRow?.n||0)});
}
async function readNotification(env,a,id) {await env.DB.prepare(`UPDATE notifications SET read_at=? WHERE id=? AND account_id=?`).bind(now(),id,a.id).run();return response({ok:true});}

async function router(request,env) {
  const url=new URL(request.url), path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request,env)});
  if(path==='/api/health')return response({ok:true,version:'3.0.0',emailConfigured:!!env.RESEND_API_KEY});
  if(path==='/api/public/tickets'&&request.method==='POST')return handlePublicCreate(request,env);
  if(path==='/api/login'&&request.method==='POST')return handleLogin(request,env);
  const inv=path.match(/^\/api\/invite\/([^/]+)$/);if(inv){if(request.method==='GET')return inviteInfo(env,decodeURIComponent(inv[1]));if(request.method==='POST')return acceptInvite(request,env,decodeURIComponent(inv[1]));}

  const auth=await requireRole(request,env,['admin','facility']);if(auth.err)return auth.err;const a=auth.account;
  if(path==='/api/me'&&request.method==='GET')return response({ok:true,account:publicAccount(a)});
  if(path==='/api/logout'&&request.method==='POST')return handleLogout(request,env,a);
  if(path==='/api/password'&&request.method==='PUT')return selfSetPassword(request,env,a);
  if(path==='/api/tickets'&&request.method==='GET')return listTickets(request,env,a);
  const tm=path.match(/^\/api\/tickets\/([^/]+)$/);if(tm){const id=decodeURIComponent(tm[1]);if(request.method==='GET')return getTicket(env,a,id);if(request.method==='PATCH')return patchTicket(request,env,a,id);}
  if(path==='/api/notifications'&&request.method==='GET')return getNotifications(env,a);
  const nm=path.match(/^\/api\/notifications\/([^/]+)\/read$/);if(nm&&request.method==='POST')return readNotification(env,a,decodeURIComponent(nm[1]));
  if(path==='/api/staff'&&request.method==='GET')return listStaff(env);

  if(a.role!=='admin')return error('Alleen hoofdbeheer heeft toegang.',403,'admin_only');
  if(path==='/api/accounts'&&request.method==='GET')return listAccounts(env);
  if(path==='/api/accounts'&&request.method==='POST')return createAccount(request,env,a);
  const am=path.match(/^\/api\/accounts\/([^/]+)$/);if(am&&request.method==='PATCH')return patchAccount(request,env,a,decodeURIComponent(am[1]));
  const ap=path.match(/^\/api\/accounts\/([^/]+)\/password$/);if(ap){const id=decodeURIComponent(ap[1]);if(request.method==='GET')return revealPassword(env,a,id);if(request.method==='PUT')return adminSetPassword(request,env,a,id);}
  const ai=path.match(/^\/api\/accounts\/([^/]+)\/invite$/);if(ai&&request.method==='POST')return inviteAccount(request,env,a,decodeURIComponent(ai[1]));
  if(path==='/api/routing'&&request.method==='GET')return getRouting(env);
  if(path==='/api/routing'&&request.method==='PUT')return putRouting(request,env,a);
  if(path==='/api/audit'&&request.method==='GET')return getAudit(request,env);
  return error('Endpoint niet gevonden.',404,'not_found');
}

export default {
  async fetch(request,env) {
    try {
      const res=await router(request,env);const h=new Headers(res.headers);for(const [k,v] of Object.entries(corsHeaders(request,env)))h.set(k,v);return new Response(res.body,{status:res.status,headers:h});
    } catch (e) {
      const h=corsHeaders(request,env);return response({ok:false,error:'Serverfout.',detail:String(e?.message||e)},500,h);
    }
  }
};
