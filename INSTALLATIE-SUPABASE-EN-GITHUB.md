# Installatie Meldpunt VWO v5.8.7

## 1. Supabase
Er is voor deze versie **geen SQL-migratie** nodig.

Open in Supabase de bestaande Edge Function **smart-function**. Vervang de volledige inhoud van `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna dezelfde function opnieuw. De naam en URL blijven ongewijzigd.

## 2. GitHub Pages
Upload/vervang daarna de websitebestanden in de root van de bestaande repository. Het bestand `CNAME` moet blijven staan en bevat `meldpuntvwo.nl`.

## 3. Wat verandert
- De groene navigatieknop **Melding maken** boven de melderspagina is verwijderd.
- **Actuele storingen** heet voortaan **Actuele meldingen**.
- Een geldig maandwoord blijft maximaal 12 uur geldig, ook na afsluiten en opnieuw openen van de mobiele webapp.
- Bij opnieuw openen wordt de toegang gecontroleerd en worden de actuele meldingen opnieuw opgehaald.
- Na 12 uur, of zodra het maandwoord wordt gewijzigd, moet opnieuw het maandwoord worden ingevoerd.
- De kleine knop **Inloggen** bovenaan blijft altijd toegankelijk zonder maandwoord.
