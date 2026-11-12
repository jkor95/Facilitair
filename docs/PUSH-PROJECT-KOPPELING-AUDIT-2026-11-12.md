# Meldpunt VWO / Facilitair — push- en projectkoppeling (alleen-lezen audit)

**Controle 12 november 2026.** Bron `jkor95/Facilitair` `main` commit `f41b735e3b451714ed59b38d091d67f5f41f306d` en concept-PR [#4](https://github.com/jkor95/Facilitair/pull/4) `codex/web-push-voorbereiding`. **Geen** deployment, databasewijziging, pushverzending of test op bestaande medewerkers uitgevoerd.

## Vastgesteld uit de broncode

1. **Werkelijke frontend-configuratie:** `assets/config.js` op `main` stuurt naar `https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function`. Publieke site `https://meldpuntvwo.nl/`. Projectref is dus **`xmmrplvhkfvyfqwjrugl`** volgens de geversioneerde frontend; verifieer of de live frontend dezelfde versie heeft.
2. **GitHub-main backend:** `supabase/functions/dalton-api/index.ts` bevat wel een nieuwere pushimplementatie, maar er staat **geen** `supabase/functions/smart-function/index.ts` op `main`. De `dalton-api` heeft expliciet een projectguard voor hetzelfde ref `xmmrplvhkfvyfqwjrugl`; dat is geen bewijs dat de functie als `smart-function` is gedeployed.
3. **Main pushcontract:** de backend ondersteunt `push_config`, `push_register`, `push_unregister`, `push_test`, `push_preferences`; tevens verzending rond nieuwe/gewijzigde tickets en onderwegmeldingen. De frontend heeft bijbehorende registratielogica in `assets/app.js`. De service worker `sw.js` behandelt push en klikacties. Featureweergave is afhankelijk van `serverFeatures.webPush` en `serverFeatures.pushUrgencies` uit de serverstatus.
4. **Opt-in in backend:** `vapidConfig()` vereist expliciet `DM_WEB_PUSH_ENABLED=true` én `DM_VAPID_PUBLIC_KEY`, `DM_VAPID_PRIVATE_KEY`, `DM_VAPID_SUBJECT`. Alleen de **namen** van de secrets zijn relevant; nooit waarden kopiëren naar Git of een chat.
5. **Database-afhankelijkheden:** het nieuwere backendpad verwijst naar `dm_push_subscriptions`, `dm_push_preferences`, `dm_push_deliveries` en de RPC's `dm_claim_push_deliveries`, `dm_pending_ticket_push`, `dm_register_push`, `dm_test_push`. Niet aannemen dat deze objecten al op het echte project bestaan. Eerst **alleen-lezen** cataloguscontrole, pas later eventueel een apart beoordeelde migratie.
6. **Verouderde PR #4:** deze bevat een oudere `smart-function` met afwijkende acties zoals `push_public_key`, `push_subscribe`, `push_unsubscribe`; een andere SQL-schets `supabase/web-push.sql` en andere VAPID-secretnamen. Blind mergen of de volledige functie overschrijven kan nieuwere server-, push- en toewijzingsfunctionaliteit terugdraaien. PR #4 **niet mergen of deployen** zonder diff en exacte actieve productiebron.

## Gecontroleerde toegang

In de twee **momenteel gekoppelde** Supabase-accounts verschijnen uitsluitend projecten **JK Works**, **Sport** en **LCP knop**. Project `xmmrplvhkfvyfqwjrugl` is niet zichtbaar. **LCP knop is niet Meldpunt VWO**: geen functies of SQL op dat project uitvoeren als workaround. Afwezigheid in deze accounts bewijst niet dat het Meldpunt-project niet bestaat, alleen dat deze verbindingen het project niet ontsluiten.

## Veilige concrete vervolgstappen voor Work

1. Leg van `https://meldpuntvwo.nl/` de werkelijk geleverde `assets/config.js`, `assets/app.js` en `sw.js` (versies/hashes) naast `main`. Geen serviceworkerregistraties of gebruikersinstellingen wijzigen voor deze audit.
2. Controleer via een **bevoegde verbinding met exact project `xmmrplvhkfvyfqwjrugl`** alleen-lezen welke Edge Functions live bestaan (`smart-function` versus `dalton-api`), hun versies en veilige, niet-geheime runtimeconfiguratie. Geen projectnamen gokken.
3. Vergelijk de actieve `smart-function` met de nieuwste `dalton-api` en de werkelijke frontend-acties. **Niet** `dalton-api` zonder meer als `smart-function` publiceren: eerst volledige compatibiliteitsdiff (ticketacties, rollen, logs, onderwegmeldingen, notificaties).
4. Controleer alleen-lezen of alle benodigde push-tabellen/RPC's/migratieversies bestaan; raak geen echte tickets, accounts, wachtwoorden, abonnementen of pushregistraties aan.
5. Beoordeel PR #4 als mogelijk verouderd en bepaal pas daarna of deze formeel gesloten kan worden. Werk nieuwe veranderingen in een aparte actuele branch uit, zonder oudere productiecode te overschrijven.
6. Bouw veilige tests met uitsluitend fictieve accounts/tickets: autorisatie per rol, aanmelden/afmelden van apparaten, sleutelrotatie, duplicate-event bescherming, urgentiefilters, onderweg en rollback. Zonder een gecontroleerde actieve projectkoppeling **niet publiceren**.

**Overdracht / niet dubbel doen:** GitHub-main heeft al pushclient- en backendcode; bouw dit niet een tweede keer op basis van de oude PR #4. Voor SchermLoop is de beperkte V2-verkoopsite-publicatie afgerond; deze audit staat daar los van. Ook JK Works #86 en documentatie-PR #87 worden hierdoor niet gewijzigd.

**Onbekend / niet geclaimd:** of de website live dezelfde code serveert; of de functie `smart-function` live overeenkomt met `dalton-api`; of VAPID ingeschakeld is; of de database-RPC's bestaan; of een echte push bezorgd wordt.
