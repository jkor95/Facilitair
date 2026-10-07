# Meldpunt VWO v5.7.1 installeren/updaten

Deze versie bevat geen e-mailfunctionaliteit. Er zijn dus geen Resend-instellingen, afzenderadressen of ontvangstadressen nodig.

## 1. Supabase - eenmalige SQL

Als je v5.6.9 en v5.7.0 nog NIET hebt uitgevoerd, gebruik dan alleen:

`supabase/MIGRATIE-v5.7.1-EENMALIG.sql`

Open Supabase -> SQL Editor -> New query, plak de volledige inhoud en klik Run.
Deze ene migratie bevat de noodzakelijke databasewijzigingen voor meervoudige automatische toewijzing, tekstgroottes en dagelijkse ticketnummering.

## 2. Supabase - bestaande Edge Function bijwerken

Ga naar Supabase -> Edge Functions -> `smart-function` -> Edit.
Vervang de volledige inhoud van `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Klik daarna op Deploy updates. `Verify JWT` blijft UIT.

Er hoeven GEEN mail-secrets zoals `RESEND_API_KEY`, `MELDPUNT_MAIL_FROM` of `MELDPUNT_MAIL_REPLY_TO` ingesteld te worden.

## 3. GitHub

Upload de inhoud van deze map naar de root van repository `Facilitair` en vervang de bestaande bestanden.
De mapstructuur moet direct bijvoorbeeld `index.html`, `assets/`, `sw.js` en `manifest.webmanifest` bevatten.

De bestaande configuratie blijft:
- Website: https://jkor95.github.io/Facilitair/
- Edge Function: https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function

## 4. Test

Open na deploy:

`https://jkor95.github.io/Facilitair/?v=5.7.1`

Controleer daarna Admin, Facilitair, automatische toewijzing en ticketnummering.
