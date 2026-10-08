# Installatie Meldpunt VWO v5.8.4

## Supabase
Er is **geen SQL-migratie** nodig. Open de bestaande Edge Function `smart-function`, vervang de volledige inhoud van `index.ts` door `supabase/functions/dalton-api/index.ts` uit deze release en deploy de function opnieuw. `verify_jwt` blijft uit, omdat Meldpunt VWO zijn eigen sessie- en toegangscontrole uitvoert.

## GitHub Pages
Vervang de websitebestanden in de root van de repository `Facilitair`. Behoud het bestand `CNAME` met `meldpuntvwo.nl`.

## Maandwoord instellen
Open als hoofdbeheerder of bevoegde medewerker **Beheer → Meldpagina aanpassen → Beveiliging melderspagina**. Vul een nieuw maandwoord in, zet **Maandwoord verplicht** aan en kies **Meldpagina opslaan**.

Het maandwoord is niet hoofdlettergevoelig. Het openbare formulier en het storingsoverzicht worden server-side afgeschermd. Na een juiste invoer geldt de toegang maximaal 12 uur binnen de huidige browsersessie; een nieuw maandwoord trekt bestaande toegang automatisch in.
