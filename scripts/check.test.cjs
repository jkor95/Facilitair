const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');

test('PWA-iconen met versieparameter bestaan; een ontbrekend icoon faalt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meldpunt-check-'));
  try {
    const source = path.resolve(__dirname, '..');
    const files = ['CNAME', 'index.html', 'sw.js', 'manifest.webmanifest', 'VERSION.md',
      'assets/app.js', 'assets/config.js', 'assets/styles.css', 'scripts/check.cjs'];
    const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.webmanifest'), 'utf8'));
    const icons = manifest.icons.map(icon => icon.src.split(/[?#]/)[0]);
    for (const file of [...files, ...icons]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
      fs.copyFileSync(path.join(source, file), path.join(root, file));
    }
    const run = () => cp.spawnSync(process.execPath, [path.join(root, 'scripts/check.cjs')], {encoding: 'utf8'});
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    assert(icons.length > 0, 'Fixture moet een PWA-icoon bevatten');
    fs.unlinkSync(path.join(root, icons[0]));
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert(missing.stderr.includes('Ontbrekend PWA-icoon: '+icons[0]), missing.stderr);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

function ticketTestContext(){
  const storage = new Map();
  const localStorage = {getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,String(value)), removeItem: key => storage.delete(key)};
  const badge = [];
  const context = vm.createContext({window: {DALTON_CONFIG: {categories: []}}, localStorage, sessionStorage: localStorage,
    location: {search: ''}, URLSearchParams, navigator: {setAppBadge: async n => badge.push(n), clearAppBadge: async () => badge.push(0)}});
  const source = fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8');
  assert(source.includes('\ninit();'), 'Test moet startup vervangen om netwerkverkeer te voorkomen');
  vm.runInContext(source.replace('\ninit();', '\nglobalThis.ticketTests={facilityTicketGroups,openCountFor,updateBadge,onWayControlHtml,setFeatures:value=>serverFeatures=value,setState:value=>db=value};'),context);
  return {...context.ticketTests, localStorage, badge};
}

const ticketFixture = (dbId, status, assignees=[], urgency='normaal', updatedAt='2026-10-12T10:00:00Z') => ({
  dbId, id: `TEST-${dbId}`, status, assignees, urgency, createdAt: updatedAt, updatedAt,
  category: 'Testcategorie', location: 'Testruimte', description: 'Testomschrijving',
  photo: 'data:image/png;base64,fixture', history: [{action: 'Testgeschiedenis'}]
});

test('Werklijsten scheiden actieve en afgeronde tickets zonder kopieën of duplicaten', () => {
  const api=ticketTestContext();
  const tickets=[ticketFixture(1,'open'),ticketFixture(2,'progress',['me','other']),ticketFixture(3,'done',['me']),ticketFixture(4,'done')];
  const legacy={...ticketFixture(5,'wait'),assignee:'me'};
  tickets.push(legacy);
  const before=JSON.stringify(tickets),groups=api.facilityTicketGroups(tickets,'me');
  assert.equal(groups.mine.map(t=>t.dbId).join(','),'2,5');
  assert.equal(groups.general.map(t=>t.dbId).join(','),'1');
  assert.equal(groups.completed.map(t=>t.dbId).join(','),'3,4');
  const all=[...groups.mine,...groups.general,...groups.completed];
  assert.equal(new Set(all.map(t=>t.dbId)).size,tickets.length);
  for(const ticket of all)assert.strictEqual(ticket,tickets.find(t=>t.dbId===ticket.dbId));
  assert.equal(JSON.stringify(tickets),before);
});

test('Afronden en heropenen verplaatsen toegewezen en algemene tickets direct', () => {
  const api=ticketTestContext(),mine=ticketFixture(1,'open',['me']),general=ticketFixture(2,'open'),tickets=[mine,general];
  for(const ticket of tickets){
    ticket.status='done';
    const groups=api.facilityTicketGroups(tickets,'me');
    assert(![...groups.mine,...groups.general].includes(ticket));
    assert(groups.completed.includes(ticket));
  }
  mine.status='open';general.status='wait';
  const groups=api.facilityTicketGroups(tickets,'me');
  assert.strictEqual(groups.mine[0],mine);
  assert.strictEqual(groups.general[0],general);
  assert.equal(groups.completed.length,0);
});

test('Urgentie sorteert alleen actieve werklijsten; afgerond sorteert op laatste wijziging', () => {
  const api=ticketTestContext();
  const tickets=[ticketFixture(1,'open'),ticketFixture(2,'open',[],'spoed'),ticketFixture(3,'done',[],'spoed','2020-01-01T10:00:00Z'),ticketFixture(4,'done')];
  const groups=api.facilityTicketGroups(tickets,'me');
  assert.equal(groups.general.map(t=>t.dbId).join(','),'2,1');
  assert.equal(groups.completed.map(t=>t.dbId).join(','),'4,3');
});

test('Openstaande aantallen en badge sluiten afgeronde tickets uit', async () => {
  const api=ticketTestContext(),account={id:'me',role:'facility'};
  api.setState({currentAccount:account,settings:{rolePermissions:{}},tickets:[ticketFixture(1,'open',['me']),ticketFixture(2,'done',['me']),ticketFixture(3,'open'),ticketFixture(4,'done',[],'spoed')]});
  api.localStorage.setItem('dalton_notifications_me','1');
  assert.equal(api.openCountFor(),2);
  assert.equal(api.openCountFor('me'),1);
  await api.updateBadge();
  assert.deepEqual(api.badge,[2]);
});

test('Onderwegknop voor iedere bevoegde medewerker bij open tickets, ook zonder toewijzing',()=>{
 const api=ticketTestContext(),ticket=ticketFixture(10,'open',['other']);
 api.setFeatures({onWay:1,onWayUnassigned:1});
 for(const role of ['admin','facility','concierge']){
  api.setState({currentAccount:{id:'me',role},settings:{rolePermissions:{}}});
  assert(api.onWayControlHtml(ticket).includes('Ik ben onderweg'),role);
  assert.equal(api.onWayControlHtml({...ticket,status:'done'}),'');
 }
 for(const permission of ['editStatus','viewAllTickets']){
  api.setState({currentAccount:{id:'me',role:'facility'},settings:{rolePermissions:{facility:{[permission]:false}}}});
  assert.equal(api.onWayControlHtml(ticket),'');
 }
 api.setState({currentAccount:{id:'me',role:'staff'},settings:{rolePermissions:{}}});
 assert.equal(api.onWayControlHtml(ticket),'');
 api.setState({currentAccount:{id:'me',role:'facility'},settings:{rolePermissions:{}}});
 api.setFeatures({onWay:1});
 assert.equal(api.onWayControlHtml(ticket),'');
 assert(api.onWayControlHtml({...ticket,assignedToMe:true}).includes('Ik ben onderweg'));
});
