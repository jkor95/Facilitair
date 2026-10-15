import { createClient } from 'npm:@supabase/supabase-js@2.95.0'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const SUPABASE_SECRET_KEY = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const MASTER_KEY_B64 = Deno.env.get('DALTON_MASTER_KEY') || ''
const APP_BASE_URL = Deno.env.get('DALTON_APP_URL') || ''

if (new URL(SUPABASE_URL).hostname !== 'xmmrplvhkfvyfqwjrugl.supabase.co') throw new Error('Verkeerd Supabase-project: uitsluitend Dalton meldpunt toegestaan')

if (!SUPABASE_SECRET_KEY) throw new Error('Supabase secret key ontbreekt')
if (!MASTER_KEY_B64) throw new Error('DALTON_MASTER_KEY ontbreekt')

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})


const DEFAULT_ROLE_PERMISSIONS:any = {
  facility: { viewAllTickets:true, viewReporter:true, viewPhoto:true, viewAssignment:true, viewInternalNote:true, viewHistory:false, notifications:true, editTitle:true, editLocation:true, editCategory:true, editUrgency:true, editStatus:true, editPlannedFor:true, editAssignment:true, editInternalNote:true, deleteTicket:false },
  concierge: { viewAllTickets:true, viewReporter:true, viewPhoto:true, viewAssignment:true, viewInternalNote:true, viewHistory:false, notifications:true, editTitle:true, editLocation:true, editCategory:true, editUrgency:true, editStatus:true, editPlannedFor:true, editAssignment:true, editInternalNote:true, deleteTicket:false },
}
const DEFAULT_SETTINGS:any = {
  showAuditToFacility:false,
  localNotifications:true,
  publicAccessGateEnabled:false,
  publicAccessWordHash:'',
  publicAccessWordDisplay:'',
  publicOutageOverview:true,
  publicOutageCategories:null,
  publicOutageStatuses:null,
  publicOutageSort:'category',
  publicOutageCategoryOrder:null,
  publicPageSectionOrder:['hero','outages','form'],
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  accountRoleOverrides:{},
  delegatedAdminPermissions:{},
  categories:['Gebouw / onderhoud','Deuren / sloten / toegang','Meubilair','Schoonmaak','Voorraad / materialen','Veiligheid','ICT / apparatuur','Sanitair','Verlichting / elektra','Overig'],
  reportLocationExamples:['003','105','225','Personeelswerkkamer','Mediatheek','Docentenkamer'],
  reportTitleExamples:['Docking werkt niet','Lamp kapot','Stoel defect','Deurklink zit los','Stopcontact werkt niet'],
  reportHeroTitle:'Facilitaire melding',
  reportHeroIntro:'Iets kapot, vies, leeg of onveilig? Meld het hier snel bij facilitair.',
  reportHeroLocation:'Vul de locatie zo duidelijk mogelijk in, bijvoorbeeld {locaties}.',
  reportHeroEmergency:'Bij direct gevaar of spoed: volg altijd de interne noodprocedure en neem direct persoonlijk contact op.',
  reportHeroTitleSize:30, reportHeroIntroSize:14, reportHeroLocationSize:16, reportHeroEmergencySize:12,
}
function normalizeRolePermissions(input:any){
  const out:any = {}
  for (const role of ['facility','concierge']) {
    out[role] = { ...DEFAULT_ROLE_PERMISSIONS[role], ...(input?.[role] || {}) }
    if (out[role].editAssignment) out[role].viewAssignment = true
    if (out[role].editInternalNote) out[role].viewInternalNote = true
  }
  return out
}
async function loadSettingsObj(){
  const { data, error } = await db.from('dm_settings').select('*')
  if (error) throw error
  const out:any = { ...DEFAULT_SETTINGS, rolePermissions:normalizeRolePermissions(null), accountRoleOverrides:{} }
  for (const row of data || []) out[row.key] = row.value
  out.rolePermissions = normalizeRolePermissions(out.rolePermissions)
  if (!out.accountRoleOverrides || typeof out.accountRoleOverrides !== 'object' || Array.isArray(out.accountRoleOverrides)) out.accountRoleOverrides = {}
  if (!out.delegatedAdminPermissions || typeof out.delegatedAdminPermissions !== 'object' || Array.isArray(out.delegatedAdminPermissions)) out.delegatedAdminPermissions = {}
  return out
}
async function saveSetting(key:string,value:any){
  // A null setting means: remove the override and fall back to the central default.
  // dm_settings.value is NOT NULL, so writing JavaScript null would fail.
  if (value === null) {
    const { error } = await db.from('dm_settings').delete().eq('key', key)
    if (error) throw new Error(error.message || JSON.stringify(error))
    return
  }
  const { error } = await db.from('dm_settings').upsert({ key, value, updated_at:new Date().toISOString() })
  if (error) throw new Error(error.message || JSON.stringify(error))
}
function effectiveRole(account:any, settings:any){
  const override = settings?.accountRoleOverrides?.[account?.id]
  return override === 'concierge' ? 'concierge' : account?.role
}
function permissionsFor(role:string, settings:any){
  if (role === 'admin') return new Proxy({}, { get:()=>true })
  return normalizeRolePermissions(settings?.rolePermissions)[role] || {}
}
function isOperationalRole(role:string){ return role === 'facility' || role === 'concierge' }
const DEFAULT_ADMIN_FUNCTIONS:any = { manageRouting:false,manageAccounts:false,manageRolePermissions:false,manageGeneralSettings:false,manageCategories:false,manageTicketNumbering:false,viewSystemStatus:false,managePublicAccess:false,manageReportPage:false,managePublicOverview:false,viewAuditLog:false }
function adminFunctionsFor(account:any, settings:any){ if(account?.role==='admin') return new Proxy({}, {get:()=>true}); const raw=settings?.delegatedAdminPermissions?.[account?.id]; return { ...DEFAULT_ADMIN_FUNCTIONS, ...(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) } }
function hasAdminFunction(account:any, settings:any, key:string){ return account?.role==='admin' || !!adminFunctionsFor(account,settings)[key] }
function ticketVisibleFor(account:any, role:string, perms:any, ticket:any, assigneeIds:string[]){
  if (role === 'admin') return true
  if (!isOperationalRole(role)) return false
  // Facilitair en Conciërge gebruiken één helder zichtrecht. Als dit aan staat,
  // ontvangen zij alle open én afgeronde meldingen. Bewerkrechten blijven apart.
  return perms.viewAllTickets !== false
}
async function setAccountRoleOverride(accountId:string, requestedRole:string){
  const settings = await loadSettingsObj()
  const overrides = { ...(settings.accountRoleOverrides || {}) }
  if (requestedRole === 'concierge') overrides[accountId] = 'concierge'
  else delete overrides[accountId]
  await saveSetting('accountRoleOverrides', overrides)
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function b64(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function unb64(s: string) {
  const raw = atob(s)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}
function hex(bytes: ArrayBuffer | Uint8Array) {
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return [...a].map(x => x.toString(16).padStart(2, '0')).join('')
}
function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes))
  return b64(a).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
async function sha256(text: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}
function normalizeAccessWord(value:any){ return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('nl-NL') }
async function accessWordHash(value:any){ return sha256(`meldpunt-vwo-public-access:v1:${normalizeAccessWord(value)}`) }
async function createPublicAccessToken(wordHash:string){
  const iv=crypto.getRandomValues(new Uint8Array(12))
  const payload=enc.encode(JSON.stringify({h:wordHash,exp:Date.now()+12*60*60*1000}))
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await masterKey(),payload)
  return `${b64(iv)}.${b64(new Uint8Array(cipher))}`
}
async function verifyPublicAccessToken(token:any,currentHash:string){
  try{
    const [ivB64,cipherB64]=String(token||'').split('.')
    if(!ivB64||!cipherB64)return false
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(ivB64)},await masterKey(),unb64(cipherB64))
    const data=JSON.parse(dec.decode(plain))
    return data?.h===currentHash&&Number(data?.exp)>Date.now()
  }catch{return false}
}
async function requirePublicAccess(payload:any,settings:any){
  if(settings.publicAccessGateEnabled!==true)return
  const currentHash=String(settings.publicAccessWordHash||'')
  if(!currentHash)throw new Error('De melderspagina is beveiligd maar er is geen maandwoord ingesteld. Neem contact op met de beheerder.')
  if(!await verifyPublicAccessToken(payload?.accessToken,currentHash))throw new Error('Geen geldige toegang tot de melderspagina. Vul het maandwoord opnieuw in.')
}
async function derivePassword(password: string, saltB64: string) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 160000, hash: 'SHA-256' }, keyMaterial, 256)
  return hex(bits)
}
async function masterKey() {
  const raw = unb64(MASTER_KEY_B64)
  if (raw.length !== 32) throw new Error('DALTON_MASTER_KEY moet 32 bytes base64 zijn')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
async function encryptPassword(password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await masterKey(), enc.encode(password))
  return { cipher: b64(new Uint8Array(cipher)), iv: b64(iv) }
}
async function decryptPassword(cipherB64: string, ivB64: string) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, await masterKey(), unb64(cipherB64))
  return dec.decode(plain)
}
async function passwordFields(password: string) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await derivePassword(password, salt)
  const e = await encryptPassword(password)
  return { password_hash: hash, password_salt: salt, password_cipher: e.cipher, password_iv: e.iv }
}

async function audit(actor: string, actorId: string | null, type: string, targetId: string, action: string) {
  await db.from('dm_audit_logs').insert({ actor, actor_id: actorId, type, target_id: targetId || '', action })
}
async function history(ticketId: number, actor: string, actorId: string | null, action: string) {
  await db.from('dm_ticket_history').insert({ ticket_id: ticketId, actor, actor_id: actorId, action })
  await audit(actor, actorId, 'ticket', String(ticketId), action)
}

async function ensureAdmin() {
  const { data: existing, error } = await db.from('dm_accounts').select('id').limit(1)
  if (error) throw error
  if (existing && existing.length) return
  const p = await passwordFields('Admin')
  const { data: account, error: insErr } = await db.from('dm_accounts').insert({
    name: 'Jeremy', username: 'Admin', username_key: 'admin', email: '', role: 'admin', active: true, ...p,
  }).select('id,name').single()
  if (insErr) throw insErr
  await audit('Systeem', null, 'account', account.id, 'Eerste hoofdbeheeraccount Admin aangemaakt')
}

async function authenticate(req: Request, roles?: string[]) {
  const h = req.headers.get('Authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
  if (!token) return null
  const tokenHash = await sha256(token)
  const { data: session } = await db.from('dm_sessions').select('account_id,expires_at').eq('token_hash', tokenHash).maybeSingle()
  if (!session || new Date(session.expires_at) <= new Date()) return null
  const { data: account } = await db.from('dm_accounts').select('*').eq('id', session.account_id).eq('active', true).maybeSingle()
  if (!account) return null
  if (roles && !roles.includes(account.role)) return null
  return account
}

async function login(username: string, password: string) {
  await ensureAdmin()
  const key = String(username || '').trim().toLowerCase()
  const { data: account } = await db.from('dm_accounts').select('*').eq('username_key', key).eq('active', true).maybeSingle()
  if (!account) return null
  const hash = await derivePassword(String(password || ''), account.password_salt)
  if (hash !== account.password_hash) return null
  const token = randomToken(32)
  const tokenHash = await sha256(token)
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()
  await db.from('dm_sessions').delete().eq('account_id', account.id).lt('expires_at', new Date().toISOString())
  const { error } = await db.from('dm_sessions').insert({ account_id: account.id, token_hash: tokenHash, expires_at: expires })
  if (error) throw error
  const settings = await loadSettingsObj()
  const clientAccount = { ...account, role:effectiveRole(account,settings) }
  await audit(account.name, account.id, 'account', account.id, 'Ingelogd')
  return { token, account: safeAccount(clientAccount, false), expiresAt: expires }
}

function safeAccount(a: any, includePassword = false, plainPassword = '') {
  const out: any = {
    id: a.id, name: a.name, username: a.username, role: a.role,
    active: !!a.active, createdAt: a.created_at, updatedAt: a.updated_at,
  }
  if (includePassword) out.password = plainPassword
  return out
}

async function signedPhoto(path: string | null) {
  if (!path) return null
  const { data } = await db.storage.from('ticket-photos').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

async function getState(account: any, existingSettings?: any) {
  const settingsObj:any = existingSettings || await loadSettingsObj()
  const role = effectiveRole(account, settingsObj)
  const clientAccount = { ...account, role }
  if (role === 'staff') {
    return {
      version: 5.817,
      currentAccount: safeAccount(clientAccount, false),
      accounts: [], tickets: [], routing: {},
      settings: { ...settingsObj, publicAccessWordHash:undefined, publicAccessWordDisplay:undefined, publicAccessWordSet:!!settingsObj.publicAccessWordHash }, auditLog: [],
    }
  }
  const perms = permissionsFor(role, settingsObj)
  const onWayRows = await loadOnWayRows()
  const adminFns = adminFunctionsFor(clientAccount, settingsObj)
  const [{ data: accounts }, { data: tickets }, { data: histories }, { data: routing }, { data: routingMembers }, { data: ticketAssignments }, { data: audits }] = await Promise.all([
    db.from('dm_accounts').select('*').order('name'),
    db.from('dm_tickets').select('*').order('created_at', { ascending: false }),
    db.from('dm_ticket_history').select('*').order('at'),
    db.from('dm_routing').select('*'),
    db.from('dm_routing_members').select('*'),
    db.from('dm_ticket_assignments').select('*'),
    (role === 'admin' || adminFns.viewAuditLog) ? db.from('dm_audit_logs').select('*').order('at', { ascending: false }).limit(5000) : Promise.resolve({ data: [] }),
  ])
  const histBy = new Map<number, any[]>()
  for (const h of histories || []) {
    if (!histBy.has(h.ticket_id)) histBy.set(h.ticket_id, [])
    histBy.get(h.ticket_id)!.push({ at: h.at, actor: h.actor, action: h.action })
  }
  const ticketAssigneeMap = new Map<number,string[]>()
  for (const x of ticketAssignments || []) {
    if (!ticketAssigneeMap.has(x.ticket_id)) ticketAssigneeMap.set(x.ticket_id, [])
    ticketAssigneeMap.get(x.ticket_id)!.push(x.account_id)
  }
  const routingMemberMap = new Map<string,string[]>()
  for (const x of routingMembers || []) {
    if (!routingMemberMap.has(x.category)) routingMemberMap.set(x.category, [])
    routingMemberMap.get(x.category)!.push(x.account_id)
  }
  const mappedAccounts = []
  for (const raw of accounts || []) {
    const effective = { ...raw, role:effectiveRole(raw,settingsObj) }
    const canManageAccounts = role === 'admin' || !!adminFns.manageAccounts
    if (role !== 'admin' && canManageAccounts && effective.role === 'admin') continue
    if (role !== 'admin' && !canManageAccounts && !isOperationalRole(effective.role)) continue
    let pw = ''
    const maySeePassword = role === 'admin' || (canManageAccounts && effective.role !== 'admin')
    if (maySeePassword) {
      try { pw = await decryptPassword(raw.password_cipher, raw.password_iv) } catch { pw = '(niet leesbaar)' }
    }
    mappedAccounts.push(safeAccount(effective, maySeePassword, pw))
  }
  const visibleRows = (tickets || []).filter((t:any)=>{
    const ids = ticketAssigneeMap.get(t.id) || (t.assignee ? [t.assignee] : [])
    return ticketVisibleFor(account,role,perms,t,ids)
  })
  const mappedTickets = await Promise.all(visibleRows.map(async (t:any) => {
    const fullIds = ticketAssigneeMap.get(t.id) || (t.assignee ? [t.assignee] : [])
    const showAssignment = role === 'admin' || !!perms.viewAssignment
    return {
      id: t.ticket_no || `M-${t.id}`,
      dbId: t.id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      plannedFor: t.planned_for || '',
      publicVisible: t.public_visible !== false,
      reporter: role === 'admin' || perms.viewReporter ? t.reporter : '',
      reporterEmail: role === 'admin' || perms.viewReporter ? (t.reporter_email || '') : '',
      location: t.location,
      category: t.category,
      urgency: t.urgency,
      title: t.title,
      description: t.description,
      canContinue: role === 'admin' || perms.viewReporter ? t.can_continue : '',
      photo: role === 'admin' || perms.viewPhoto ? await signedPhoto(t.photo_path) : null,
      photoPath: role === 'admin' || perms.viewPhoto ? t.photo_path : null,
      status: t.status,
      assignee: showAssignment ? (t.assignee || '') : '',
      assignees: showAssignment ? fullIds : [],
      assignedToMe: fullIds.includes(account.id),
      unassigned: fullIds.length === 0,
      internalNote: role === 'admin' || perms.viewInternalNote ? t.internal_note : '',
      history: role === 'admin' || perms.viewHistory ? (histBy.get(t.id) || []) : [],
      onWay: onWayRows.filter((r:any)=>r.ticketId===t.id && (showAssignment||r.accountId===account.id)).map(({ticketId,...row}:any)=>row),
    }
  }))
  const current = safeAccount(clientAccount, role === 'admin', role === 'admin' ? await decryptPassword(account.password_cipher, account.password_iv).catch(()=>'') : '')
  current.adminFunctions = role === 'admin' ? { ...DEFAULT_ADMIN_FUNCTIONS, ...Object.fromEntries(Object.keys(DEFAULT_ADMIN_FUNCTIONS).map(k=>[k,true])) } : adminFns
  const clientSettings:any = { ...settingsObj, publicAccessWordSet:!!settingsObj.publicAccessWordHash }
  delete clientSettings.publicAccessWordHash
  if (role !== 'admin' && !adminFns.managePublicAccess) delete clientSettings.publicAccessWordDisplay
  if (role !== 'admin') delete clientSettings.delegatedAdminPermissions
  return {
    version: 5.817,
    currentAccount: current,
    accounts: mappedAccounts,
    tickets: mappedTickets,
    routing: Object.fromEntries((routing || []).map((r: any) => [r.category, { all: !!r.assign_all, accountIds: routingMemberMap.get(r.category) || (r.account_id ? [r.account_id] : []) }])),
    settings: clientSettings,
    auditLog: (audits || []).map((x: any) => ({ id:x.id, at:x.at, actor:x.actor, actorId:x.actor_id, type:x.type, targetId:x.target_id, action:x.action })),
  }
}

async function uploadPhoto(dataUrl: string | null | undefined, ticketDbId: number) {
  if (!dataUrl) return null
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  const contentType = m[1]
  const bytes = unb64(m[2])
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('Foto is groter dan 6 MB')
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const path = `tickets/${ticketDbId}/${crypto.randomUUID()}.${ext}`
  const { error } = await db.storage.from('ticket-photos').upload(path, bytes, { contentType, upsert: false })
  if (error) throw error
  return path
}

function ticketDatePrefix(dateText: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
  if (!m) throw new Error('Ongeldige datum')
  return `${m[1].slice(2)}${m[2]}${m[3]}`
}
function ticketPreview(dateText: string, nextNumber: number) {
  return `M-${ticketDatePrefix(dateText)}${String(nextNumber).padStart(3,'0')}`
}
async function nextTicketNumber() {
  const { data, error } = await db.rpc('dm_next_ticket_number')
  if (error) throw error
  const value:any = data || {}
  const dateText = String(value.ticket_date || '')
  const number = Number(value.number)
  if (!dateText || !Number.isInteger(number) || number < 1 || number > 999) throw new Error('Ticketnummer kon niet worden aangemaakt')
  return { dateText, number, ticketNo: ticketPreview(dateText, number) }
}

async function createTicket(payload: any, actorAccount: any | null) {
  const category = String(payload.category || '')
  const { data: route } = await db.from('dm_routing').select('*').eq('category', category).maybeSingle()
  let routeIds: string[] = []
  if (route?.assign_all) {
    const { data: allFac } = await db.from('dm_accounts').select('id').eq('role','facility').eq('active',true).order('name')
    routeIds = (allFac || []).map((x:any)=>x.id)
  } else {
    const { data: members } = await db.from('dm_routing_members').select('account_id').eq('category',category)
    routeIds = (members || []).map((x:any)=>x.account_id)
    if (!routeIds.length && route?.account_id) routeIds = [route.account_id]
  }
  const primary = routeIds[0] || null
  const canContinue = String(payload.canContinue || 'ja')
  const urgency = canContinue === 'nee' ? 'spoed' : String(payload.urgency || 'normaal')
  const reporterEmail = String(payload.reporterEmail || '').trim().slice(0,254)
  if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) throw new Error('Vul een geldig e-mailadres in')
  let publicVisible = true
  if (actorAccount && isOperationalRole(String(actorAccount.role||''))) publicVisible = payload.publicVisible === true
  else if (!actorAccount) publicVisible = !(await reporterMatchesOperationalAccount(payload.reporter))
  const { data: inserted, error } = await db.from('dm_tickets').insert({
    reporter: String(payload.reporter || '').slice(0,160),
    reporter_email: reporterEmail,
    location: String(payload.location || '').slice(0,300),
    category,
    urgency,
    title: String(payload.title || '').slice(0,160),
    description: String(payload.description || '').slice(0,6000),
    can_continue: canContinue,
    status: 'open',
    assignee: primary,
    public_visible: publicVisible,
  }).select('*').single()
  if (error) throw error
  if (routeIds.length) {
    const { error: assignErr } = await db.from('dm_ticket_assignments').insert(routeIds.map(accountId=>({ticket_id:inserted.id,account_id:accountId})))
    if (assignErr) throw assignErr
  }
  const numbered = await nextTicketNumber()
  const ticketNo = numbered.ticketNo
  let photoPath = null
  try { photoPath = await uploadPhoto(payload.photoData, inserted.id) } catch (e) { console.error('photo upload', e) }
  await db.from('dm_tickets').update({ ticket_no: ticketNo, photo_path: photoPath }).eq('id', inserted.id)
  const actor = actorAccount?.name || String(payload.reporter || 'Melder') || 'Melder'
  const actorId = actorAccount?.id || null
  await history(inserted.id, actor, actorId, 'Melding aangemaakt')
  if (!publicVisible) await history(inserted.id, actor, actorId, 'Zichtbaarheid melderspagina: Zichtbaar -> Verborgen')
  let assigneeNames: string[] = []
  if (routeIds.length) {
    const { data: aa } = await db.from('dm_accounts').select('id,name').in('id', routeIds)
    const nameMap = new Map<string,string>((aa || []).map((x:any)=>[String(x.id),String(x.name)]))
    assigneeNames = routeIds.map(id=>nameMap.get(id) || 'medewerker')
    await history(inserted.id, 'Systeem', null, `Automatisch toegewezen aan ${assigneeNames.join(', ')}`)
  }
  await deliverTicketPush(inserted.id)
  return { id: ticketNo, dbId: inserted.id, assignee: primary || '', assignees: routeIds, assigneeName: assigneeNames[0] || '', assigneeNames }
}

async function updateTicket(account: any, payload: any, settingsObj?: any) {
  const settings = settingsObj || await loadSettingsObj()
  const role = effectiveRole(account,settings)
  const perms = permissionsFor(role,settings)
  const id = Number(payload.dbId)
  const { data: old } = await db.from('dm_tickets').select('*').eq('id', id).single()
  if (!old) throw new Error('Melding niet gevonden')
  const { data: beforeRows } = await db.from('dm_ticket_assignments').select('account_id').eq('ticket_id',id)
  const beforeIds = (beforeRows || []).map((x:any)=>x.account_id)
  const visibilityIds = beforeIds.length ? beforeIds : (old.assignee ? [old.assignee] : [])
  if (!ticketVisibleFor(account,role,perms,old,visibilityIds)) throw new Error('Geen toegang tot deze melding')
  const allowed: Record<string,{db:string,perm:string,label:string}> = {
    title:{db:'title',perm:'editTitle',label:'titel'},
    location:{db:'location',perm:'editLocation',label:'locatie'},
    category:{db:'category',perm:'editCategory',label:'categorie'},
    urgency:{db:'urgency',perm:'editUrgency',label:'urgentie'},
    status:{db:'status',perm:'editStatus',label:'status'},
    plannedFor:{db:'planned_for',perm:'editPlannedFor',label:'gepland uitvoeren op'},
    internalNote:{db:'internal_note',perm:'editInternalNote',label:'interne notitie'},
  }
  const patch: any = { updated_at: new Date().toISOString() }
  const changes: string[] = []
  if ('title' in payload && !String(payload.title||'').trim()) throw new Error('Titel mag niet leeg zijn')
  if ('plannedFor' in payload) { const raw=String(payload.plannedFor||'').trim(); if(raw&&!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('Ongeldige geplande datum'); payload.plannedFor=raw||null }
  for (const [clientKey, cfg] of Object.entries(allowed)) {
    if (!(clientKey in payload)) continue
    if (role !== 'admin' && !perms[cfg.perm]) throw new Error(`Geen recht om ${cfg.label} te wijzigen`)
    const v = payload[clientKey]
    const before = old[cfg.db]
    if (String(before ?? '') !== String(v ?? '')) {
      patch[cfg.db] = v
      const prettyBefore = clientKey==='status' ? ({open:'Open',progress:'In behandeling',wait:'Wacht / gepland',done:'Afgerond'} as any)[String(before)] || before : clientKey==='urgency' ? ({laag:'Laag',normaal:'Normaal',hoog:'Hoog',spoed:'SPOED'} as any)[String(before)] || before : clientKey==='plannedFor' ? (before || 'Niet gepland') : before
      const prettyAfter = clientKey==='status' ? ({open:'Open',progress:'In behandeling',wait:'Wacht / gepland',done:'Afgerond'} as any)[String(v)] || v : clientKey==='urgency' ? ({laag:'Laag',normaal:'Normaal',hoog:'Hoog',spoed:'SPOED'} as any)[String(v)] || v : clientKey==='plannedFor' ? (v || 'Niet gepland') : v
      changes.push(`${cfg.label}: ${prettyBefore ?? '-'} -> ${prettyAfter ?? '-'}`)
    }
  }
  if ('publicVisible' in payload) {
    if (role !== 'admin' && !isOperationalRole(role)) throw new Error('Geen recht om de zichtbaarheid op de melderspagina te wijzigen')
    const visible = payload.publicVisible === true
    const beforeVisible = old.public_visible !== false
    if (beforeVisible !== visible) {
      patch.public_visible = visible
      changes.push(`zichtbaarheid melderspagina: ${beforeVisible?'Zichtbaar':'Verborgen'} -> ${visible?'Zichtbaar':'Verborgen'}`)
    }
  }
  if ('assignees' in payload || 'assignee' in payload) {
    if (role !== 'admin' && !perms.editAssignment) throw new Error('Geen recht om de toewijzing te wijzigen')
    const requested = Array.isArray(payload.assignees)
      ? payload.assignees.map((x:any)=>String(x||'').trim()).filter(Boolean)
      : (String(payload.assignee||'').trim() ? [String(payload.assignee).trim()] : [])
    const selected = [...new Set(requested)]
    let validIds:string[] = []
    if (selected.length) {
      const {data:validRows,error:validErr}=await db.from('dm_accounts').select('id,active,role').in('id',selected)
      if (validErr) throw validErr
      validIds=(validRows||[]).filter((x:any)=>x.active!==false && ['facility','concierge'].includes(x.role)).map((x:any)=>String(x.id))
      if (validIds.length!==selected.length) throw new Error('Een of meer gekozen medewerkers zijn niet geldig of niet actief')
    }
    await db.from('dm_ticket_assignments').delete().eq('ticket_id',id)
    if (validIds.length) {
      const { error: aErr } = await db.from('dm_ticket_assignments').insert(validIds.map(account_id=>({ticket_id:id,account_id})))
      if (aErr) throw aErr
    }
    patch.assignee = validIds[0] || null
    const allIds=[...new Set([...(beforeIds||[]),...(old.assignee?[old.assignee]:[]),...validIds].filter(Boolean))]
    const {data:nameRows}=allIds.length?await db.from('dm_accounts').select('id,name,role').in('id',allIds):{data:[]} as any
    const nameMap=new Map<string,string>((nameRows||[]).map((x:any)=>[String(x.id),`${x.name} (${x.role==='concierge'?'Conciërge':x.role==='facility'?'Facilitair':x.role==='admin'?'Hoofdbeheerder':'Personeel'})`]))
    const beforeList=(beforeIds.length?beforeIds:(old.assignee?[old.assignee]:[])).map((id:any)=>nameMap.get(String(id))||String(id))
    const afterList=validIds.map((id:any)=>nameMap.get(String(id))||String(id))
    const beforeLabel=beforeList.length?beforeList.join(', '):'Niet toegewezen'
    const afterLabel=afterList.length?afterList.join(', '):'Niet toegewezen'
    if (beforeLabel !== afterLabel) changes.push(`toewijzing: ${beforeLabel} -> ${afterLabel}`)
  }
  const { error } = await db.from('dm_tickets').update(patch).eq('id', id)
  if (error) throw error
  if (changes.length) await history(id, account.name, account.id, changes.join(' | '))
  await deliverTicketPush(id)
  return { ok:true }
}

async function upsertAccount(admin: any, payload: any) {
  const isNew = !payload.id
  const username = String(payload.username || '').trim()
  if (!username) throw new Error('Inlognaam ontbreekt')
  const requestedRole = String(payload.role || 'facility')
  if (!['staff','facility','concierge','admin'].includes(requestedRole)) throw new Error('Ongeldige rol')
  const dbRole = requestedRole === 'concierge' ? 'facility' : requestedRole
  const base: any = {
    name: String(payload.name || '').trim(), username, username_key: username.toLowerCase(),
    role: dbRole, active: payload.active !== false,
    updated_at: new Date().toISOString(),
  }
  if (payload.password !== undefined && String(payload.password) !== '') Object.assign(base, await passwordFields(String(payload.password)))
  if (isNew) {
    if (!payload.password) throw new Error('Wachtwoord is verplicht bij een nieuw account')
    const { data, error } = await db.from('dm_accounts').insert(base).select('*').single()
    if (error) throw error
    await setAccountRoleOverride(data.id, requestedRole)
    await audit(admin.name, admin.id, 'account', data.id, `Account aangemaakt: ${data.name} (${data.username}), rol ${requestedRole}`)
    return data.id
  }
  const { data: before } = await db.from('dm_accounts').select('*').eq('id', payload.id).single()
  const settingsBefore = await loadSettingsObj()
  const beforeRole = before ? effectiveRole(before,settingsBefore) : ''
  const { data, error } = await db.from('dm_accounts').update(base).eq('id', payload.id).select('*').single()
  if (error) throw error
  await setAccountRoleOverride(data.id, requestedRole)
  await audit(admin.name, admin.id, 'account', data.id, `Account gewijzigd: ${before?.name || ''} / ${before?.username || ''} / ${beforeRole || ''} -> ${data.name} / ${data.username} / ${requestedRole}`)
  if (payload.active === false) await db.from('dm_sessions').delete().eq('account_id', payload.id)
  return data.id
}

async function changeOwnPassword(account: any, payload: any) {
  const currentHash = await derivePassword(String(payload.oldPassword || ''), account.password_salt)
  if (currentHash !== account.password_hash) throw new Error('Huidig wachtwoord klopt niet')
  const p = await passwordFields(String(payload.newPassword || ''))
  await db.from('dm_accounts').update({ ...p, updated_at:new Date().toISOString() }).eq('id', account.id)
  await audit(account.name, account.id, 'account', account.id, 'Eigen wachtwoord gewijzigd')
}

async function createInvite(admin: any, payload: any) {
  const accountId = String(payload.accountId || '')
  const mode = payload.mode === 'reset' ? 'reset' : 'invite'
  const token = randomToken(32)
  const tokenHash = await sha256(token)
  const expires = new Date(Date.now() + 7*24*3600*1000).toISOString()
  await db.from('dm_invites').delete().eq('account_id', accountId).is('used_at', null)
  const { error } = await db.from('dm_invites').insert({ account_id:accountId, token_hash:tokenHash, mode, expires_at:expires })
  if (error) throw error
  const { data:a } = await db.from('dm_accounts').select('name,username').eq('id',accountId).single()
  await audit(admin.name,admin.id,'account',accountId,mode==='reset'?'Wachtwoord-resetuitnodiging aangemaakt':'Accountuitnodiging aangemaakt')
  const base = String(payload.appUrl || APP_BASE_URL || '').replace(/[?#].*$/,'')
  return { token, url: `${base}?setup=${encodeURIComponent(token)}`, account:a, mode, expiresAt:expires }
}

async function setupPassword(payload: any) {
  const hash = await sha256(String(payload.token || ''))
  const { data: inv } = await db.from('dm_invites').select('*').eq('token_hash',hash).is('used_at',null).maybeSingle()
  if (!inv || new Date(inv.expires_at) <= new Date()) throw new Error('Deze uitnodigingslink is ongeldig of verlopen')
  const p = await passwordFields(String(payload.password || ''))
  const { data:a } = await db.from('dm_accounts').update({ ...p, active:true, updated_at:new Date().toISOString() }).eq('id',inv.account_id).select('*').single()
  await db.from('dm_invites').update({ used_at:new Date().toISOString() }).eq('id',inv.id)
  await audit(a.name,a.id,'account',a.id,inv.mode==='reset'?'Wachtwoord ingesteld via resetlink':'Account geactiveerd via uitnodigingslink')
  return { username:a.username, name:a.name }
}

function normalizeDuplicateText(value:any){return String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function normalizePersonName(value:any){return String(value||'').normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/\s+/g,' ').trim()}
async function reporterMatchesOperationalAccount(value:any){
  const reporter=normalizePersonName(value)
  if(!reporter)return false
  const {data,error}=await db.from('dm_accounts').select('name').eq('role','facility').eq('active',true)
  if(error)throw error
  return (data||[]).some((a:any)=>{const full=normalizePersonName(a.name),first=full.split(' ')[0]||'';return reporter===full||(first&&reporter===first)})
}
function duplicateTokens(value:any){return [...new Set(normalizeDuplicateText(value).split(' ').filter((x:string)=>x.length>=3))]}
async function findDuplicateTickets(payload:any, publicOnly=false){
  const location=normalizeDuplicateText(payload?.location),category=normalizeDuplicateText(payload?.category),title=normalizeDuplicateText(payload?.title),titleWords=duplicateTokens(payload?.title)
  if(!location&&!title)return []
  let duplicateQuery=db.from('dm_tickets').select('ticket_no,created_at,location,category,urgency,title,status,public_visible').neq('status','done');if(publicOnly)duplicateQuery=duplicateQuery.eq('public_visible',true);const {data,error}=await duplicateQuery.order('created_at',{ascending:false}).limit(200)
  if(error)throw error
  const rows=(data||[]).map((t:any)=>{let score=0;const rowLoc=normalizeDuplicateText(t.location),rowCat=normalizeDuplicateText(t.category),rowTitle=normalizeDuplicateText(t.title);if(location&&rowLoc===location)score+=6;else if(location&&rowLoc&&(rowLoc.includes(location)||location.includes(rowLoc)))score+=3;if(category&&rowCat===category)score+=3;if(title&&rowTitle===title)score+=6;else if(titleWords.length){const set=new Set(duplicateTokens(t.title));const shared=titleWords.filter((w:string)=>set.has(w)).length;if(shared>=2)score+=3;else if(shared===1)score+=1}return {score,id:t.ticket_no||'',createdAt:t.created_at,location:t.location,category:t.category,urgency:t.urgency,title:t.title,status:t.status}}).filter((x:any)=>x.score>=4)
  rows.sort((a:any,b:any)=>b.score-a.score||new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
  return rows.slice(0,5).map(({score,...item}:any)=>item)
}

// Web Push gebruikt uitsluitend dit project en een eigen VAPID-sleutelpaar.
function pushUuid(value:any){
  const text=String(value||'')
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text))throw new Error('Ongeldig verzoek- of apparaat-id')
  return text
}
function pushSubscription(value:any){
  if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw new Error('Ongeldig pushabonnement')
  const url=new URL(value.endpoint)
  const host=url.hostname
  const allowed=host==='fcm.googleapis.com'||host==='web.push.apple.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.notify.windows.com')
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||!allowed)throw new Error('Onbekende pushdienst')
  const key=String(value.keys?.p256dh||''),auth=String(value.keys?.auth||'')
  if(!/^B[A-Za-z0-9_-]{86}={0,1}$/.test(key))throw new Error('Ongeldige pushsleutel')
  if(!/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth))throw new Error('Ongeldige pushauthenticatie')
  const expiration=value.expirationTime==null?null:Number(value.expirationTime)
  if(expiration!==null&&(!Number.isFinite(expiration)||expiration<=Date.now()||expiration>Date.now()+10*365*86400000))throw new Error('Verlopen pushabonnement')
  return {endpoint:url.href,p256dh:key,auth,expiration:expiration===null?null:new Date(expiration).toISOString()}
}
function vapidConfig(){
  if(Deno.env.get('DM_WEB_PUSH_ENABLED')!=='true')return null
  const publicKey=Deno.env.get('DM_VAPID_PUBLIC_KEY')||'',privateKey=Deno.env.get('DM_VAPID_PRIVATE_KEY')||'',subject=Deno.env.get('DM_VAPID_SUBJECT')||''
  if(!publicKey||!privateKey||!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject))return null
  return {publicKey,privateKey,subject}
}
async function loadOnWayRows(){
  const {data,error}=await db.from('dm_ticket_on_way')
    .select('ticket_id,account_id,since,dm_accounts!inner(name,active),dm_tickets!inner(status)')
    .eq('active',true).eq('dm_accounts.active',true).neq('dm_tickets.status','done').order('since')
  if(error)throw new Error('Onderwegregistratie niet beschikbaar; controleer de v5.9.0-migratie')
  return (data||[]).map((r:any)=>({ticketId:r.ticket_id,accountId:r.account_id,name:r.dm_accounts.name,since:r.since}))
}
async function onWayState(account:any,settings:any){
  const perms=permissionsFor(account.role,settings)
  if(account.role!=='admin'&&(!isOperationalRole(account.role)||perms.viewAllTickets===false))return []
  const rows=(await loadOnWayRows()).filter((r:any)=>account.role==='admin'||perms.viewAssignment||r.accountId===account.id)
  if(!rows.length)return []
  return rows
}
async function deliverPushEvent(eventId:string,actorId:string|null){
  const vapid=vapidConfig()
  if(!vapid)return {sent:0,failed:0,configured:false}
  const {error:expiryError}=await db.from('dm_push_subscriptions').delete().lt('expiration_time',new Date().toISOString())
  if(expiryError)throw new Error('Verlopen pushregistraties konden niet worden opgeschoond')
  const {data,error}=await db.rpc('dm_claim_push_deliveries',{p_event:eventId,p_actor:actorId})
  if(error)throw new Error('Pushverzending kon niet worden gestart')
  let sent=0,failed=0
  const rows=data||[]
  for(let offset=0;offset<rows.length;offset+=5){
    await Promise.all(rows.slice(offset,offset+5).map(async(row:any)=>{
      let state='failed'
      try{
        const subscription=pushSubscription({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}})
        await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(row.payload),
          {vapidDetails:vapid,TTL:3600,urgency:'high',timeout:8000})
        sent++;state='sent'
      }catch(e){
        failed++
        const status=(e as any)?.statusCode
        if(status===404||status===410){
          // Alleen de nog identieke registratie wissen; een gelijktijdige heraanmelding behouden.
          await db.from('dm_push_subscriptions').delete().eq('id',row.subscription_id).eq('endpoint',row.endpoint).eq('p256dh',row.p256dh).eq('auth',row.auth).eq('updated_at',row.subscription_version)
        }
        // Geen endpoints, sleutels, providerbody's of persoonsgegevens in logs.
      }
      await db.from('dm_push_deliveries').update({state,updated_at:new Date().toISOString()}).eq('event_id',eventId).eq('subscription_id',row.subscription_id).eq('state','claimed')
    }))
  }
  return {sent,failed,configured:true}
}

// Push is aanvullend: een provider-/queuefout mag een opgeslagen ticket niet laten mislukken.
async function deliverTicketPush(ticketId:number){
  if(!vapidConfig())return
  try{
    const {data,error}=await db.rpc('dm_pending_ticket_push',{p_ticket:ticketId})
    if(error)throw new Error('Pushqueue niet beschikbaar')
    for(const event of data||[])await deliverPushEvent(event.event_id,null)
  }catch{
    console.error('Ticket opgeslagen; pushverzending niet voltooid')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error:'Alleen POST toegestaan' },405)
  try {
    const body = await req.json().catch(()=>({}))
    const action = String(body.action || '')
    const payload = body.payload || {}

    if (action === 'health') return json({ ok:true, version:5.92,features:{onWay:1,webPush:1,urgentBroadcast:1,onWayUnassigned:1} })
    if (action === 'public_config') {
      const defaults:any = { categories: ['Gebouw / onderhoud','Deuren / sloten / toegang','Meubilair','Schoonmaak','Voorraad / materialen','Veiligheid','ICT / apparatuur','Sanitair','Verlichting / elektra','Overig'], reportLocationExamples: ['003','105','225','Personeelswerkkamer','Mediatheek','Docentenkamer'], reportTitleExamples: ['Docking werkt niet','Lamp kapot','Stoel defect','Deurklink zit los','Stopcontact werkt niet'], reportHeroTitle: 'Facilitaire melding', reportHeroIntro: 'Iets kapot, vies, leeg of onveilig? Meld het hier snel bij facilitair.', reportHeroLocation: 'Vul de locatie zo duidelijk mogelijk in, bijvoorbeeld {locaties}.', reportHeroEmergency: 'Bij direct gevaar of spoed: volg altijd de interne noodprocedure en neem direct persoonlijk contact op.', reportHeroTitleSize: 30, reportHeroIntroSize: 14, reportHeroLocationSize: 16, reportHeroEmergencySize: 12, publicAccessGateEnabled:false, publicAccessWordSet:false, publicOutageOverview:true, publicOutageCategories:null, publicOutageStatuses:null, publicOutageSort:'category', publicOutageCategoryOrder:null, publicPageSectionOrder:['hero','outages','form'] }
      const { data: rows } = await db.from('dm_settings').select('key,value').in('key',['categories','reportLocationExamples','reportTitleExamples','reportHeroTitle','reportHeroIntro','reportHeroLocation','reportHeroEmergency','reportHeroTitleSize','reportHeroIntroSize','reportHeroLocationSize','reportHeroEmergencySize','publicAccessGateEnabled','publicOutageOverview','publicOutageCategories','publicOutageStatuses','publicOutageSort','publicOutageCategoryOrder','publicPageSectionOrder'])
      for (const row of rows || []) defaults[row.key] = row.value
      const { data: accessWordRow } = await db.from('dm_settings').select('value').eq('key','publicAccessWordHash').maybeSingle()
      defaults.publicAccessWordSet=!!accessWordRow?.value
      return json({ ok:true, settings:defaults })
    }
    if (action === 'public_outages') {
      const settings = await loadSettingsObj()
      await requirePublicAccess(payload,settings)
      if (settings.publicOutageOverview === false) return json({ ok:true, enabled:false, items:[] })
      const allCategories = Array.isArray(settings.categories) ? settings.categories.filter((x:any)=>typeof x==='string'&&x.trim()) : []
      const configuredCategories = Array.isArray(settings.publicOutageCategories) ? settings.publicOutageCategories.filter((x:any)=>typeof x==='string') : null
      const visibleCategories = configuredCategories === null ? allCategories : configuredCategories
      const defaultStatuses = ['open','progress','wait']
      const configuredStatuses = Array.isArray(settings.publicOutageStatuses) ? settings.publicOutageStatuses.filter((x:any)=>defaultStatuses.includes(x)) : null
      const visibleStatuses = configuredStatuses === null ? defaultStatuses : configuredStatuses
      if (!visibleCategories.length || !visibleStatuses.length) return json({ ok:true, enabled:true, items:[] })
      const { data: rows, error } = await db.from('dm_tickets')
        .select('ticket_no,created_at,location,category,urgency,title,status,public_visible')
        .eq('public_visible',true)
        .in('status',visibleStatuses)
        .in('category',visibleCategories)
        .order('created_at',{ascending:false})
        .limit(250)
      if (error) throw error
      const items = (rows || []).map((t:any)=>({
        id:t.ticket_no || '', createdAt:t.created_at, location:t.location, category:t.category, urgency:t.urgency, title:t.title, status:t.status
      }))
      const sortMode = ['category','newest','oldest','urgency'].includes(settings.publicOutageSort) ? settings.publicOutageSort : 'category'
      const orderSource = Array.isArray(settings.publicOutageCategoryOrder) ? [...settings.publicOutageCategoryOrder.filter((x:any)=>allCategories.includes(x)),...allCategories.filter((x:any)=>!settings.publicOutageCategoryOrder.includes(x))] : allCategories
      const catOrder = new Map<string,number>(orderSource.map((cat:any,i:number)=>[String(cat),i]))
      const urgencyRank:any = { spoed:0, hoog:1, normaal:2, laag:3 }
      items.sort((a:any,b:any)=>{
        if (sortMode === 'category') return (catOrder.get(a.category) ?? 999)-(catOrder.get(b.category) ?? 999) || new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()
        if (sortMode === 'oldest') return new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()
        if (sortMode === 'urgency') return (urgencyRank[a.urgency] ?? 9)-(urgencyRank[b.urgency] ?? 9) || new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()
        return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()
      })
      return json({ ok:true, enabled:true, items:items.slice(0,100) })
    }
    if (action === 'public_duplicate_check') { const settings=await loadSettingsObj(); await requirePublicAccess(payload,settings); return json({ok:true,items:await findDuplicateTickets(payload,true)}) }
    if (action === 'validate_public_access_word') {
      const settings=await loadSettingsObj()
      if(settings.publicAccessGateEnabled!==true)return json({ok:true,accessToken:''})
      const currentHash=String(settings.publicAccessWordHash||'')
      if(!currentHash)return json({error:'Er is nog geen maandwoord ingesteld. Neem contact op met de beheerder.'},503)
      const candidate=normalizeAccessWord(payload.word)
      if(!candidate||await accessWordHash(candidate)!==currentHash)return json({error:'Onjuist maandwoord'},401)
      return json({ok:true,accessToken:await createPublicAccessToken(currentHash)})
    }
    if (action === 'validate_public_access_token') {
      const settings=await loadSettingsObj()
      if(settings.publicAccessGateEnabled!==true)return json({ok:true})
      const currentHash=String(settings.publicAccessWordHash||'')
      if(!currentHash||!await verifyPublicAccessToken(payload.accessToken,currentHash))return json({error:'Toegang verlopen of maandwoord gewijzigd'},401)
      return json({ok:true})
    }
    if (action === 'login') {
      const result = await login(payload.username, payload.password)
      if (!result) return json({ error:'Onjuiste inlognaam of wachtwoord' },401)
      return json({ ok:true, ...result })
    }
    if (action === 'setup_password') return json({ ok:true, result: await setupPassword(payload) })
    if (action === 'public_create_ticket') { const settings=await loadSettingsObj(); await requirePublicAccess(payload,settings); return json({ ok:true, ticket: await createTicket(payload, null) }) }

    const rawAccount = await authenticate(req)
    if (!rawAccount) return json({ error:'Sessie verlopen of geen toegang' },401)
    const requestSettings = await loadSettingsObj()
    const account = { ...rawAccount, role:effectiveRole(rawAccount,requestSettings) }

    if(action==='on_way_state')return json({ok:true,rows:await onWayState(account,requestSettings)})
    if(action==='set_on_way'){
      const perms=permissionsFor(account.role,requestSettings)
      if(account.role!=='admin'&&(!isOperationalRole(account.role)||perms.viewAllTickets===false||!perms.editStatus))return json({error:'Geen afhandelrecht'},403)
      const ticketId=Number(payload.dbId),requestId=pushUuid(payload.requestId)
      if(!Number.isSafeInteger(ticketId)||ticketId<=0||typeof payload.active!=='boolean')return json({error:'Ongeldige onderweg-actie'},400)
      const {data,error}=await db.rpc('dm_set_on_way',{p_actor:account.id,p_ticket:ticketId,p_active:payload.active,p_request:requestId})
      if(error)return json({error:'Onderweg wijzigen niet toegestaan of tijdelijk niet beschikbaar'},403)
      const delivery=payload.active?await deliverPushEvent(requestId,account.id):null
      return json({ok:true,...data,delivery,state:await getState(account,requestSettings)})
    }
    if(['push_config','push_register','push_unregister','push_test'].includes(action)){
      const perms=permissionsFor(account.role,requestSettings)
      if(account.role!=='admin'&&(!isOperationalRole(account.role)||perms.viewAllTickets===false||perms.notifications===false))return json({error:'Geen toegang tot pushmeldingen'},403)
      if(action==='push_config')return json({ok:true,configured:!!vapidConfig(),publicKey:vapidConfig()?.publicKey||''})
      const deviceId=pushUuid(payload.deviceId)
      if(action==='push_unregister'){
        const {error}=await db.from('dm_push_subscriptions').delete().eq('account_id',account.id).eq('device_id',deviceId)
        if(error)throw new Error('Afmelden van push mislukt')
        return json({ok:true})
      }
      if(!vapidConfig())return json({error:'Pushmeldingen zijn nog niet geconfigureerd door de beheerder'},503)
      if(action==='push_register'){
        let sub
        try{sub=pushSubscription(payload.subscription)}catch{return json({error:'Ongeldig pushabonnement of onbekende pushdienst'},400)}
        const {error}=await db.rpc('dm_register_push',{p_actor:account.id,p_device:deviceId,p_hash:await sha256(sub.endpoint),p_endpoint:sub.endpoint,p_p256dh:sub.p256dh,p_auth:sub.auth,p_expiration:sub.expiration})
        if(error)throw new Error('Aanmelden van push mislukt')
        return json({ok:true})
      }
      const requestId=pushUuid(payload.requestId)
      const {error}=await db.rpc('dm_test_push',{p_actor:account.id,p_device:deviceId,p_request:requestId})
      if(error)return json({error:'Test niet toegestaan: meld dit apparaat aan en wacht 10 seconden tussen tests'},400)
      const delivery=await deliverPushEvent(requestId,account.id)
      return json({ok:true,delivery})
    }

    if (action === 'logout') {
      const h=req.headers.get('Authorization')||''; const token=h.startsWith('Bearer ')?h.slice(7).trim():''
      if(token) await db.from('dm_sessions').delete().eq('token_hash',await sha256(token))
      return json({ok:true})
    }
    if (action === 'state') return json({ ok:true, state: await getState(account,requestSettings) })
    if (action === 'duplicate_check') return json({ok:true,items:await findDuplicateTickets(payload)})
    if (action === 'create_ticket') {
      const ticket = await createTicket(payload, account)
      return json({ ok:true, ticket, state: await getState(account,requestSettings) })
    }
    if (action === 'update_ticket') {
      if (!(account.role === 'admin' || isOperationalRole(account.role))) return json({error:'Geen toegang'},403)
      const result = await updateTicket(account,payload,requestSettings)
      return json({...result,state:await getState(account)})
    }
    if (action === 'delete_ticket') {
      const id=Number(payload.dbId)
      const perms=permissionsFor(account.role,requestSettings)
      if (account.role !== 'admin' && !perms.deleteTicket) return json({error:'Geen toegang'},403)
      const {data:t}=await db.from('dm_tickets').select('*').eq('id',id).single()
      if(!t)return json({error:'Melding niet gevonden'},404)
      if(account.role!=='admin'){
        const {data:rows}=await db.from('dm_ticket_assignments').select('account_id').eq('ticket_id',id)
        const ids=(rows||[]).map((x:any)=>x.account_id)
        const visibilityIds=ids.length?ids:(t.assignee?[t.assignee]:[])
        if(!ticketVisibleFor(account,account.role,perms,t,visibilityIds))return json({error:'Geen toegang'},403)
      }
      if(t?.photo_path) await db.storage.from('ticket-photos').remove([t.photo_path])
      await db.from('dm_tickets').delete().eq('id',id)
      await audit(account.name,account.id,'ticket',t?.ticket_no||String(id),`Melding verwijderd: ${t?.title||''}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'upsert_account') {
      const delegated = account.role !== 'admin' && hasAdminFunction(account,requestSettings,'manageAccounts')
      if (account.role !== 'admin' && !delegated) return json({error:'Geen toegang'},403)
      if (delegated) {
        if (String(payload.role||'facility') === 'admin') return json({error:'Alleen de hoofdbeheerder kan hoofdbeheeraccounts beheren'},403)
        if (payload.id) {
          const {data:target}=await db.from('dm_accounts').select('role').eq('id',String(payload.id)).maybeSingle()
          if (target?.role === 'admin') return json({error:'Hoofdbeheerder-accounts zijn afgeschermd'},403)
        }
      }
      await upsertAccount(account,payload)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'change_own_password') {
      await changeOwnPassword(account,payload)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'set_routing') {
      if(!hasAdminFunction(account,requestSettings,'manageRouting'))return json({error:'Geen toegang'},403)
      const category=String(payload.category||'')
      const all=!!payload.all
      const accountIds:string[]=Array.isArray(payload.accountIds)?[...new Set<string>(payload.accountIds.map((x:any)=>String(x)).filter(Boolean))]:[]
      await db.from('dm_routing').upsert({category,account_id:all?null:(accountIds[0]||null),assign_all:all,updated_at:new Date().toISOString()})
      await db.from('dm_routing_members').delete().eq('category',category)
      if(!all&&accountIds.length){const {error}=await db.from('dm_routing_members').insert(accountIds.map((accountId:string)=>({category,account_id:accountId})));if(error)throw error}
      let label='niemand'
      if(all) label='iedereen'
      else if(accountIds.length){const {data:names}=await db.from('dm_accounts').select('id,name').in('id',accountIds);const map=new Map((names||[]).map((x:any)=>[x.id,x.name]));label=accountIds.map((id:string)=>map.get(id)||id).join(', ')}
      await audit(account.name,account.id,'routing',category,`${category} automatisch toegewezen aan ${label}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'get_ticket_counter') {
      if(!hasAdminFunction(account,requestSettings,'manageTicketNumbering'))return json({error:'Geen toegang'},403)
      const date=String(payload.date||'')
      ticketDatePrefix(date)
      const {data:row,error}=await db.from('dm_ticket_counters').select('last_number').eq('ticket_date',date).maybeSingle()
      if(error)throw error
      const nextNumber=Math.min(999,Number(row?.last_number||0)+1)
      return json({ok:true,date,nextNumber,preview:ticketPreview(date,nextNumber)})
    }
    if (action === 'set_ticket_counter') {
      if(!hasAdminFunction(account,requestSettings,'manageTicketNumbering'))return json({error:'Geen toegang'},403)
      const date=String(payload.date||'')
      ticketDatePrefix(date)
      const nextNumber=Number(payload.nextNumber)
      if(!Number.isInteger(nextNumber)||nextNumber<1||nextNumber>999)return json({error:'Volgend dagnummer moet tussen 1 en 999 liggen'},400)
      const {error}=await db.from('dm_ticket_counters').upsert({ticket_date:date,last_number:nextNumber-1,updated_at:new Date().toISOString()})
      if(error)throw error
      await audit(account.name,account.id,'ticket-numbering',date,`Volgend ticketnummer ingesteld op ${ticketPreview(date,nextNumber)}`)
      return json({ok:true,date,nextNumber,preview:ticketPreview(date,nextNumber)})
    }
    if (action === 'configure_public_access') {
      if(!hasAdminFunction(account,requestSettings,'managePublicAccess'))return json({error:'Geen toegang tot deze beheerinstelling'},403)
      const enabled=payload.enabled===true
      const rawNewWord=String(payload.newWord||'').trim()
      const newWord=normalizeAccessWord(rawNewWord)
      let currentHash=String(requestSettings.publicAccessWordHash||'')
      if(newWord){
        if(newWord.length<3)return json({error:'Het maandwoord moet minimaal 3 tekens bevatten'},400)
        currentHash=await accessWordHash(newWord)
        await saveSetting('publicAccessWordHash',currentHash)
        await saveSetting('publicAccessWordDisplay',rawNewWord)
        await audit(account.name,account.id,'settings','publicAccessWordHash','Maandwoord voor melderspagina gewijzigd')
      }
      if(enabled&&!currentHash)return json({error:'Stel eerst een maandwoord in voordat je de beveiliging aanzet'},400)
      await saveSetting('publicAccessGateEnabled',enabled)
      await audit(account.name,account.id,'settings','publicAccessGateEnabled',enabled?'Beveiliging melderspagina ingeschakeld':'Beveiliging melderspagina uitgeschakeld')
      const state=await getState(account)
      return json({ok:true,state})
    }
    if (action === 'set_setting') {
      const key=String(payload.key)
      if(key==='publicAccessWordHash'||key==='publicAccessWordDisplay'||key==='publicAccessGateEnabled')return json({error:'Gebruik Beveiliging melderspagina'},400)
      if(account.role!=='admin'){
        const reportKeys=new Set(['reportHeroTitle','reportHeroIntro','reportHeroLocation','reportHeroEmergency','reportHeroTitleSize','reportHeroIntroSize','reportHeroLocationSize','reportHeroEmergencySize','reportLocationExamples','reportTitleExamples'])
        const overviewKeys=new Set(['publicOutageOverview','publicOutageCategories','publicOutageStatuses','publicOutageSort','publicOutageCategoryOrder','publicPageSectionOrder'])
        let allowed=false
        if(key==='categories')allowed=hasAdminFunction(account,requestSettings,'manageCategories')
        else if(key==='rolePermissions')allowed=hasAdminFunction(account,requestSettings,'manageRolePermissions')
        else if(key==='localNotifications'||key==='showAuditToFacility')allowed=hasAdminFunction(account,requestSettings,'manageGeneralSettings')
        else if(reportKeys.has(key))allowed=hasAdminFunction(account,requestSettings,'manageReportPage')
        else if(overviewKeys.has(key))allowed=hasAdminFunction(account,requestSettings,'managePublicOverview')
        if(!allowed)return json({error:'Geen toegang tot deze beheerinstelling'},403)
      }
      if(key==='delegatedAdminPermissions'&&account.role!=='admin')return json({error:'Alleen de hoofdbeheerder kan beheerrechten uitdelen'},403)
      await saveSetting(key,payload.value)
      await audit(account.name,account.id,'settings',key,`${key}: ${JSON.stringify(payload.value)}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'create_invite') {
      const delegated=account.role!=='admin'&&hasAdminFunction(account,requestSettings,'manageAccounts')
      if(account.role!=='admin'&&!delegated)return json({error:'Geen toegang'},403)
      if(delegated){const {data:target}=await db.from('dm_accounts').select('role').eq('id',String(payload.accountId||'')).maybeSingle();if(target?.role==='admin')return json({error:'Hoofdbeheerder-accounts zijn afgeschermd'},403)}
      return json({ok:true,invite:await createInvite(account,payload)})
    }

    return json({ error:'Onbekende actie' },400)
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : (e && typeof e === 'object' && 'message' in e ? String((e as any).message) : (()=>{ try { return JSON.stringify(e) } catch { return String(e) } })())
    return json({ error:msg || 'Onbekende fout' },500)
  }
})
