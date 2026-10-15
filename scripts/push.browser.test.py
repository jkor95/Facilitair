"""Lokale browserfixtures; geen echte accounts, providers of pushsubscriptions.
Vereist Playwright en Chromium/Chrome. Start zelf een lokale statische testserver.
"""
import functools
import http.server
import json
import pathlib
import shutil
import threading
from playwright.sync_api import sync_playwright, expect

ROOT=pathlib.Path(__file__).resolve().parent.parent
PUBLIC_KEY='B'+'A'*86

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def state_fixture():
    actor=dict(id='me',name='Fixturemedewerker',username='fixture',role='facility',active=True)
    other=dict(id='other',name='Andere fixture',role='concierge',active=True)
    def ticket(i,urgency,assigned=True,status='open'):
        return dict(dbId=i,id=f'TEST-{i}',title=f'Fixtureticket {i}',status=status,urgency=urgency,
            assignees=['me','other'] if assigned else ['other'],assignedToMe=assigned,onWay=[],
            category='ICT / apparatuur',location='TEST-ruimte',description='Fixtureomschrijving',
            createdAt='2026-10-15T10:00:00Z',updatedAt='2026-10-15T10:00:00Z',history=[],internalNote='Fixturenotitie')
    unassigned=ticket(6,'normaal',False);unassigned['assignees']=[]
    return dict(currentAccount=actor,accounts=[actor,other],routing={},auditLog=[],settings={},
        tickets=[ticket(1,'spoed'),ticket(2,'hoog',False),ticket(3,'normaal'),ticket(4,'laag'),ticket(5,'hoog',True,'done'),unassigned])

PUSH_STUB="""
window.fixture={permission:'default',permissionRequests:0,subscriptions:0,unsubscribes:0,sub:null};
class FixtureNotification{static get permission(){return fixture.permission}static async requestPermission(){fixture.permissionRequests++;fixture.permission='granted';return 'granted'}}
Object.defineProperty(window,'Notification',{value:FixtureNotification});
Object.defineProperty(window,'PushManager',{value:function(){}});
const registration={pushManager:{getSubscription:async()=>fixture.sub,subscribe:async options=>{
 fixture.subscriptions++;fixture.sub={options,unsubscribe:async()=>{fixture.unsubscribes++;fixture.sub=null;return true},toJSON:()=>({endpoint:'https://fcm.googleapis.com/browser-fixture',keys:{p256dh:'B'+'A'.repeat(86),auth:'A'.repeat(22)}})};return fixture.sub;
}}};
Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>registration,ready:Promise.resolve(registration),getRegistration:async()=>registration,addEventListener:()=>{}}});
"""

def frontend_tests(browser,base):
    state=state_fixture();calls=[];errors=[];external=[];push_events=set();registrations={};test_events=set();dialogs=[]
    unassigned_supported=True
    urgency_supported=True
    preferences=dict(laag=False,normaal=False,hoog=True,spoed=True)
    preference_failure=False
    preference_read_failure=False
    context=browser.new_context(service_workers='block')
    context.add_init_script(PUSH_STUB+"localStorage.setItem('dalton_meldpunt_v5_token','fixture-token');")
    def route(route):
        req=route.request
        if req.url.startswith(base):route.continue_();return
        if req.url!='https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function':external.append(req.url);route.abort();return
        body=req.post_data_json;calls.append(body);action=body['action'];payload=body.get('payload',{})
        if action=='health':out=dict(ok=True,features=dict(onWay=1,webPush=1,onWayUnassigned=1 if unassigned_supported else 0,pushUrgencies=1 if urgency_supported else 0))
        elif action=='state':out=dict(state=state)
        elif action=='login':out=dict(token='fixture-token')
        elif action=='public_config':out=dict(settings=dict(publicAccessGateEnabled=False))
        elif action in ['public_outages','public_duplicate_check']:out=dict(items=[])
        elif action=='on_way_state':out=dict(rows=[dict(ticketId=t['dbId'],**r) for t in state['tickets'] for r in t['onWay']])
        elif action=='set_on_way':
            assert set(payload)=={'dbId','active','requestId'}
            t=next(t for t in state['tickets'] if t['dbId']==payload['dbId'])
            own=any(r['accountId']=='me' for r in t['onWay'])
            if payload['active'] and not own:
                t['onWay'].append(dict(accountId='me',name='Fixturemedewerker',since='2026-10-15T10:00:00Z'))
                if t['urgency'] in ['hoog','spoed']:push_events.add(payload['requestId'])
            elif not payload['active']:t['onWay']=[r for r in t['onWay'] if r['accountId']!='me']
            out=dict(state=state,delivery=dict(configured=True,sent=1 if payload['requestId'] in push_events else 0,failed=0))
        elif action=='push_config':out=dict(configured=True,publicKey=PUBLIC_KEY)
        elif action=='push_preferences':
            if preference_read_failure:
                route.fulfill(status=500,content_type='application/json',body=json.dumps(dict(error='Fixture laden mislukt')));return
            if preference_failure and 'urgencies' in payload:
                route.fulfill(status=500,content_type='application/json',body=json.dumps(dict(error='Fixture opslaan mislukt')));return
            if 'urgencies' in payload:
                assert set(payload)=={'urgencies'}
                assert set(payload['urgencies'])=={'laag','normaal','hoog','spoed'}
                preferences.update(payload['urgencies'])
            out=dict(ok=True,urgencies=preferences)
        elif action=='push_register':registrations[payload['subscription']['endpoint']]=payload['deviceId'];out=dict(ok=True)
        elif action=='push_unregister':registrations.clear();out=dict(ok=True)
        elif action=='push_test':test_events.add(payload['requestId']);out=dict(delivery=dict(sent=1,failed=0))
        else:raise AssertionError(action)
        route.fulfill(status=200,content_type='application/json',body=json.dumps(out))
    context.route('**/*',route)
    page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
    page.goto(base);page.locator('#navDashboard').click()
    expect(page.locator('#myAssignedTickets [data-on-way-ticket="1"]')).to_be_visible()
    expect(page.locator('#generalTickets [data-on-way-ticket="2"]')).to_be_visible()
    expect(page.locator('#generalTickets [data-on-way-ticket="6"]')).to_be_visible()
    expect(page.locator('#completedTickets [data-on-way-ticket="5"]')).to_have_count(0)
    assert page.evaluate('fixture.permissionRequests')==0
    page.locator('#myAssignedTickets [data-on-way-ticket="1"]').click()
    expect(page.locator('#myAssignedTickets [data-on-way-status="1"]')).to_contain_text('Fixturemedewerker')
    assert len(push_events)==1
    expect(page.locator('#myAssignedTickets [data-on-way-ticket="1"]')).to_have_text('Onderweg intrekken')
    # Synchronisatie van een collega mag een open detailformulier niet resetten.
    page.locator('#myAssignedTickets [data-ticket="1"]').click()
    page.locator('#mNote').fill('Onopgeslagen fixturenotitie')
    state['tickets'][0]['onWay'].append(dict(accountId='other',name='Andere fixture',since='2026-10-15T10:01:00Z'))
    expect(page.locator('.modal [data-on-way-status="1"]')).to_contain_text('Andere fixture',timeout=10000)
    expect(page.locator('#mNote')).to_have_value('Onopgeslagen fixturenotitie')
    page.locator('.modal [data-on-way-ticket="1"]').click()
    expect(page.locator('.modal [data-on-way-status="1"]')).not_to_contain_text('Fixturemedewerker')
    expect(page.locator('.modal [data-on-way-status="1"]')).to_contain_text('Andere fixture')
    assert len(push_events)==1
    page.locator('.modal .close').click()
    for ticket_id in [3,4]:
        page.locator(f'#myAssignedTickets [data-on-way-ticket="{ticket_id}"]').click()
        expect(page.locator(f'#myAssignedTickets [data-on-way-status="{ticket_id}"]')).to_contain_text('Fixturemedewerker')
    assert len(push_events)==1
    # Zonder toewijzing onderweg, direct zichtbaar en na herladen behouden.
    page.locator('#generalTickets [data-on-way-ticket="2"]').click()
    expect(page.locator('#generalTickets [data-on-way-status="2"]')).to_contain_text('Fixturemedewerker')
    assert state['tickets'][1]['assignees']==['other']
    assert state['tickets'][1]['status']=='open'
    assert len(push_events)==2
    page.reload();page.locator('#navDashboard').click()
    expect(page.locator('#generalTickets [data-on-way-status="2"]')).to_contain_text('Fixturemedewerker')
    page.locator('#generalTickets [data-ticket="2"]').click()
    expect(page.locator('.modal [data-on-way-ticket="2"]')).to_have_text('Onderweg intrekken')
    page.locator('.modal [data-on-way-ticket="2"]').click()
    expect(page.locator('.modal [data-on-way-status="2"]')).not_to_contain_text('Fixturemedewerker')
    page.locator('.modal .close').click()
    page.locator('#generalTickets [data-on-way-ticket="6"]').click()
    expect(page.locator('#generalTickets [data-on-way-status="6"]')).to_contain_text('Fixturemedewerker')
    assert state['tickets'][-1]['assignees']==[]
    assert len(push_events)==2
    page.locator('#myAccountDetails > summary').click()
    expect(page.locator('#pushUrgencies')).to_be_enabled()
    for urgency in ['laag','normaal']:expect(page.locator(f'[data-push-urgency="{urgency}"]')).not_to_be_checked()
    for urgency in ['hoog','spoed']:expect(page.locator(f'[data-push-urgency="{urgency}"]')).to_be_checked()
    for urgency in ['laag','normaal']:page.locator(f'[data-push-urgency="{urgency}"]').check()
    for urgency in ['hoog','spoed']:page.locator(f'[data-push-urgency="{urgency}"]').uncheck()
    page.locator('#savePushUrgencies').click()
    expect(page.locator('#pushUrgencyStatus')).to_contain_text('opgeslagen')
    assert preferences==dict(laag=True,normaal=True,hoog=False,spoed=False)
    assert not registrations
    # De keuze blijft na herladen bestaan en verandert de lokale badgekeuze niet.
    page.reload();page.locator('#navDashboard').click()
    if not page.locator('#myAccountDetails').evaluate('(el)=>el.open'):page.locator('#myAccountDetails > summary').click()
    expect(page.locator('#pushUrgencies')).to_be_enabled()
    expect(page.locator('[data-push-urgency="laag"]')).to_be_checked()
    expect(page.locator('[data-push-urgency="spoed"]')).not_to_be_checked()
    expect(page.locator('[data-notify-urgency="spoed"]')).to_be_checked()
    preference_failure=True
    page.locator('[data-push-urgency="spoed"]').check();page.locator('#savePushUrgencies').click()
    expect(page.locator('#pushUrgencyStatus')).to_contain_text('Opslaan mislukt')
    assert preferences['spoed'] is False
    preference_failure=False
    page.locator('[data-push-urgency="spoed"]').uncheck()
    page.locator('#enableWebPush').click()
    expect(page.locator('#webPushStatus')).to_contain_text('ingeschakeld')
    assert page.evaluate('fixture.permissionRequests')==1
    assert page.evaluate('fixture.subscriptions')==1
    page.locator('#enableWebPush').click()
    expect(page.locator('#enableWebPush')).to_be_enabled()
    assert page.evaluate('fixture.subscriptions')==1
    assert len(registrations)==1
    assert preferences==dict(laag=True,normaal=True,hoog=False,spoed=False)
    page.locator('#testWebPush').click()
    expect(page.locator('#webPushStatus')).to_contain_text('Testmelding verstuurd')
    assert len(test_events)==1
    page.locator('#disableWebPush').click()
    expect(page.locator('#webPushStatus')).to_contain_text('uitgeschakeld')
    assert not registrations
    page.locator('#enableWebPush').click()
    expect(page.locator('#webPushStatus')).to_contain_text('ingeschakeld')
    assert len(registrations)==1
    page.goto(base+'?ticket=1')
    expect(page.locator('.modal')).to_contain_text('TEST-1')
    page.locator('.modal .close').click()
    expect(page.locator('#myAssignedTickets [data-on-way-status="3"]')).to_contain_text('Fixturemedewerker')
    with page.expect_event('dialog'):
        page.goto(base+'?ticket=9999')
    assert any('geen toegang' in message for message in dialogs)
    assert not errors,errors
    assert not external,external
    context.close()
    # Een pushlink geeft zonder sessie alleen het bestaande inlogformulier.
    guest=browser.new_context(service_workers='block');guest.add_init_script(PUSH_STUB)
    guest.route('**/*',route)
    page=guest.new_page();page.goto(base+'?ticket=1')
    expect(page.locator('#loginForm')).to_be_visible();expect(page.locator('.modal')).to_have_count(0)
    page.locator('#loginForm [name=username]').fill('fixture')
    page.locator('#loginForm [name=password]').fill('fixture-password')
    page.locator('#loginForm button[type=submit]').click()
    expect(page.locator('.modal')).to_contain_text('TEST-1')
    guest.close()
    # Met een oudere backend geen knop aanbieden die de server nog weigert.
    unassigned_supported=False
    urgency_supported=False
    legacy=browser.new_context(service_workers='block')
    legacy.add_init_script(PUSH_STUB+"localStorage.setItem('dalton_meldpunt_v5_token','fixture-token');")
    legacy.route('**/*',route)
    page=legacy.new_page();page.goto(base);page.locator('#navDashboard').click()
    expect(page.locator('#generalTickets [data-on-way-ticket="2"]')).to_have_count(0)
    expect(page.locator('#myAssignedTickets [data-on-way-ticket="1"]')).to_be_visible()
    expect(page.locator('#pushUrgencies')).to_have_count(0)
    legacy.close()
    # Een ander apparaat leest dezelfde accountkeuze; bij laadfout niets overschrijven.
    urgency_supported=True
    second=browser.new_context(service_workers='block')
    second.add_init_script(PUSH_STUB+"localStorage.setItem('dalton_meldpunt_v5_token','fixture-token');")
    second.route('**/*',route)
    page=second.new_page();page.goto(base);page.locator('#navDashboard').click()
    page.locator('#myAccountDetails > summary').click()
    expect(page.locator('#pushUrgencies')).to_be_enabled()
    expect(page.locator('[data-push-urgency="laag"]')).to_be_checked()
    expect(page.locator('[data-push-urgency="spoed"]')).not_to_be_checked()
    preference_read_failure=True
    page.reload();page.locator('#navDashboard').click()
    expect(page.locator('#pushUrgencyStatus')).to_contain_text('konden niet worden geladen')
    expect(page.locator('#savePushUrgencies')).to_be_disabled()
    for urgency in ['laag','normaal','hoog','spoed']:expect(page.locator(f'[data-push-urgency="{urgency}"]')).to_be_disabled()
    assert preferences==dict(laag=True,normaal=True,hoog=False,spoed=False)
    second.close()
    print('Browser: persoonlijke pushurgenties, bewaren/herladen/tweede apparaat, fouten zonder overschrijven, lokale badges apart, onderweg, oude backend en ticketlinks OK')

def worker_tests(browser,base):
    context=browser.new_context(service_workers='allow')
    context.route('**/worker-fixture',lambda route:route.fulfill(content_type='text/html',body='<html>Workerfixture</html>'))
    page=context.new_page();page.goto(base+'worker-fixture')
    page.evaluate("async()=>{await caches.open('meldpunt-vwo-v5.8.24');await caches.open('andere-app');await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready}")
    page.wait_for_function("async()=>!(await caches.keys()).includes('meldpunt-vwo-v5.8.24')")
    assert 'andere-app' in page.evaluate('caches.keys()')
    worker=context.service_workers[0]
    result=worker.evaluate("""async()=>{
      self.fixtureNotifications=[];
      self.registration.showNotification=async(title,options)=>fixtureNotifications.push({title,...options});
      const payload={eventId:'20000000-0000-4000-8000-000000000001',ticketId:1,title:'Fixture – SPOED',body:'Fixture is onderweg'};
      const push=async data=>{let pending;const event=new Event('push');event.data={json:()=>data};event.waitUntil=p=>pending=p;self.dispatchEvent(event);await pending};
      await Promise.all([push(payload),push(payload)]);await push(payload);
      if(fixtureNotifications.length!==1)throw new Error('Dubbele pushmelding');
      const target=[];
      self.clients.matchAll=async()=>[{url:self.registration.scope,navigate:async url=>{target.push(url);return {focus:async()=>{}}},focus:async()=>{}}];
      let pending;const click=new Event('notificationclick');click.notification={data:{ticketId:1,url:'https://attacker.invalid'},close:()=>{}};click.waitUntil=p=>pending=p;self.dispatchEvent(click);await pending;
      return {notifications:fixtureNotifications,target};
    }""")
    assert len(result['notifications'])==1
    assert result['target']==[base+'?ticket=1']
    assert result['notifications'][0]['icon']=='./assets/icon-192.png'
    context.close()
    print('Serviceworker: nieuwe cache, duurzame dubbele-eventonderdrukking, bestaand icoon en uitsluitend eigen ticket-URL OK')

def main():
    handler=functools.partial(Handler,directory=str(ROOT))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            executable=shutil.which('chromium') or shutil.which('google-chrome')
            if not executable:raise RuntimeError('Installeer Chromium of Google Chrome voor deze browsertests')
            browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
            try:frontend_tests(browser,base);worker_tests(browser,base)
            finally:browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':main()
