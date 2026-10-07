import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

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

if (!SUPABASE_SECRET_KEY) throw new Error('Supabase secret key ontbreekt')
if (!MASTER_KEY_B64) throw new Error('DALTON_MASTER_KEY ontbreekt')

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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
  await audit(account.name, account.id, 'account', account.id, 'Ingelogd')
  return { token, account: safeAccount(account, false), expiresAt: expires }
}

function safeAccount(a: any, includePassword = false, plainPassword = '') {
  const out: any = {
    id: a.id, name: a.name, username: a.username, email: a.email || '', role: a.role,
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

async function getState(account: any) {
  if (account.role === 'staff') {
    return {
      version: 5,
      currentAccount: safeAccount(account, false),
      accounts: [], tickets: [], routing: {},
      settings: { showAuditToFacility: false, localNotifications: true }, auditLog: [],
    }
  }
  const [{ data: accounts }, { data: tickets }, { data: histories }, { data: routing }, { data: settings }, { data: audits }] = await Promise.all([
    db.from('dm_accounts').select('*').order('name'),
    db.from('dm_tickets').select('*').order('created_at', { ascending: false }),
    db.from('dm_ticket_history').select('*').order('at'),
    db.from('dm_routing').select('*'),
    db.from('dm_settings').select('*'),
    account.role === 'admin' ? db.from('dm_audit_logs').select('*').order('at', { ascending: false }).limit(5000) : Promise.resolve({ data: [] }),
  ])
  const histBy = new Map<number, any[]>()
  for (const h of histories || []) {
    if (!histBy.has(h.ticket_id)) histBy.set(h.ticket_id, [])
    histBy.get(h.ticket_id)!.push({ at: h.at, actor: h.actor, action: h.action })
  }
  const mappedAccounts = []
  for (const a of accounts || []) {
    let pw = ''
    if (account.role === 'admin') {
      try { pw = await decryptPassword(a.password_cipher, a.password_iv) } catch { pw = '(niet leesbaar)' }
    }
    mappedAccounts.push(safeAccount(a, account.role === 'admin', pw))
  }
  const mappedTickets = await Promise.all((tickets || []).map(async t => ({
    id: t.ticket_no || `M-${t.id}`,
    dbId: t.id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    reporter: t.reporter,
    reporterEmail: t.reporter_email,
    location: t.location,
    category: t.category,
    urgency: t.urgency,
    title: t.title,
    description: t.description,
    canContinue: t.can_continue,
    photo: await signedPhoto(t.photo_path),
    photoPath: t.photo_path,
    status: t.status,
    assignee: t.assignee || '',
    internalNote: t.internal_note,
    mailReporterOnComplete: !!t.mail_reporter_on_complete,
    completionMailPreparedAt: t.completion_mail_prepared_at,
    history: histBy.get(t.id) || [],
  })))
  const settingsObj: any = { showAuditToFacility: false, localNotifications: true }
  for (const s of settings || []) settingsObj[s.key] = s.value
  let auditRows: any[] = audits || []
  if (account.role === 'facility' && settingsObj.showAuditToFacility) {
    const { data: facilityAudits } = await db.from('dm_audit_logs').select('*').order('at', { ascending: false }).limit(5000)
    auditRows = facilityAudits || []
  }
  return {
    version: 5,
    currentAccount: safeAccount(account, account.role === 'admin', account.role === 'admin' ? await decryptPassword(account.password_cipher, account.password_iv).catch(()=>'') : ''),
    accounts: mappedAccounts,
    tickets: mappedTickets,
    routing: Object.fromEntries((routing || []).map((r: any) => [r.category, r.account_id || ''])),
    settings: settingsObj,
    auditLog: auditRows.map((x: any) => ({ id:x.id, at:x.at, actor:x.actor, actorId:x.actor_id, type:x.type, targetId:x.target_id, action:x.action })),
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

async function createTicket(payload: any, actorAccount: any | null) {
  const category = String(payload.category || '')
  const { data: route } = await db.from('dm_routing').select('account_id').eq('category', category).maybeSingle()
  const { data: inserted, error } = await db.from('dm_tickets').insert({
    reporter: String(payload.reporter || '').slice(0,160),
    reporter_email: String(payload.reporterEmail || '').slice(0,240),
    location: String(payload.location || '').slice(0,300),
    category,
    urgency: String(payload.urgency || 'normaal'),
    title: String(payload.title || '').slice(0,160),
    description: String(payload.description || '').slice(0,6000),
    can_continue: String(payload.canContinue || 'ja'),
    status: 'open',
    assignee: route?.account_id || null,
  }).select('*').single()
  if (error) throw error
  const year = new Date(inserted.created_at).getFullYear()
  const ticketNo = `M-${year}-${String(inserted.id).padStart(4,'0')}`
  let photoPath = null
  try { photoPath = await uploadPhoto(payload.photoData, inserted.id) } catch (e) { console.error('photo upload', e) }
  await db.from('dm_tickets').update({ ticket_no: ticketNo, photo_path: photoPath }).eq('id', inserted.id)
  const actor = actorAccount?.name || String(payload.reporter || 'Melder') || 'Melder'
  const actorId = actorAccount?.id || null
  await history(inserted.id, actor, actorId, 'Melding aangemaakt')
  if (route?.account_id) {
    const { data: assignee } = await db.from('dm_accounts').select('name').eq('id',route.account_id).maybeSingle()
    await history(inserted.id, 'Systeem', null, `Automatisch toegewezen aan ${assignee?.name || 'medewerker'}`)
  }
  let assigneeName = ''
  if (route?.account_id) {
    const { data: aa } = await db.from('dm_accounts').select('name').eq('id', route.account_id).maybeSingle()
    assigneeName = aa?.name || ''
  }
  return { id: ticketNo, dbId: inserted.id, assignee: route?.account_id || '', assigneeName }
}

async function updateTicket(account: any, payload: any) {
  const id = Number(payload.dbId)
  const { data: old } = await db.from('dm_tickets').select('*').eq('id', id).single()
  if (!old) throw new Error('Melding niet gevonden')
  const allowed: Record<string,string> = {
    location:'location', category:'category', urgency:'urgency', status:'status', assignee:'assignee',
    internalNote:'internal_note', mailReporterOnComplete:'mail_reporter_on_complete'
  }
  const patch: any = { updated_at: new Date().toISOString() }
  const changes: string[] = []
  for (const [clientKey, dbKey] of Object.entries(allowed)) {
    if (!(clientKey in payload)) continue
    let v = payload[clientKey]
    if (clientKey === 'assignee' && v === '') v = null
    const before = old[dbKey]
    if (String(before ?? '') !== String(v ?? '')) {
      patch[dbKey] = v
      changes.push(`${clientKey}: ${before ?? '-'} -> ${v ?? '-'}`)
    }
  }
  const becameDone = old.status !== 'done' && patch.status === 'done'
  if (becameDone && (patch.mail_reporter_on_complete ?? old.mail_reporter_on_complete) && old.reporter_email) {
    patch.completion_mail_prepared_at = new Date().toISOString()
  }
  const { error } = await db.from('dm_tickets').update(patch).eq('id', id)
  if (error) throw error
  if (changes.length) await history(id, account.name, account.id, changes.join(' | '))
  if (becameDone && patch.completion_mail_prepared_at) await history(id, account.name, account.id, 'Afrondingsmail voor melder voorbereid')
  const { data: updated } = await db.from('dm_tickets').select('*').eq('id', id).single()
  return { completionMail: becameDone && !!patch.completion_mail_prepared_at ? {
    to: updated.reporter_email,
    reporter: updated.reporter,
    ticketNo: updated.ticket_no,
    title: updated.title,
    location: updated.location,
    actor: account.name,
  } : null }
}

async function upsertAccount(admin: any, payload: any) {
  const isNew = !payload.id
  const username = String(payload.username || '').trim()
  if (!username) throw new Error('Inlognaam ontbreekt')
  const base: any = {
    name: String(payload.name || '').trim(), username, username_key: username.toLowerCase(),
    email: String(payload.email || '').trim(), role: String(payload.role || 'facility'), active: payload.active !== false,
    updated_at: new Date().toISOString(),
  }
  if (payload.password !== undefined && String(payload.password) !== '') Object.assign(base, await passwordFields(String(payload.password)))
  if (isNew) {
    if (!payload.password) throw new Error('Wachtwoord is verplicht bij een nieuw account')
    const { data, error } = await db.from('dm_accounts').insert(base).select('*').single()
    if (error) throw error
    await audit(admin.name, admin.id, 'account', data.id, `Account aangemaakt: ${data.name} (${data.username}), rol ${data.role}`)
    return data.id
  }
  const { data: before } = await db.from('dm_accounts').select('*').eq('id', payload.id).single()
  const { data, error } = await db.from('dm_accounts').update(base).eq('id', payload.id).select('*').single()
  if (error) throw error
  await audit(admin.name, admin.id, 'account', data.id, `Account gewijzigd: ${before?.name || ''} / ${before?.username || ''} / ${before?.role || ''} -> ${data.name} / ${data.username} / ${data.role}`)
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
  const { data:a } = await db.from('dm_accounts').select('name,username,email').eq('id',accountId).single()
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error:'Alleen POST toegestaan' },405)
  try {
    const body = await req.json().catch(()=>({}))
    const action = String(body.action || '')
    const payload = body.payload || {}

    if (action === 'health') return json({ ok:true, version:5 })
    if (action === 'login') {
      const result = await login(payload.username, payload.password)
      if (!result) return json({ error:'Onjuiste inlognaam of wachtwoord' },401)
      return json({ ok:true, ...result })
    }
    if (action === 'setup_password') return json({ ok:true, result: await setupPassword(payload) })
    if (action === 'public_create_ticket') return json({ ok:true, ticket: await createTicket(payload, null) })

    const account = await authenticate(req)
    if (!account) return json({ error:'Sessie verlopen of geen toegang' },401)

    if (action === 'logout') {
      const h=req.headers.get('Authorization')||''; const token=h.startsWith('Bearer ')?h.slice(7).trim():''
      if(token) await db.from('dm_sessions').delete().eq('token_hash',await sha256(token))
      return json({ok:true})
    }
    if (action === 'state') return json({ ok:true, state: await getState(account) })
    if (action === 'create_ticket') {
      const ticket = await createTicket(payload, account)
      return json({ ok:true, ticket, state: await getState(account) })
    }
    if (action === 'update_ticket') {
      if (!['admin','facility'].includes(account.role)) return json({error:'Geen toegang'},403)
      const result = await updateTicket(account,payload)
      return json({ok:true,...result,state:await getState(account)})
    }
    if (action === 'delete_ticket') {
      if (account.role !== 'admin') return json({error:'Geen toegang'},403)
      const id=Number(payload.dbId)
      const {data:t}=await db.from('dm_tickets').select('title,photo_path,ticket_no').eq('id',id).single()
      if(t?.photo_path) await db.storage.from('ticket-photos').remove([t.photo_path])
      await db.from('dm_tickets').delete().eq('id',id)
      await audit(account.name,account.id,'ticket',t?.ticket_no||String(id),`Melding verwijderd: ${t?.title||''}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'upsert_account') {
      if (account.role !== 'admin') return json({error:'Geen toegang'},403)
      await upsertAccount(account,payload)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'change_own_password') {
      await changeOwnPassword(account,payload)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'set_routing') {
      if(account.role!=='admin')return json({error:'Geen toegang'},403)
      const category=String(payload.category||''); const accountId=payload.accountId||null
      await db.from('dm_routing').upsert({category,account_id:accountId,updated_at:new Date().toISOString()})
      await audit(account.name,account.id,'routing',category,`${category} automatisch toegewezen aan ${accountId||'niemand'}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'set_setting') {
      if(account.role!=='admin')return json({error:'Geen toegang'},403)
      await db.from('dm_settings').upsert({key:String(payload.key),value:payload.value,updated_at:new Date().toISOString()})
      await audit(account.name,account.id,'settings',String(payload.key),`${payload.key}: ${JSON.stringify(payload.value)}`)
      return json({ok:true,state:await getState(account)})
    }
    if (action === 'create_invite') {
      if(account.role!=='admin')return json({error:'Geen toegang'},403)
      return json({ok:true,invite:await createInvite(account,payload)})
    }

    return json({ error:'Onbekende actie' },400)
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error:msg || 'Onbekende fout' },500)
  }
})
