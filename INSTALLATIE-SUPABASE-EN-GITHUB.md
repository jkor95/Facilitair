# Meldpunt VWO v5.7.9 installeren/updaten

Deze release heeft **wel** een kleine databasewijziging en een update van `smart-function` nodig.

## 1. Database eenmalig bijwerken

Open in het bestaande Supabase-project de SQL Editor en voer de volledige inhoud uit van:

`supabase/UPGRADE-v5.7.8-EENMALIG.sql`

Dit voegt alleen het optionele e-mailadres van de melder toe en zet de standaardinstelling voor het openbare storingsoverzicht klaar. Bestaande meldingen blijven intact.

## 2. smart-function bijwerken

Open de bestaande Edge Function `smart-function`. Vervang de volledige `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de functie. De bestaande URL, secrets en `verify_jwt`-instelling blijven hetzelfde.

## 3. GitHub Pages bijwerken

Upload/vervang daarna de websitebestanden uit deze ZIP in de root van de repository. Laat `CNAME` staan; dit bevat `meldpuntvwo.nl`.

## 4. Controleren

Test op `https://meldpuntvwo.nl/`:

- een melding zonder e-mailadres;
- een melding met e-mailadres;
- de knop **Terugkoppeling mailen** bij een Facilitair/Conciërge-account;
- het openbare onderdeel **Actuele storingen**;
- in Hoofdbeheer > Meldpagina aanpassen de schakelaar voor het storingsoverzicht uit en weer aan.

Als een browser nog oude bestanden toont, open tijdelijk `https://meldpuntvwo.nl/?v=5.7.8`.
