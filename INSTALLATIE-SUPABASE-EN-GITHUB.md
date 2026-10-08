# Installatie Meldpunt VWO v5.8.5

## 1. Supabase
Er is voor deze versie **geen SQL-migratie** nodig.

Open in Supabase de bestaande Edge Function **smart-function**. Vervang de volledige inhoud van `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna dezelfde function opnieuw. De naam en URL van de function blijven ongewijzigd.

## 2. GitHub Pages
Upload/vervang de websitebestanden in de root van de bestaande repository. Het bestand `CNAME` moet blijven staan en bevat `meldpuntvwo.nl`.

## 3. Beveiliging melderspagina
Na inloggen staat **Beveiliging melderspagina** als een eigen inklapbaar onderdeel op de beheerpagina.

Hier kun je:
- het huidige maandwoord bekijken;
- een nieuw maandwoord instellen;
- `Maandwoord verplicht` aan of uit zetten.

Het maandwoord is niet hoofdlettergevoelig.

### Bestaand woord uit v5.8.4
In v5.8.4 werd alleen een eenrichtingshash van het maandwoord opgeslagen. Daardoor kan een woord dat vóór v5.8.5 was ingesteld niet worden teruggelezen. Stel na de update één keer opnieuw hetzelfde of een nieuw maandwoord in. Vanaf dat moment wordt het actuele woord zichtbaar opgeslagen voor bevoegde beheerders.

## 4. Recht afzonderlijk toewijzen
De hoofdbeheerder kan in **Beheerfuncties per medewerker** het losse recht **Beveiliging melderspagina** toewijzen aan een Facilitair- of Conciërge-medewerker. Dit staat los van het recht **Meldpagina aanpassen**.

Alleen de hoofdbeheerder en medewerkers met dit specifieke beheerrecht ontvangen het zichtbare maandwoord vanuit de backend.

## 5. Inloggen zonder maandwoord
Het maandwoord beveiligt uitsluitend de openbare melderspagina. De gewone inlog voor Facilitair, Conciërge en hoofdbeheer blijft altijd toegankelijk. Op het maandwoordscherm staat hiervoor ook de knop **Facilitair / Conciërge inloggen**.
