(() => {
  const C = window.DALTON_CONFIG;
  const DB_KEY = 'dalton_meldpunt_v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const now = () => new Date().toISOString();
  const fmt = iso => new Intl.DateTimeFormat('nl-NL',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso));
  const id = () => Math.random().toString(36).slice(2,7).toUpperCase();

  const defaultDB = () => ({
    staff:[
      {id:'u-admin',name:C.defaultAdminName,role:'admin',active:true},
      {id:'u-fac1',name:'Conciërge 1',role:'facility',active:true},
      {id:'u-fac2',name:'Facilitair 1',role:'facility',active:true}
    ],
    settings:{showAuditToFacility:false,emailOnNew:true,localNotifications:true},
    routing:{'Gebouw / onderhoud':'u-fac1','Deuren / sloten / toegang':'u-fac1','Voorraad / materialen':'u-fac2'},
    tickets:[
      {id:'M-2026-001',createdAt:now(),updatedAt:now(),reporter:'Demo docent',reporterEmail:'',location:'B-vleugel',room:'B1.14',category:'Gebouw / onderhoud',urgency:'hoog',title:'Deurdranger sluit niet goed',description:'De deur blijft regelmatig half open staan.',canContinue:'ja',photo:null,status:'open',assignee:'u-fac1',internalNote:'',history:[{at:now(),actor:'Systeem',action:'Melding aangemaakt'}]},
      {id:'M-2026-002',createdAt:now(),updatedAt:now(),reporter:'Demo docent',reporterEmail:'',location:'Mediatheek',room:'',category:'Meubilair',urgency:'normaal',title:'Losse tafelpoot',description:'Tafel bij het raam wiebelt sterk.',canContinue:'ja',photo:null,status:'progress',assignee:'u-fac2',internalNote:'Onderdeel controleren.',history:[{at:now(),actor:'Systeem',action:'Melding aangemaakt'}]}
    ]
  });
  const load = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB(); } catch { return defaultDB(); } };
  let db = load();
  const save = () => { localStorage.setItem(DB_KEY, JSON.stringify(db)); updateBadge(); };
  if (!localStorage.getItem(DB_KEY)) save();

  const params = new URLSearchParams(location.search);
  let role = params.get('view') === 'facilitair' ? 'facility' : params.get('view') === 'beheer' ? 'admin' : 'staff';
  let currentFacilityId = 'u-fac1';

  const statuses = {open:'Open',progress:'In behandeling',wait:'Wacht / gepland',done:'Afgerond'};
  const urgencyLabel = {laag:'Laag',normaal:'Normaal',hoog:'Hoog',spoed:'Spoed'};

  function activeStaff(){ return db.staff.filter(x=>x.active && x.role==='facility'); }
  function staffName(uid){ return db.staff.find(x=>x.id===uid)?.name || 'Niet toegewezen'; }
  function openCountFor(uid){ return db.tickets.filter(t=>t.status!=='done' && (!uid || t.assignee===uid)).length; }
  async function updateBadge(){
    const n = role==='facility' ? openCountFor(currentFacilityId) : role==='admin' ? db.tickets.filter(t=>t.status!=='done').length : 0;
    try { if ('setAppBadge' in navigator) n ? await navigator.setAppBadge(n) : await navigator.clearAppBadge(); } catch {}
  }
  function localNotify(title, body){
    if (!db.settings.localNotifications || !('Notification' in window) || Notification.permission!=='granted') return;
    try { new Notification(title,{body,icon:'assets/icon-192.png'}); } catch {}
  }
  function routeAssignment(category){ return db.routing[category] || ''; }
  function ticketNum(){ const n = db.tickets.length+1; return `M-${new Date().getFullYear()}-${String(n).padStart(3,'0')}`; }
  function addHistory(t, actor, action){ t.history = t.history || []; t.history.push({at:now(),actor,action}); t.updatedAt = now(); }

  function roleNav(){
    const b = (r,l,icon) => `<button data-role="${r}" class="${role===r?'active':''}">${icon} ${l}</button>`;
    return `<div class="role-switch desktop-role">${b('staff','Melden','✍️')}${b('facility','Facilitair','🧰')}${b('admin','Beheer','⚙️')}</div>`;
  }
  function bottomNav(){
    const b = (r,l,icon) => `<button data-role="${r}" class="${role===r?'active':''}"><div>${icon}</div>${l}</button>`;
    return `<nav class="bottomnav">${b('staff','Melden','✍️')}${b('facility','Facilitair','🧰')}${b('admin','Beheer','⚙️')}</nav>`;
  }
  function shell(content){
    $('#app').innerHTML = `<div class="shell"><header class="topbar"><div class="brand"><div class="logo">🔧</div><div><h1>${esc(C.appName)}</h1><p>${esc(C.schoolName)}</p></div></div>${roleNav()}</header><div class="notice">Prototype v1 - nog zonder schoollogin of gedeelde backend. Gebruik voorlopig alleen testgegevens.</div>${content}</div>${bottomNav()}`;
    document.querySelectorAll('[data-role]').forEach(btn=>btn.addEventListener('click',()=>{role=btn.dataset.role; history.replaceState({},'', role==='staff'?'./':`?view=${role==='facility'?'facilitair':'beheer'}`); render();}));
    updateBadge();
  }

  function staffView(){
    const preLoc = params.get('locatie') || '';
    const locOptions = ['','...'].slice(0,1).concat(C.locations).map(x=>`<option ${x===preLoc?'selected':''}>${esc(x)}</option>`).join('');
    const catOptions = C.categories.map(x=>`<option>${esc(x)}</option>`).join('');
    shell(`<div class="grid">
      <section class="card hero span-5"><h2>Iets kapot of iets nodig?</h2><p class="sub">Maak in minder dan een minuut een facilitaire melding. Voeg indien nuttig direct een foto toe.</p><div class="divider" style="background:rgba(255,255,255,.2)"></div><p>Na verzenden krijg je meteen een meldingsnummer. De melding kan vervolgens door facilitair worden opgepakt en toegewezen.</p><p class="tiny">Bij spoed of direct gevaar: volg altijd de interne noodprocedure en neem direct contact op met de daarvoor aangewezen collega.</p></section>
      <section class="card span-7"><h2>Nieuwe melding</h2><p class="sub">Velden met * zijn verplicht.</p>
        <form id="reportForm">
          <div class="row"><div><label class="req">Naam</label><input name="reporter" required placeholder="Voor- en achternaam"></div><div><label>E-mailadres</label><input name="email" type="email" placeholder="naam@school.nl"></div></div>
          <div class="row"><div><label class="req">Locatie</label><select name="location" required>${locOptions}</select></div><div><label>Lokaal / ruimte</label><input name="room" value="${esc(params.get('ruimte')||'')}" placeholder="Bijv. B1.14"></div></div>
          <div class="row"><div><label class="req">Categorie</label><select name="category" required>${catOptions}</select></div><div><label class="req">Urgentie</label><select name="urgency" required><option value="laag">Laag</option><option value="normaal" selected>Normaal</option><option value="hoog">Hoog</option><option value="spoed">Spoed</option></select></div></div>
          <label class="req">Korte titel</label><input name="title" required maxlength="90" placeholder="Bijv. deurklink zit los">
          <label class="req">Wat is er aan de hand?</label><textarea name="description" required placeholder="Omschrijf kort wat er kapot is, ontbreekt of aandacht nodig heeft."></textarea>
          <label>Kan de les / het werk hier doorgaan?</label><select name="canContinue"><option value="ja">Ja</option><option value="beperkt">Beperkt</option><option value="nee">Nee</option><option value="nvt">Niet van toepassing</option></select>
          <label>Foto maken of toevoegen</label><input id="photoInput" type="file" accept="image/*" capture="environment"><img id="photoPreview" class="photo-preview" hidden alt="Voorbeeld foto">
          <div class="actions"><button class="btn primary" type="submit">Melding versturen</button><button class="btn secondary" type="button" id="notifyBtn">Meldingen op dit toestel toestaan</button></div>
        </form>
        <div id="formResult" style="margin-top:14px"></div>
      </section>
    </div>`);
    let photoData = null;
    $('#photoInput').addEventListener('change', async e=>{
      const file=e.target.files?.[0]; if(!file) return;
      photoData = await compressImage(file, 1200, .72);
      $('#photoPreview').src=photoData; $('#photoPreview').hidden=false;
    });
    $('#notifyBtn').addEventListener('click', async()=>{
      if(!('Notification' in window)) return alert('Deze browser ondersteunt geen webmeldingen.');
      const p=await Notification.requestPermission(); alert(p==='granted'?'Meldingen zijn toegestaan.':'Meldingen zijn niet toegestaan.');
    });
    $('#reportForm').addEventListener('submit', e=>{
      e.preventDefault(); const f=new FormData(e.target); const category=f.get('category');
      const t={id:ticketNum(),createdAt:now(),updatedAt:now(),reporter:f.get('reporter'),reporterEmail:f.get('email'),location:f.get('location'),room:f.get('room'),category,urgency:f.get('urgency'),title:f.get('title'),description:f.get('description'),canContinue:f.get('canContinue'),photo:photoData,status:'open',assignee:routeAssignment(category),internalNote:'',history:[]};
      addHistory(t,'Melder','Melding aangemaakt'); if(t.assignee) addHistory(t,'Systeem',`Automatisch toegewezen aan ${staffName(t.assignee)}`);
      db.tickets.unshift(t); save();
      const subject=encodeURIComponent(`[${t.id}] ${t.title}`); const body=encodeURIComponent(`Nieuwe facilitaire melding\n\nMeldingsnummer: ${t.id}\nMelder: ${t.reporter}\nLocatie: ${t.location}${t.room?' - '+t.room:''}\nCategorie: ${t.category}\nUrgentie: ${urgencyLabel[t.urgency]}\n\n${t.description}\n\nBekijk en behandel de melding in ${C.appName}.`);
      $('#formResult').innerHTML=`<div class="success"><b>Melding ${esc(t.id)} is opgeslagen.</b><br>Toegewezen aan: ${esc(staffName(t.assignee))}.<div class="actions"><a class="btn secondary" href="mailto:${encodeURIComponent(C.conciergeEmail)}?subject=${subject}&body=${body}">E-mailmelding openen</a><button class="btn ghost" id="newReport">Nog een melding</button></div><div class="tiny muted">In deze prototypeversie opent e-mail als concept. Automatisch mailen komt bij de backend-koppeling.</div></div>`;
      e.target.reset(); photoData=null; $('#photoPreview').hidden=true;
      $('#newReport').onclick=()=>{ $('#formResult').innerHTML=''; scrollTo({top:0,behavior:'smooth'}); };
      localNotify('Nieuwe melding opgeslagen',`${t.id} - ${t.title}`);
    });
  }

  function facilityView(){
    const options=activeStaff().map(s=>`<option value="${s.id}" ${s.id===currentFacilityId?'selected':''}>${esc(s.name)}</option>`).join('');
    const mine=db.tickets.filter(t=>t.assignee===currentFacilityId && t.status!=='done');
    const unassigned=db.tickets.filter(t=>!t.assignee && t.status!=='done').length;
    const urgent=mine.filter(t=>t.urgency==='spoed'||t.urgency==='hoog').length;
    shell(`<div class="grid">
      <section class="card hero span-12"><div class="toolbar"><div class="grow"><h2>Facilitair dashboard</h2><p class="sub">Openstaande meldingen en toewijzingen.</p></div><select id="facilityUser">${options}</select></div><div class="kpis"><div class="kpi"><span>Aan mij</span><b>${mine.length}</b></div><div class="kpi"><span>Hoog/spoed</span><b>${urgent}</b></div><div class="kpi"><span>Niet toegewezen</span><b>${unassigned}</b></div><div class="kpi"><span>Afgerond</span><b>${db.tickets.filter(t=>t.assignee===currentFacilityId&&t.status==='done').length}</b></div><div class="kpi"><span>Totaal open</span><b>${db.tickets.filter(t=>t.status!=='done').length}</b></div></div></section>
      <section class="card span-12"><div class="toolbar"><h3 class="grow">Meldingen</h3><input id="search" placeholder="Zoeken..."><select id="statusFilter"><option value="openall">Alle open</option><option value="mine">Aan mij</option><option value="unassigned">Niet toegewezen</option><option value="done">Afgerond</option></select></div><div id="ticketList" class="list" style="margin-top:12px"></div></section>
    </div>`);
    $('#facilityUser').onchange=e=>{currentFacilityId=e.target.value;render();};
    const paint=()=>{
      const q=$('#search').value.toLowerCase(); const f=$('#statusFilter').value;
      let items=db.tickets.filter(t=>`${t.id} ${t.title} ${t.location} ${t.room} ${t.category}`.toLowerCase().includes(q));
      if(f==='openall') items=items.filter(t=>t.status!=='done'); if(f==='mine') items=items.filter(t=>t.assignee===currentFacilityId&&t.status!=='done'); if(f==='unassigned') items=items.filter(t=>!t.assignee&&t.status!=='done'); if(f==='done') items=items.filter(t=>t.status==='done');
      $('#ticketList').innerHTML=items.length?items.map(ticketCard).join(''):'<div class="empty">Geen meldingen gevonden.</div>';
      document.querySelectorAll('[data-ticket]').forEach(x=>x.onclick=()=>openTicket(x.dataset.ticket,'facility'));
    };
    $('#search').oninput=paint; $('#statusFilter').onchange=paint; paint();
  }

  function adminView(){
    const open=db.tickets.filter(t=>t.status!=='done');
    const high=open.filter(t=>['hoog','spoed'].includes(t.urgency));
    const today=new Date().toDateString(); const todayN=db.tickets.filter(t=>new Date(t.createdAt).toDateString()===today).length;
    shell(`<div class="grid">
      <section class="card hero span-12"><h2>Hoofdbeheer</h2><p class="sub">Volledig overzicht, routering, medewerkers en auditlog.</p><div class="kpis"><div class="kpi"><span>Vandaag</span><b>${todayN}</b></div><div class="kpi"><span>Open</span><b>${open.length}</b></div><div class="kpi"><span>Hoog/spoed</span><b>${high.length}</b></div><div class="kpi"><span>Afgerond</span><b>${db.tickets.filter(t=>t.status==='done').length}</b></div><div class="kpi"><span>Niet toegewezen</span><b>${open.filter(t=>!t.assignee).length}</b></div></div></section>
      <section class="card span-8"><div class="toolbar"><h3 class="grow">Alle meldingen</h3><input id="adminSearch" placeholder="Zoeken..."></div><div id="adminTickets" class="list" style="margin-top:12px"></div></section>
      <section class="card span-4"><h3>Automatische toewijzing</h3><p class="sub">Nieuwe meldingen van een categorie worden standaard aan deze medewerker toegewezen.</p><div id="routing"></div></section>
      <section class="card span-6"><h3>Facilitair medewerkers</h3><div id="staffList"></div><div class="divider"></div><div class="row"><input id="newStaffName" placeholder="Naam medewerker"><button id="addStaff" class="btn secondary">Medewerker toevoegen</button></div></section>
      <section class="card span-6"><h3>Instellingen & gegevens</h3><div class="settings-group"><div class="toggle"><div><b>Auditlog zichtbaar voor facilitair</b><div class="tiny muted">Voorbereid voor later; staat standaard uit.</div></div><input type="checkbox" id="auditToggle" ${db.settings.showAuditToFacility?'checked':''}></div></div><div class="settings-group"><div class="toggle"><div><b>Lokale browsermeldingen</b><div class="tiny muted">Alleen op dit apparaat en alleen tijdens testen.</div></div><input type="checkbox" id="notifyToggle" ${db.settings.localNotifications?'checked':''}></div></div><div class="actions"><button id="exportData" class="btn ghost">Export JSON</button><label class="btn ghost" style="cursor:pointer">Import JSON<input id="importData" type="file" accept="application/json" hidden></label><button id="resetDemo" class="btn danger">Demo resetten</button></div></section>
    </div>`);
    const renderAdminList=()=>{const q=$('#adminSearch').value.toLowerCase(); const items=db.tickets.filter(t=>`${t.id} ${t.title} ${t.reporter} ${t.location} ${t.room} ${t.category}`.toLowerCase().includes(q)); $('#adminTickets').innerHTML=items.length?items.map(ticketCard).join(''):'<div class="empty">Geen meldingen.</div>'; document.querySelectorAll('[data-ticket]').forEach(x=>x.onclick=()=>openTicket(x.dataset.ticket,'admin'));};
    $('#adminSearch').oninput=renderAdminList; renderAdminList();
    renderRouting(); renderStaff();
    $('#auditToggle').onchange=e=>{db.settings.showAuditToFacility=e.target.checked;save();};
    $('#notifyToggle').onchange=e=>{db.settings.localNotifications=e.target.checked;save();};
    $('#addStaff').onclick=()=>{const name=$('#newStaffName').value.trim(); if(!name)return; db.staff.push({id:'u-'+id().toLowerCase(),name,role:'facility',active:true});save();render();};
    $('#exportData').onclick=()=>downloadJSON(db,'dalton-meldpunt-backup.json');
    $('#importData').onchange=async e=>{try{const txt=await e.target.files[0].text(); const incoming=JSON.parse(txt); if(!incoming.tickets||!incoming.staff)throw 0; db=incoming;save();render();}catch{alert('Dit JSON-bestand lijkt geen geldige backup.');}};
    $('#resetDemo').onclick=()=>{if(confirm('Alle lokale testgegevens verwijderen en demo opnieuw starten?')){db=defaultDB();save();render();}};
  }

  function renderRouting(){
    const fac=activeStaff(); const html=C.categories.map(cat=>`<div class="settings-group"><label style="margin-top:0">${esc(cat)}</label><select data-route="${esc(cat)}"><option value="">Niet automatisch</option>${fac.map(s=>`<option value="${s.id}" ${db.routing[cat]===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`).join('');
    $('#routing').innerHTML=html; document.querySelectorAll('[data-route]').forEach(s=>s.onchange=()=>{db.routing[s.dataset.route]=s.value;save();});
  }
  function renderStaff(){
    const rows=activeStaff().map(s=>`<div class="settings-group"><div class="toggle"><div><b>${esc(s.name)}</b><div class="tiny muted">${openCountFor(s.id)} open meldingen</div></div><button class="btn danger small" data-remove-staff="${s.id}">Deactiveren</button></div></div>`).join('');
    $('#staffList').innerHTML=rows || '<div class="empty">Geen facilitaire medewerkers.</div>';
    document.querySelectorAll('[data-remove-staff]').forEach(b=>b.onclick=()=>{const s=db.staff.find(x=>x.id===b.dataset.removeStaff); if(s){s.active=false;db.tickets.filter(t=>t.assignee===s.id&&t.status!=='done').forEach(t=>{t.assignee='';addHistory(t,C.defaultAdminName,`${s.name} gedeactiveerd; toewijzing verwijderd`);});save();render();}});
  }

  function ticketCard(t){
    return `<div class="ticket" data-ticket="${t.id}"><div class="ticket-head"><div><div class="ticket-title">${esc(t.id)} · ${esc(t.title)}</div><div class="ticket-meta">${esc(t.location)}${t.room?' · '+esc(t.room):''} · ${esc(t.category)} · ${fmt(t.createdAt)}</div></div><div class="chips"><span class="chip ${t.urgency}">${urgencyLabel[t.urgency]}</span><span class="chip ${t.status}">${statuses[t.status]}</span></div></div><div class="ticket-desc">${esc(t.description).slice(0,180)}${t.description.length>180?'…':''}</div><div class="ticket-meta">Toegewezen aan: <b>${esc(staffName(t.assignee))}</b></div></div>`;
  }

  function openTicket(ticketId, viewer){
    const t=db.tickets.find(x=>x.id===ticketId); if(!t)return;
    const fac=activeStaff(); const showAudit=viewer==='admin'||db.settings.showAuditToFacility;
    const modal=document.createElement('div'); modal.className='modal-backdrop';
    modal.innerHTML=`<div class="modal"><button class="btn ghost small close">Sluiten</button><h2>${esc(t.id)} · ${esc(t.title)}</h2><div class="chips"><span class="chip ${t.urgency}">${urgencyLabel[t.urgency]}</span><span class="chip ${t.status}">${statuses[t.status]}</span></div><p>${esc(t.description)}</p>${t.photo?`<img class="photo-preview" src="${t.photo}" alt="Foto bij melding">`:''}<div class="grid"><div class="span-6"><label>Locatie</label><input id="mLocation" value="${esc(t.location)}"><label>Ruimte</label><input id="mRoom" value="${esc(t.room)}"><label>Categorie</label><select id="mCategory">${C.categories.map(c=>`<option ${c===t.category?'selected':''}>${esc(c)}</option>`).join('')}</select><label>Urgentie</label><select id="mUrgency">${Object.entries(urgencyLabel).map(([k,v])=>`<option value="${k}" ${k===t.urgency?'selected':''}>${v}</option>`).join('')}</select></div><div class="span-6"><label>Status</label><select id="mStatus">${Object.entries(statuses).map(([k,v])=>`<option value="${k}" ${k===t.status?'selected':''}>${v}</option>`).join('')}</select><label>Toewijzen aan</label><select id="mAssignee"><option value="">Niet toegewezen</option>${fac.map(s=>`<option value="${s.id}" ${s.id===t.assignee?'selected':''}>${esc(s.name)}</option>`).join('')}</select><label>Interne notitie</label><textarea id="mNote">${esc(t.internalNote||'')}</textarea></div></div><div class="actions"><button class="btn primary" id="saveTicket">Wijzigingen opslaan</button>${viewer==='admin'?'<button class="btn danger" id="deleteTicket">Melding verwijderen</button>':''}</div><div class="divider"></div><h3>Melder</h3><p><b>${esc(t.reporter)}</b>${t.reporterEmail?' · '+esc(t.reporterEmail):''}<br><span class="muted">Kan doorgaan: ${esc(t.canContinue)}</span></p>${showAudit?`<div class="divider"></div><h3>Wijzigingsgeschiedenis</h3><div class="timeline">${(t.history||[]).slice().reverse().map(h=>`<div class="timeline-item"><b>${esc(h.action)}</b><div class="tiny muted">${fmt(h.at)} · ${esc(h.actor)}</div></div>`).join('')}</div>`:''}</div>`;
    document.body.appendChild(modal); modal.querySelector('.close').onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.querySelector('#saveTicket').onclick=()=>{
      const actor=viewer==='admin'?C.defaultAdminName:staffName(currentFacilityId); const changes=[];
      const fields=[['location','#mLocation'],['room','#mRoom'],['category','#mCategory'],['urgency','#mUrgency'],['status','#mStatus'],['assignee','#mAssignee'],['internalNote','#mNote']];
      fields.forEach(([key,sel])=>{const val=modal.querySelector(sel).value; if(String(t[key]??'')!==String(val)){const old=key==='assignee'?staffName(t[key]):t[key]; const neu=key==='assignee'?staffName(val):val; changes.push(`${key}: ${old||'-'} → ${neu||'-'}`); t[key]=val;}});
      if(changes.length){addHistory(t,actor,changes.join(' | ')); save(); if(viewer!=='admin' && t.assignee && t.assignee!==currentFacilityId)localNotify('Melding toegewezen',`${t.id} is toegewezen aan ${staffName(t.assignee)}`);}
      modal.remove();render();
    };
    if(viewer==='admin') modal.querySelector('#deleteTicket').onclick=()=>{if(confirm('Melding definitief uit deze lokale demo verwijderen?')){db.tickets=db.tickets.filter(x=>x.id!==t.id);save();modal.remove();render();}};
  }

  function compressImage(file,max=1200,quality=.72){return new Promise((resolve,reject)=>{const img=new Image();const r=new FileReader();r.onload=()=>{img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',quality));};img.onerror=reject;img.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
  function downloadJSON(obj,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
  function render(){ if(role==='staff')staffView(); else if(role==='facility')facilityView(); else adminView(); }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  render();
})();
