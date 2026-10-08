# Meldpunt VWO v5.8.0 installeren/updaten

## Vanaf v5.7.9
Voor v5.8.0 is **geen nieuwe SQL-migratie** nodig. De nieuwe filters en sorteerinstelling worden opgeslagen in de bestaande `dm_settings`-tabel.

### 1. smart-function bijwerken
Open in Supabase je bestaande Edge Function `smart-function`. Vervang de volledige `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de function opnieuw. De eigen sessie/authenticatie blijft ongewijzigd en `verify_jwt` blijft uit zoals in de bestaande installatie.

### 2. GitHub bijwerken
Upload/vervang de websitebestanden uit deze release in de root van repository `Facilitair`. Laat `CNAME` aanwezig; deze wijst naar `meldpuntvwo.nl`.

### 3. Testen
Open `https://meldpuntvwo.nl/`. Log in als Hoofdbeheerder en ga naar **Meldpagina aanpassen**. Onder **Filter & sortering actuele storingen** kun je categorieen, statussen en sortering kiezen.

Controleer daarna op de openbare meldpagina dat **Actuele storingen** inklapbaar is en dat de gekozen filter/sortering zichtbaar is.

### Vanaf v5.7.7 of ouder
Voer eerst de eenmalige database-upgrade `supabase/UPGRADE-v5.7.8-EENMALIG.sql` uit voordat je deze versie gebruikt.
