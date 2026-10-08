# Meldpunt VWO v5.8.2 installeren/updaten

> **v5.8.3:** de zichtbare pagina ververst niet meer automatisch tijdens typen/aanvinken. Achtergrondcontrole blijft actief. Voor deze update is alleen GitHub nodig; geen SQL en geen smart-function-update.


## Vanaf v5.8.0
Voor v5.8.2 is **geen nieuwe SQL-migratie** nodig. De nieuwe categorievolgorde en gedelegeerde beheerrechten worden opgeslagen in de bestaande `dm_settings`-tabel.

### 1. smart-function bijwerken
Open in Supabase de bestaande Edge Function `smart-function`. Vervang de volledige `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de function opnieuw. De bestaande eigen sessie/authenticatie blijft ongewijzigd.

### 2. GitHub bijwerken
Upload/vervang de websitebestanden uit deze release in de root van repository `Facilitair`. Laat `CNAME` aanwezig; deze bevat `meldpuntvwo.nl`.

### 3. Testen
Open `https://meldpuntvwo.nl/` en controleer als Hoofdbeheerder:

- **Meldpagina aanpassen** -> sortering en handmatige categorievolgorde van Actuele storingen.
- Een melding met e-mailadres -> **Terugkoppeling mailen**. Het concept bevat status en interne notitie maar geen handtekening.
- **Beheerfuncties per medewerker** -> wijs een testaccount een beheeronderdeel toe. Log met dat account in en controleer dat alleen het toegewezen onderdeel onder **Beheer** staat.

### Vanaf v5.7.7 of ouder
Voer eerst eenmalig `supabase/UPGRADE-v5.7.8-EENMALIG.sql` uit voordat je deze versie gebruikt.
