(() => {
  'use strict';

  const C = window.DALTON_CONFIG;
  const DB_KEY = 'dalton_meldpunt_v2';
  const LEGACY_KEY = 'dalton_meldpunt_v1';
  const SESSION_KEY = 'dalton_meldpunt_session_v2';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const now = () => new Date().toISOString();
  const fmt = iso => new Intl.DateTimeFormat('nl-NL',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso));
  const fmtDate = iso => new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium'}).format(new Date(iso));
  const uid = prefix => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const statuses = {open:'Open',progress:'In behandeling',wait:'Wacht / gepland',done:'Afgerond'};
  const urgencyLabel = {laag:'Laag',normaal:'Normaal',hoog:'Hoog',spoed:'Spoed'};

  function defaultDB(){
    const t = now();
    return {
      version:2,
      settings:{showAuditToFacility:false,localNotifications:true},
      accounts:[
        {id:'u-admin',name:C.defaultAdminName || 'Jeremy',username:'JKO',email:'',role:'admin',active:true,salt:'demo-admin',passwordHash:'',mustSetPassword:true,createdAt:t,updatedAt:t},
        {id:'u-fac1',name:'Conciërge 1',username:'CON1',email:'',role:'facility',active:true,salt:'demo-fac1',passwordHash:'',mustSetPassword:true,createdAt:t,updatedAt:t},
        {id:'u-fac2',name:'Facilitair 1',username:'FAC1',email:'',role:'facility',active:true,salt:'demo-fac2',passwordHash:'',mustSetPassword:true,createdAt:t,updatedAt:t}
      ],
      routing:{'Gebouw / onderhoud':'u-fac1','Deuren / sloten / toegang':'u-fac1','Voorraad / materialen':'u-fac2'},
      tickets:[
        {id:'M-2026-001',createdAt:t,updatedAt:t,reporter:'Demo docent',reporterEmail:'',location:'B-vleugel - lokaal B1.14',category:'Gebouw / onderhoud',urgency:'hoog',title:'Deurdranger sluit niet goed',description:'De deur blijft regelmatig half open staan.',canContinue:'ja',photo:null,status:'open',assignee:'u-fac1',internalNote:'',mailReporterOnComplete:false,completionMailPreparedAt:null,history:[{at:t,actor:'Systeem',action:'Melding aangemaakt'}]},
        {id:'M-2026-002',createdAt:t,updatedAt:t,reporter:'Demo docent',reporterEmail:'',location:'Mediatheek',category:'Meubilair',urgency:'normaal',title:'Losse tafelpoot',description:'Tafel bij het raam wiebelt sterk.',canContinue:'ja',photo:null,status:'progress',assignee:'u-fac2',internalNote:'Onderdeel controleren.',mailReporterOnComplete:false,completionMailPreparedAt:null,history:[{at:t,actor:'Systeem',action:'Melding aangemaakt'}]}
      ],
      auditLog:[
        {id:uid('log'),at:t,actor:'Systeem',actorId:'system',type:'ticket',targetId:'M-2026-001',action:'Melding aangemaakt'},
        {id:uid('log'),at:t,actor:'Systeem',actorId:'system',type:'ticket',targetId:'M-2026-002',action:'Melding aangemaakt'}
      ]
    };
  }

  function migrate(raw){
    const d = raw || defaultDB();
    d.version = 2;
    d.settings = d.settings || {showAuditToFacility:false,localNotifications:true};
    d.accounts = d.accounts || (d.staff || []).map((s,i)=>({
      id:s.id || uid('u'), name:s.name || `Medewerker ${i+1}`, username:(s.name || `MED${i+1}`).replace(/[^A-Za-z0-9]/g,'').slice(0,8).toUpperCase(), email:'', role:s.role || 'facility', active:s.active!==false, salt:`legacy-${i}`, passwordHash:'', mustSetPassword:true, createdAt:now(), updatedAt:now()
    }));
    if (!d.accounts.some(a=>a.role==='admin')) d.accounts.unshift(defaultDB().accounts[0]);
    d.tickets = (d.tickets || []).map(t=>{
      const combined = [t.location,t.room].filter(Boolean).join(t.location && t.room ? ' - ' : '');
      return {...t,location:combined || t.location || '',mailReporterOnComplete:!!t.mailReporterOnComplete,completionMailPreparedAt:t.completionMailPreparedAt || null};
    });
    d.auditLog = d.auditLog || [];
    if (!d.auditLog.length) {
      d.tickets.forEach(t=>(t.history||[]).forEach(h=>d.auditLog.push({id:uid('log'),at:h.at,actor:h.actor,actorId:'legacy',type:'ticket',targetId:t.id,action:h.action})));
    }
    delete d.staff;
    return d;
  }

  function load(){
    try {
      const v2 = localStorage.getItem(DB_KEY);
      if (v2) return migrate(JSON.parse(v2));
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return migrate(JSON.parse(legacy));
    } catch {}
    return defaultDB();
  }

  let db = load();
  let session = (()=>{ try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { return null; } })();
  let publicView = true;

  function save(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); updateBadge(); }
  save();

  function accountById(id){ return db.accounts.find(a=>a.id===id); }
  function currentAccount(){ return session ? accountById(session.accountId) : null; }
  function facilityAccounts(){ return db.accounts.filter(a=>a.active && a.role==='facility'); }
  function accountName(id){ return accountById(id)?.name || 'Niet toegewezen'; }
  function openCountFor(id){ return db.tickets.filter(t=>t.status!=='done' && (!id || t.assignee===id)).length; }
  function routeAssignment(category){ const id = db.routing[category] || ''; return accountById(id)?.active ? id : ''; }
  function ticketNum(){
    const year = new Date().getFullYear();
    const nums = db.tickets.map(t=>/^M-(\d{4})-(\d+)$/.exec(t.id)).filter(Boolean).filter(m=>Number(m[1])===year).map(m=>Number(m[2]));
    return `M-${year}-${String((Math.max(0,...nums)+1)).padStart(3,'0')}`;
  }
  function addAudit(actor, type, targetId, action, actorId=''){
    db.auditLog.unshift({id:uid('log'),at:now(),actor,actorId,type,targetId,action});
  }
  function addHistory(ticket, actor, action, actorId=''){
    ticket.history = ticket.history || [];
    const at = now();
    ticket.history.push({at,actor,action});
    ticket.updatedAt = at;
    db.auditLog.unshift({id:uid('log'),at,actor,actorId,type:'ticket',targetId:ticket.id,action});
  }

  async function sha256(text){
    if (!crypto.subtle) return btoa(unescape(encodeURIComponent(text))).slice(0,64);
    const bytes = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function setPassword(account, password){
    account.salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    account.passwordHash = await sha256(`${account.salt}:${password}`);
    account.mustSetPassword = false;
    account.updatedAt = now();
  }
  async function passwordMatches(account,password){
    if (!account.passwordHash) return false;
    return account.passwordHash === await sha256(`${account.salt}:${password}`);
  }

  async function ensureDemoPasswords(){
    const defaults = {JKO:'demo-admin',CON1:'demo-facilitair',FAC1:'demo-facilitair'};
    let changed=false;
    for (const [username,password] of Object.entries(defaults)) {
      let a = db.accounts.find(x=>String(x.username||'').toUpperCase()===username);
      if (!a && username==='JKO') {
        a = {...defaultDB().accounts[0],createdAt:now(),updatedAt:now()};
        db.accounts.unshift(a);
        changed=true;
      }
      if (a && !a.passwordHash) { await setPassword(a,password); a.mustSetPassword=true; changed=true; }
    }
    if (changed) save();
  }

  async function repairDemoLogin(){
    let admin = db.accounts.find(x=>String(x.username||'').toUpperCase()==='JKO');
    if (!admin) {
      admin = {...defaultDB().accounts[0],createdAt:now(),updatedAt:now()};
      db.accounts.unshift(admin);
    }
    admin.username='JKO';
    admin.role='admin';
    admin.active=true;
    await setPassword(admin,'demo-admin');
    admin.mustSetPassword=true;

    const demoFacilities = [
      ['CON1','Conciërge 1','demo-facilitair','u-fac1'],
      ['FAC1','Facilitair 1','demo-facilitair','u-fac2']
    ];
    for (const [username,name,password,id] of demoFacilities) {
      let a=db.accounts.find(x=>String(x.username||'').toUpperCase()===username);
      if(!a){a={id,name,username,email:'',role:'facility',active:true,salt:'',passwordHash:'',mustSetPassword:true,createdAt:now(),updatedAt:now()};db.accounts.push(a);}
      a.username=username;a.role='facility';a.active=true;
      await setPassword(a,password);a.mustSetPassword=true;
    }
    addAudit('Systeem','account',admin.id,'Demo-inlog hoofdbeheer hersteld','system');
    save();
  }

  function setSession(account){
    session = account ? {accountId:account.id,loginAt:now()} : null;
    if (session) sessionStorage.setItem(SESSION_KEY,JSON.stringify(session)); else sessionStorage.removeItem(SESSION_KEY);
  }

  async function updateBadge(){
    const a=currentAccount();
    const n=a?.role==='facility' ? openCountFor(a.id) : a?.role==='admin' ? db.tickets.filter(t=>t.status!=='done').length : 0;
    try { if ('setAppBadge' in navigator) n ? await navigator.setAppBadge(n) : await navigator.clearAppBadge(); } catch {}
  }
  function localNotify(title,body){
    if (!db.settings.localNotifications || !('Notification' in window) || Notification.permission!=='granted') return;
    try { new Notification(title,{body,icon:'assets/icon-192.png'}); } catch {}
  }

  const params = new URLSearchParams(location.search);

  function header(){
    const a=currentAccount();
    return `<header class="topbar"><div class="brand"><div class="logo">🔧</div><div><h1>${esc(C.appName)}</h1><p>${esc(C.schoolName)}</p></div></div><div class="top-actions">${a?`<span class="user-pill"><b>${esc(a.username)}</b> · ${esc(a.name)}</span><button class="btn ghost small" id="logoutBtn">Uitloggen</button>`:`<button class="btn secondary small" id="loginBtn">Facilitair / beheer inloggen</button>`}</div></header>`;
  }

  function shell(content,{notice=true}={}){
    $('#app').innerHTML = `<div class="shell">${header()}${notice?'<div class="notice">Prototype v2 - accounts, e-mail en gegevens staan nog lokaal in deze browser. Gebruik alleen testgegevens.</div>':''}${content}</div>`;
    const logout=$('#logoutBtn'); if(logout) logout.onclick=()=>{ setSession(null); publicView=true; render(); };
    const login=$('#loginBtn'); if(login) login.onclick=()=>showLogin();
    updateBadge();
  }

  function publicNav(){
    const a=currentAccount();
    return `<div class="public-nav"><button class="btn ${publicView?'primary':'ghost'}" id="navReport">Melding maken</button>${a?`<button class="btn ${!publicView?'primary':'ghost'}" id="navDashboard">${a.role==='admin'?'Beheer':'Facilitair'}</button>`:''}</div>`;
  }

  function showLogin(message=''){
    shell(`<div class="auth-wrap"><section class="card auth-card"><h2>Inloggen</h2><p class="sub">Voor facilitair medewerkers en hoofdbeheer.</p>${message?`<div class="success">${esc(message)}</div>`:''}<form id="loginForm"><label class="req">Inlognaam</label><input name="username" autocomplete="username" required placeholder="Bijv. JKO"><label class="req">Persoonlijk wachtwoord</label><input name="password" type="password" autocomplete="current-password" required><div id="loginError"></div><div class="actions"><button class="btn primary" type="submit">Inloggen</button><button class="btn ghost" type="button" id="backPublic">Terug naar melden</button></div></form><div class="divider"></div><p class="tiny muted"><b>Demo:</b> JKO / demo-admin &nbsp; of &nbsp; CON1 / demo-facilitair.</p><button class="btn ghost small" type="button" id="repairDemo">Demo-inlog herstellen</button><p class="tiny muted">Gebruik deze knop als een oudere lokale testversie de demo-inlog heeft overschreven. Meldingen en overige testdata blijven behouden.</p></section></div>`,{notice:true});
    $('#backPublic').onclick=()=>{publicView=true;render();};
    $('#repairDemo').onclick=async()=>{
      await repairDemoLogin();
      showLogin('Demo-inlog hersteld. Gebruik JKO / demo-admin.');
    };
    $('#loginForm').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.target); const username=String(f.get('username')).trim().toUpperCase(); const password=String(f.get('password'));
      const a=db.accounts.find(x=>x.active && x.username.toUpperCase()===username && (x.role==='facility'||x.role==='admin'));
      if(!a || !(await passwordMatches(a,password))){ $('#loginError').innerHTML='<div class="errorbox">Onjuiste inlognaam of wachtwoord.</div>'; return; }
      setSession(a); publicView=false; addAudit(a.name,'account',a.id,'Ingelogd',a.id); save(); render();
    };
  }

  function staffView(){
    const preLocation = [params.get('locatie'),params.get('ruimte')].filter(Boolean).join(' - ');
    const catOptions=C.categories.map(x=>`<option>${esc(x)}</option>`).join('');
    shell(`${publicNav()}<div class="grid"><section class="card hero span-5"><h2>Facilitaire melding</h2><p class="sub">Iets kapot, vies, leeg of onveilig? Meld het hier snel bij facilitair.</p><div class="divider hero-line"></div><p>Vul de locatie zo duidelijk mogelijk in, bijvoorbeeld <b>lokaal B1.14</b>, <b>mediatheek</b> of <b>gymzaal kleedkamer 2</b>.</p><p class="tiny">Bij direct gevaar of spoed: volg altijd de interne noodprocedure en neem direct persoonlijk contact op.</p></section><section class="card span-7"><h2>Nieuwe melding</h2><p class="sub">Velden met * zijn verplicht.</p><form id="reportForm"><div class="row"><div><label class="req">Naam</label><input name="reporter" required placeholder="Voor- en achternaam"></div><div><label>E-mailadres</label><input name="email" type="email" placeholder="naam@school.nl"></div></div><label class="req">Locatie / lokaal / ruimte</label><input name="location" required value="${esc(preLocation)}" placeholder="Bijv. lokaal B1.14, mediatheek of gymzaal"><div class="row"><div><label class="req">Categorie</label><select name="category" required>${catOptions}</select></div><div><label class="req">Urgentie</label><select name="urgency" required><option value="laag">Laag</option><option value="normaal" selected>Normaal</option><option value="hoog">Hoog</option><option value="spoed">Spoed</option></select></div></div><label class="req">Korte titel</label><input name="title" required maxlength="90" placeholder="Bijv. deurklink zit los"><label class="req">Wat is er aan de hand?</label><textarea name="description" required placeholder="Omschrijf kort wat er kapot is, ontbreekt of aandacht nodig heeft."></textarea><label>Kan de les / het werk hier doorgaan?</label><select name="canContinue"><option value="ja">Ja</option><option value="beperkt">Beperkt</option><option value="nee">Nee</option><option value="nvt">Niet van toepassing</option></select><label>Foto maken of toevoegen</label><input id="photoInput" type="file" accept="image/*" capture="environment"><img id="photoPreview" class="photo-preview" hidden alt="Voorbeeld foto"><div class="actions"><button class="btn primary" type="submit">Melding versturen</button><button class="btn secondary" type="button" id="notifyBtn">Meldingen op dit toestel toestaan</button></div></form><div id="formResult" class="result-space"></div></section></div>`);
    $('#navReport').onclick=()=>{};
    const navDash=$('#navDashboard'); if(navDash) navDash.onclick=()=>{publicView=false;render();};
    let photoData=null;
    $('#photoInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;photoData=await compressImage(file,1200,.72);$('#photoPreview').src=photoData;$('#photoPreview').hidden=false;};
    $('#notifyBtn').onclick=async()=>{if(!('Notification' in window))return alert('Deze browser ondersteunt geen webmeldingen.');const p=await Notification.requestPermission();alert(p==='granted'?'Meldingen zijn toegestaan.':'Meldingen zijn niet toegestaan.');};
    $('#reportForm').onsubmit=e=>{
      e.preventDefault(); const f=new FormData(e.target); const category=f.get('category');
      const t={id:ticketNum(),createdAt:now(),updatedAt:now(),reporter:f.get('reporter'),reporterEmail:f.get('email'),location:f.get('location'),category,urgency:f.get('urgency'),title:f.get('title'),description:f.get('description'),canContinue:f.get('canContinue'),photo:photoData,status:'open',assignee:routeAssignment(category),internalNote:'',mailReporterOnComplete:false,completionMailPreparedAt:null,history:[]};
      addHistory(t,'Melder','Melding aangemaakt','public'); if(t.assignee)addHistory(t,'Systeem',`Automatisch toegewezen aan ${accountName(t.assignee)}`,'system'); db.tickets.unshift(t); save();
      const subject=encodeURIComponent(`[${t.id}] ${t.title}`); const body=encodeURIComponent(`Nieuwe facilitaire melding\n\nMeldingsnummer: ${t.id}\nMelder: ${t.reporter}\nLocatie: ${t.location}\nCategorie: ${t.category}\nUrgentie: ${urgencyLabel[t.urgency]}\n\n${t.description}\n\nBekijk en behandel de melding in ${C.appName}.`);
      $('#formResult').innerHTML=`<div class="success"><b>Melding ${esc(t.id)} is opgeslagen.</b><br>Toegewezen aan: ${esc(accountName(t.assignee))}.<div class="actions"><a class="btn secondary" href="mailto:${encodeURIComponent(C.conciergeEmail)}?subject=${subject}&body=${body}">E-mailmelding openen</a><button class="btn ghost" id="newReport">Nog een melding</button></div><div class="tiny muted">Prototype: de e-mail wordt als concept geopend. Automatisch verzenden volgt pas met een gedeelde backend/mailkoppeling.</div></div>`;
      e.target.reset();photoData=null;$('#photoPreview').hidden=true;$('#newReport').onclick=()=>{$('#formResult').innerHTML='';}; localNotify('Nieuwe melding',`${t.id}: ${t.title}`);
    };
  }

  function dashboardNav(active){
    const a=currentAccount();
    return `<div class="public-nav"><button class="btn ghost" id="goPublic">Melding maken</button><button class="btn ${active==='dashboard'?'primary':'ghost'}" id="goDash">${a.role==='admin'?'Beheer':'Facilitair'}</button></div>`;
  }

  function facilityView(){
    const a=currentAccount(); if(!a || a.role!=='facility'){showLogin();return;}
    const mine=db.tickets.filter(t=>t.assignee===a.id && t.status!=='done');
    const unassigned=db.tickets.filter(t=>!t.assignee && t.status!=='done');
    shell(`${dashboardNav('dashboard')}<div class="grid"><section class="card hero span-12"><h2>Goedemorgen, ${esc(a.name)}</h2><p class="sub">Je persoonlijke facilitaire werklijst.</p><div class="kpis"><div class="kpi"><span>Aan mij</span><b>${mine.length}</b></div><div class="kpi"><span>Niet toegewezen</span><b>${unassigned.length}</b></div><div class="kpi"><span>Spoed</span><b>${db.tickets.filter(t=>t.status!=='done'&&t.urgency==='spoed').length}</b></div><div class="kpi"><span>Afgerond</span><b>${db.tickets.filter(t=>t.status==='done'&&t.assignee===a.id).length}</b></div></div></section><section class="card span-8"><div class="toolbar"><h3 class="grow">Meldingen</h3><select id="facFilter"><option value="mine">Aan mij</option><option value="open">Alle open</option><option value="unassigned">Niet toegewezen</option><option value="done">Afgerond</option></select><input id="facSearch" placeholder="Zoeken..."></div><div id="facTickets" class="list list-top"></div></section><section class="card span-4"><h3>Mijn account</h3><p><b>${esc(a.name)}</b><br><span class="muted code">${esc(a.username)}</span></p><p class="tiny muted">Je inlognaam wordt door hoofdbeheer beheerd. Je kunt je wachtwoord zelf wijzigen.</p><button class="btn secondary" id="changeOwnPassword">Wachtwoord wijzigen</button></section></div>`);
    $('#goPublic').onclick=()=>{publicView=true;render();}; $('#goDash').onclick=()=>{};
    const draw=()=>{const filter=$('#facFilter').value,q=$('#facSearch').value.toLowerCase();let items=db.tickets.slice();if(filter==='mine')items=items.filter(t=>t.assignee===a.id&&t.status!=='done');if(filter==='open')items=items.filter(t=>t.status!=='done');if(filter==='unassigned')items=items.filter(t=>!t.assignee&&t.status!=='done');if(filter==='done')items=items.filter(t=>t.status==='done');items=items.filter(t=>`${t.id} ${t.title} ${t.reporter} ${t.location} ${t.category}`.toLowerCase().includes(q));$('#facTickets').innerHTML=items.length?items.map(ticketCard).join(''):'<div class="empty">Geen meldingen.</div>';$$('[data-ticket]').forEach(x=>x.onclick=()=>openTicket(x.dataset.ticket,'facility'));};
    $('#facFilter').onchange=draw;$('#facSearch').oninput=draw;draw();
    $('#changeOwnPassword').onclick=()=>showPasswordModal(a,false);
  }

  function adminView(){
    const a=currentAccount(); if(!a || a.role!=='admin'){showLogin();return;}
    const open=db.tickets.filter(t=>t.status!=='done'); const today=new Date().toDateString(); const todayN=db.tickets.filter(t=>new Date(t.createdAt).toDateString()===today).length; const high=open.filter(t=>t.urgency==='hoog'||t.urgency==='spoed').length;
    shell(`${dashboardNav('dashboard')}<div class="grid"><section class="card hero span-12"><h2>Hoofdbeheer</h2><p class="sub">Meldingen, medewerkers, routering en auditlog.</p><div class="kpis"><div class="kpi"><span>Vandaag</span><b>${todayN}</b></div><div class="kpi"><span>Open</span><b>${open.length}</b></div><div class="kpi"><span>Hoog/spoed</span><b>${high}</b></div><div class="kpi"><span>Afgerond</span><b>${db.tickets.filter(t=>t.status==='done').length}</b></div><div class="kpi"><span>Niet toegewezen</span><b>${open.filter(t=>!t.assignee).length}</b></div></div></section><section class="card span-8"><div class="toolbar"><h3 class="grow">Alle meldingen</h3><input id="adminSearch" placeholder="Zoeken..."></div><div id="adminTickets" class="list list-top"></div></section><section class="card span-4"><h3>Automatische toewijzing</h3><p class="sub">Nieuwe meldingen van een categorie worden standaard aan deze medewerker toegewezen.</p><div id="routing"></div></section><section class="card span-12"><div class="section-head"><div><h3>Medewerkers & accounts</h3><p class="sub">Bekijk, wijzig, nodig uit of reset een wachtwoord.</p></div><button class="btn primary" id="addAccount">Account toevoegen</button></div><div id="accountList" class="account-grid"></div></section><section class="card span-12"><div class="section-head"><div><h3>Auditlog</h3><p class="sub">Alle geregistreerde acties in tekst, inclusief melding- en accountwijzigingen.</p></div></div><div class="audit-controls"><div><label>Van</label><input type="date" id="auditFrom"></div><div><label>Tot en met</label><input type="date" id="auditTo"></div><div class="audit-actions"><button class="btn secondary" id="applyAudit">Filter toepassen</button><button class="btn primary" id="auditPdf">Export PDF</button></div></div><div id="auditText" class="audit-text"></div></section><section class="card span-6"><h3>Instellingen</h3><div class="settings-group"><div class="toggle"><div><b>Auditlog zichtbaar voor facilitair</b><div class="tiny muted">Voor later voorbereid; standaard uit.</div></div><input type="checkbox" id="auditToggle" ${db.settings.showAuditToFacility?'checked':''}></div></div><div class="settings-group"><div class="toggle"><div><b>Lokale browsermeldingen</b><div class="tiny muted">Alleen op dit apparaat.</div></div><input type="checkbox" id="notifyToggle" ${db.settings.localNotifications?'checked':''}></div></div></section><section class="card span-6"><h3>Back-up testdata</h3><p class="sub">Alleen voor deze lokale prototypegegevens.</p><div class="actions"><button id="exportData" class="btn ghost">Export JSON</button><label class="btn ghost file-btn">Import JSON<input id="importData" type="file" accept="application/json" hidden></label><button id="resetDemo" class="btn danger">Demo resetten</button></div></section></div>`);
    $('#goPublic').onclick=()=>{publicView=true;render();};$('#goDash').onclick=()=>{};
    const drawTickets=()=>{const q=$('#adminSearch').value.toLowerCase();const items=db.tickets.filter(t=>`${t.id} ${t.title} ${t.reporter} ${t.location} ${t.category}`.toLowerCase().includes(q));$('#adminTickets').innerHTML=items.length?items.map(ticketCard).join(''):'<div class="empty">Geen meldingen.</div>';$$('[data-ticket]').forEach(x=>x.onclick=()=>openTicket(x.dataset.ticket,'admin'));};
    $('#adminSearch').oninput=drawTickets;drawTickets();renderRouting();renderAccounts();initAuditFilters();
    $('#auditToggle').onchange=e=>{db.settings.showAuditToFacility=e.target.checked;addAudit(a.name,'settings','audit-visibility',`Auditlog zichtbaar voor facilitair: ${e.target.checked?'aan':'uit'}`,a.id);save();};
    $('#notifyToggle').onchange=e=>{db.settings.localNotifications=e.target.checked;addAudit(a.name,'settings','local-notifications',`Lokale browsermeldingen: ${e.target.checked?'aan':'uit'}`,a.id);save();};
    $('#addAccount').onclick=()=>showAccountModal(null);
    $('#exportData').onclick=()=>downloadJSON(db,'dalton-meldpunt-v2-backup.json');
    $('#importData').onchange=async e=>{try{const txt=await e.target.files[0].text();const incoming=migrate(JSON.parse(txt));if(!incoming.tickets||!incoming.accounts)throw 0;db=incoming;addAudit(a.name,'data','import','JSON-back-up geïmporteerd',a.id);save();render();}catch{alert('Dit JSON-bestand lijkt geen geldige Dalton Meldpunt back-up.');}};
    $('#resetDemo').onclick=()=>{if(confirm('Alle lokale testgegevens verwijderen en demo opnieuw starten?')){db=defaultDB();setSession(null);save();ensureDemoPasswords().then(()=>render());}};
  }

  function renderRouting(){
    const fac=facilityAccounts(); const host=$('#routing'); if(!host)return;
    host.innerHTML=C.categories.map(cat=>`<div class="settings-group"><label class="label-top">${esc(cat)}</label><select data-route="${esc(cat)}"><option value="">Niet automatisch</option>${fac.map(s=>`<option value="${s.id}" ${db.routing[cat]===s.id?'selected':''}>${esc(s.name)} (${esc(s.username)})</option>`).join('')}</select></div>`).join('');
    $$('[data-route]').forEach(s=>s.onchange=()=>{const a=currentAccount();const old=accountName(db.routing[s.dataset.route]);db.routing[s.dataset.route]=s.value;addAudit(a.name,'routing',s.dataset.route,`${s.dataset.route}: ${old} → ${accountName(s.value)}`,a.id);save();});
  }

  function renderAccounts(){
    const host=$('#accountList'); if(!host)return;
    host.innerHTML=db.accounts.map(a=>`<div class="account-card ${a.active?'':'inactive'}"><div class="account-head"><div><b>${esc(a.name)}</b><div class="tiny muted"><span class="code">${esc(a.username)}</span> · ${a.role==='admin'?'Hoofdbeheerder':a.role==='facility'?'Facilitair':'Personeel'}</div></div><span class="chip ${a.active?'done':'wait'}">${a.active?'Actief':'Inactief'}</span></div><div class="account-meta">${a.email?esc(a.email):'<span class="muted">Geen e-mailadres</span>'}<br>${a.role==='facility'?`${openCountFor(a.id)} open melding(en)`:''}</div><div class="actions"><button class="btn secondary small" data-edit-account="${a.id}">Bekijken / bewerken</button><button class="btn ghost small" data-invite-account="${a.id}">Uitnodiging</button><button class="btn ghost small" data-reset-account="${a.id}">Wachtwoord reset</button></div></div>`).join('');
    $$('[data-edit-account]').forEach(b=>b.onclick=()=>showAccountModal(accountById(b.dataset.editAccount)));
    $$('[data-invite-account]').forEach(b=>b.onclick=()=>sendInvite(accountById(b.dataset.inviteAccount),'invite'));
    $$('[data-reset-account]').forEach(b=>b.onclick=()=>sendInvite(accountById(b.dataset.resetAccount),'reset'));
  }

  function showAccountModal(account){
    const admin=currentAccount(); const isNew=!account; const a=account || {id:'',name:'',username:'',email:'',role:'facility',active:true};
    const modal=makeModal(`<h2>${isNew?'Account toevoegen':'Account bekijken / bewerken'}</h2><form id="accountForm"><div class="row"><div><label class="req">Naam</label><input name="name" required value="${esc(a.name)}"></div><div><label class="req">Inlognaam / schoolafkorting</label><input name="username" required maxlength="20" value="${esc(a.username)}" placeholder="Bijv. JKO"></div></div><label>E-mailadres</label><input name="email" type="email" value="${esc(a.email||'')}" placeholder="naam@school.nl"><div class="row"><div><label class="req">Rol</label><select name="role"><option value="facility" ${a.role==='facility'?'selected':''}>Facilitair / conciërge</option><option value="admin" ${a.role==='admin'?'selected':''}>Hoofdbeheerder</option><option value="staff" ${a.role==='staff'?'selected':''}>Personeel</option></select></div><div><label>Status</label><select name="active"><option value="true" ${a.active?'selected':''}>Actief</option><option value="false" ${!a.active?'selected':''}>Inactief</option></select></div></div>${isNew?'<label class="req">Tijdelijk wachtwoord</label><input name="password" type="password" required minlength="8" placeholder="Minimaal 8 tekens">':'<div class="info-box">Het huidige wachtwoord is bewust niet leesbaar opgeslagen. Als hoofdbeheerder kun je wel een nieuw wachtwoord instellen of een resetuitnodiging versturen.</div>'}<div class="actions"><button class="btn primary" type="submit">Opslaan</button>${!isNew?'<button class="btn secondary" type="button" id="setPasswordAdmin">Nieuw wachtwoord instellen</button>':''}<button class="btn ghost" type="button" data-close-modal>Annuleren</button></div></form>`);
    $('[data-close-modal]',modal).onclick=()=>modal.remove();
    $('#accountForm',modal).onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.target);const username=String(f.get('username')).trim().toUpperCase();const duplicate=db.accounts.find(x=>x.username.toUpperCase()===username&&x.id!==a.id);if(duplicate)return alert('Deze inlognaam bestaat al.');
      if(isNew){const n={id:uid('u'),name:f.get('name'),username,email:f.get('email'),role:f.get('role'),active:f.get('active')==='true',salt:'',passwordHash:'',mustSetPassword:true,createdAt:now(),updatedAt:now()};await setPassword(n,String(f.get('password')));n.mustSetPassword=true;db.accounts.push(n);addAudit(admin.name,'account',n.id,`Account aangemaakt: ${n.name} (${n.username}), rol ${n.role}`,admin.id);}else{const old=`${a.name} / ${a.username} / ${a.role} / ${a.active?'actief':'inactief'}`;a.name=f.get('name');a.username=username;a.email=f.get('email');a.role=f.get('role');a.active=f.get('active')==='true';a.updatedAt=now();addAudit(admin.name,'account',a.id,`Account gewijzigd: ${old} → ${a.name} / ${a.username} / ${a.role} / ${a.active?'actief':'inactief'}`,admin.id);if(!a.active){db.tickets.filter(t=>t.assignee===a.id&&t.status!=='done').forEach(t=>{t.assignee='';addHistory(t,admin.name,`${a.name} gedeactiveerd; toewijzing verwijderd`,admin.id);});}}
      save();modal.remove();render();
    };
    const setBtn=$('#setPasswordAdmin',modal);if(setBtn)setBtn.onclick=()=>showPasswordModal(a,true,()=>{modal.remove();render();});
  }

  function showPasswordModal(account,byAdmin,onDone){
    const actor=currentAccount();
    const modal=makeModal(`<h2>Wachtwoord wijzigen</h2><p class="sub">Account: <b>${esc(account.name)}</b> (${esc(account.username)})</p><form id="pwdForm">${!byAdmin?'<label class="req">Huidig wachtwoord</label><input name="oldPassword" type="password" required>':''}<label class="req">Nieuw wachtwoord</label><input name="newPassword" type="password" minlength="8" required><label class="req">Herhaal nieuw wachtwoord</label><input name="repeatPassword" type="password" minlength="8" required><div id="pwdError"></div><div class="actions"><button class="btn primary" type="submit">Wachtwoord opslaan</button><button class="btn ghost" type="button" data-close-modal>Annuleren</button></div></form>`);
    $('[data-close-modal]',modal).onclick=()=>modal.remove();
    $('#pwdForm',modal).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const n=String(f.get('newPassword')),r=String(f.get('repeatPassword'));if(n!==r){$('#pwdError',modal).innerHTML='<div class="errorbox">De nieuwe wachtwoorden zijn niet gelijk.</div>';return;}if(!byAdmin && !(await passwordMatches(account,String(f.get('oldPassword'))))){$('#pwdError',modal).innerHTML='<div class="errorbox">Het huidige wachtwoord klopt niet.</div>';return;}await setPassword(account,n);addAudit(actor.name,'account',account.id,byAdmin?`Wachtwoord opnieuw ingesteld voor ${account.name}`:'Eigen wachtwoord gewijzigd',actor.id);save();modal.remove();if(onDone)onDone();else render();};
  }

  function buildSetupLink(account,mode){
    const payload=btoa(unescape(encodeURIComponent(JSON.stringify({v:2,mode,username:account.username,name:account.name,email:account.email||'',role:account.role,ts:Date.now()}))));
    const configured=(C.publicUrl||''); const base=((configured && !configured.includes('JOUW-GITHUB-NAAM')) ? configured : location.href.split('?')[0]).replace(/\/$/,'/');
    return `${base}?setup=${encodeURIComponent(payload)}`;
  }
  function sendInvite(account,mode){
    if(!account.email){alert('Vul eerst een e-mailadres in bij dit account.');return;}
    const admin=currentAccount();const link=buildSetupLink(account,mode);const subject=encodeURIComponent(mode==='reset'?`${C.appName}: wachtwoord wijzigen`:`${C.appName}: account activeren`);const body=encodeURIComponent(`Hallo ${account.name},\n\n${mode==='reset'?'Gebruik onderstaande link om een nieuw persoonlijk wachtwoord in te stellen.':'Je bent uitgenodigd voor Dalton Meldpunt. Gebruik onderstaande link om je persoonlijke wachtwoord in te stellen.'}\n\nInlognaam: ${account.username}\n${link}\n\nDit is nog de prototypeversie; accounts worden lokaal op het gebruikte apparaat opgeslagen.`);addAudit(admin.name,'account',account.id,mode==='reset'?'Wachtwoord-resetuitnodiging voorbereid':'Accountuitnodiging voorbereid',admin.id);save();location.href=`mailto:${encodeURIComponent(account.email)}?subject=${subject}&body=${body}`;
  }

  function ticketCard(t){
    return `<div class="ticket" data-ticket="${t.id}"><div class="ticket-head"><div><div class="ticket-title">${esc(t.id)} · ${esc(t.title)}</div><div class="ticket-meta">${esc(t.location)} · ${esc(t.category)} · ${fmt(t.createdAt)}</div></div><div class="chips"><span class="chip ${t.urgency}">${urgencyLabel[t.urgency]}</span><span class="chip ${t.status}">${statuses[t.status]}</span></div></div><div class="ticket-desc">${esc(t.description).slice(0,180)}${t.description.length>180?'…':''}</div><div class="ticket-meta">Toegewezen aan: <b>${esc(accountName(t.assignee))}</b></div></div>`;
  }

  function openTicket(ticketId,viewer){
    const t=db.tickets.find(x=>x.id===ticketId);if(!t)return;const a=currentAccount();const fac=facilityAccounts();const showAudit=viewer==='admin'||db.settings.showAuditToFacility;
    const modal=makeModal(`<h2>${esc(t.id)} · ${esc(t.title)}</h2><div class="chips"><span class="chip ${t.urgency}">${urgencyLabel[t.urgency]}</span><span class="chip ${t.status}">${statuses[t.status]}</span></div><p>${esc(t.description)}</p>${t.photo?`<img class="photo-preview" src="${t.photo}" alt="Foto bij melding">`:''}<div class="grid"><div class="span-6"><label>Locatie / lokaal / ruimte</label><input id="mLocation" value="${esc(t.location)}"><label>Categorie</label><select id="mCategory">${C.categories.map(c=>`<option ${c===t.category?'selected':''}>${esc(c)}</option>`).join('')}</select><label>Urgentie</label><select id="mUrgency">${Object.entries(urgencyLabel).map(([k,v])=>`<option value="${k}" ${k===t.urgency?'selected':''}>${v}</option>`).join('')}</select></div><div class="span-6"><label>Status</label><select id="mStatus">${Object.entries(statuses).map(([k,v])=>`<option value="${k}" ${k===t.status?'selected':''}>${v}</option>`).join('')}</select><label>Toewijzen aan</label><select id="mAssignee"><option value="">Niet toegewezen</option>${fac.map(s=>`<option value="${s.id}" ${s.id===t.assignee?'selected':''}>${esc(s.name)} (${esc(s.username)})</option>`).join('')}</select><label>Interne notitie</label><textarea id="mNote">${esc(t.internalNote||'')}</textarea></div></div><div class="settings-group completion-box"><div class="toggle"><div><b>Melder e-mailen zodra melding wordt afgerond</b><div class="tiny muted">${t.reporterEmail?`Naar ${esc(t.reporterEmail)}`:'Geen e-mailadres ingevuld door melder.'}</div></div><input type="checkbox" id="mMailReporter" ${t.mailReporterOnComplete?'checked':''} ${!t.reporterEmail?'disabled':''}></div></div><div class="actions"><button class="btn primary" id="saveTicket">Wijzigingen opslaan</button>${viewer==='admin'?'<button class="btn danger" id="deleteTicket">Melding verwijderen</button>':''}</div><div class="divider"></div><h3>Melder</h3><p><b>${esc(t.reporter)}</b>${t.reporterEmail?' · '+esc(t.reporterEmail):''}<br><span class="muted">Kan doorgaan: ${esc(t.canContinue)}</span></p>${showAudit?`<div class="divider"></div><h3>Wijzigingsgeschiedenis</h3><div class="timeline">${(t.history||[]).slice().reverse().map(h=>`<div class="timeline-item"><b>${esc(h.action)}</b><div class="tiny muted">${fmt(h.at)} · ${esc(h.actor)}</div></div>`).join('')}</div>`:''}`);
    $('#saveTicket',modal).onclick=()=>{
      const actor=a.name;const changes=[];const oldStatus=t.status;const fields=[['location','#mLocation','Locatie'],['category','#mCategory','Categorie'],['urgency','#mUrgency','Urgentie'],['status','#mStatus','Status'],['assignee','#mAssignee','Toewijzing'],['internalNote','#mNote','Interne notitie']];
      fields.forEach(([key,sel,label])=>{const val=$(sel,modal).value;if(String(t[key]??'')!==String(val)){const old=key==='assignee'?accountName(t[key]):t[key];const neu=key==='assignee'?accountName(val):val;changes.push(`${label}: ${old||'-'} → ${neu||'-'}`);t[key]=val;}});
      const mailFlag=$('#mMailReporter',modal).checked;if(mailFlag!==!!t.mailReporterOnComplete){changes.push(`Melder mailen bij afronding: ${mailFlag?'ja':'nee'}`);t.mailReporterOnComplete=mailFlag;}
      if(changes.length)addHistory(t,actor,changes.join(' | '),a.id);save();
      const shouldPrepare=t.status==='done'&&oldStatus!=='done'&&t.mailReporterOnComplete&&t.reporterEmail&&!t.completionMailPreparedAt;
      if(shouldPrepare){t.completionMailPreparedAt=now();addHistory(t,actor,'Afrondingsmail voor melder voorbereid',a.id);save();openCompletionMail(t,actor);}
      if(viewer==='facility'&&t.assignee&&t.assignee!==a.id)localNotify('Melding toegewezen',`${t.id} is toegewezen aan ${accountName(t.assignee)}`);
      modal.remove();render();
    };
    if(viewer==='admin')$('#deleteTicket',modal).onclick=()=>{if(confirm('Melding definitief uit deze lokale demo verwijderen?')){addAudit(a.name,'ticket',t.id,`Melding verwijderd: ${t.title}`,a.id);db.tickets=db.tickets.filter(x=>x.id!==t.id);save();modal.remove();render();}};
  }

  function openCompletionMail(t,actor){
    const subject=encodeURIComponent(`[${t.id}] Melding afgerond - ${t.title}`);
    const body=encodeURIComponent(`Hallo ${t.reporter},\n\nJe facilitaire melding ${t.id} is afgerond.\n\nMelding: ${t.title}\nLocatie: ${t.location}\nAfgerond door: ${actor}\n\nMet vriendelijke groet,\nFacilitair`);
    setTimeout(()=>{location.href=`mailto:${encodeURIComponent(t.reporterEmail)}?subject=${subject}&body=${body}`;},80);
  }

  function initAuditFilters(){
    const dates=db.auditLog.map(x=>new Date(x.at)).filter(d=>!isNaN(d)); const min=dates.length?new Date(Math.min(...dates)):new Date(); const max=new Date();
    $('#auditFrom').value=min.toISOString().slice(0,10);$('#auditTo').value=max.toISOString().slice(0,10);const draw=()=>renderAuditText(filteredAudit());$('#applyAudit').onclick=draw;$('#auditPdf').onclick=()=>{const entries=filteredAudit();downloadAuditPdf(entries,$('#auditFrom').value,$('#auditTo').value);};draw();
  }
  function filteredAudit(){
    const from=$('#auditFrom')?.value?new Date(`${$('#auditFrom').value}T00:00:00`):new Date(0);const to=$('#auditTo')?.value?new Date(`${$('#auditTo').value}T23:59:59.999`):new Date();return db.auditLog.filter(x=>{const d=new Date(x.at);return d>=from&&d<=to;}).sort((a,b)=>new Date(b.at)-new Date(a.at));
  }
  function renderAuditText(entries){
    const host=$('#auditText');if(!host)return;host.textContent=entries.length?entries.map(x=>`[${fmt(x.at)}] ${x.actor} | ${x.type} ${x.targetId || '-'} | ${x.action}`).join('\n'):'Geen auditregels binnen deze periode.';
  }

  function downloadAuditPdf(entries,from,to){
    const title=`Dalton Meldpunt - Auditlog ${from||''} t/m ${to||''}`.trim();
    const raw=[title,'',...entries.map(x=>`${fmt(x.at)} | ${x.actor} | ${x.type} ${x.targetId||'-'} | ${x.action}`)];
    const lines=[];raw.forEach(line=>wrapPdfText(line,94).forEach(x=>lines.push(x)));
    const pages=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));if(!pages.length)pages.push(['Geen auditregels.']);
    const objects=[];const add=o=>{objects.push(o);return objects.length;};const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const pageIds=[];const contentIds=[];
    pages.forEach((page,pidx)=>{let stream='BT\n/F1 9 Tf\n50 790 Td\n12 TL\n';page.forEach((line,i)=>{const txt=pdfEscape(toLatin1(line));stream+=`(${txt}) Tj\n`;if(i<page.length-1)stream+='T*\n';});stream+='ET';const cid=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);contentIds.push(cid);pageIds.push(add('PAGE_PLACEHOLDER'));});
    const pagesId=objects.length+1;add('PAGES_PLACEHOLDER');const catalogId=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    pageIds.forEach((pid,i)=>{objects[pid-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;});
    objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(x=>`${x} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    downloadBlob(new Blob([pdf],{type:'application/pdf'}),`auditlog-${from||'begin'}-tot-${to||'eind'}.pdf`);
  }
  function wrapPdfText(text,max){const words=String(text).replace(/\s+/g,' ').split(' ');const out=[];let line='';for(const w of words){if((line+' '+w).trim().length>max){out.push(line||w);line=line?w:'';}else line=(line+' '+w).trim();}if(line)out.push(line);return out;}
  function toLatin1(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');}
  function pdfEscape(s){return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}

  function makeModal(inner){
    const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><button class="btn ghost small close">Sluiten</button>${inner}</div>`;document.body.appendChild(modal);$('.close',modal).onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove();};return modal;
  }
  function compressImage(file,max=1200,quality=.72){return new Promise((resolve,reject)=>{const img=new Image();const r=new FileReader();r.onload=()=>{img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',quality));};img.onerror=reject;img.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
  function downloadBlob(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function downloadJSON(obj,name){downloadBlob(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),name);}

  function handleSetupLink(){
    const encoded=params.get('setup');if(!encoded)return false;let data;try{data=JSON.parse(decodeURIComponent(escape(atob(encoded))));}catch{return false;}
    const existing=db.accounts.find(a=>a.username.toUpperCase()===String(data.username).toUpperCase());
    shell(`<div class="auth-wrap"><section class="card auth-card"><h2>${data.mode==='reset'?'Wachtwoord opnieuw instellen':'Account activeren'}</h2><p><b>${esc(data.name)}</b><br><span class="code">${esc(data.username)}</span></p><div class="notice inner-notice">Prototype: deze link maakt of wijzigt het account alleen op dit apparaat. In de uiteindelijke gedeelde versie werkt dit centraal.</div><form id="setupForm"><label class="req">Nieuw persoonlijk wachtwoord</label><input name="password" type="password" minlength="8" required><label class="req">Herhaal wachtwoord</label><input name="repeat" type="password" minlength="8" required><div class="actions"><button class="btn primary" type="submit">Account opslaan</button></div></form></section></div>`,{notice:false});
    $('#setupForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);if(f.get('password')!==f.get('repeat'))return alert('De wachtwoorden zijn niet gelijk.');let a=existing;if(!a){a={id:uid('u'),name:data.name,username:String(data.username).toUpperCase(),email:data.email||'',role:data.role||'facility',active:true,salt:'',passwordHash:'',mustSetPassword:false,createdAt:now(),updatedAt:now()};db.accounts.push(a);}await setPassword(a,String(f.get('password')));a.active=true;addAudit(a.name,'account',a.id,data.mode==='reset'?'Wachtwoord ingesteld via resetlink':'Account geactiveerd via uitnodiging',a.id);save();history.replaceState({},'',location.pathname);showLogin('Account opgeslagen. Je kunt nu inloggen.');};return true;
  }

  function render(){
    if(handleSetupLink())return;
    const a=currentAccount(); if(session && (!a || !a.active)){setSession(null);publicView=true;}
    if(publicView || !currentAccount()) staffView(); else if(currentAccount().role==='admin') adminView(); else if(currentAccount().role==='facility') facilityView(); else staffView();
  }

  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  ensureDemoPasswords().then(render);
})();
