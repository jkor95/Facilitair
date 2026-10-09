# Installatie Meldpunt VWO v5.8.8

Deze release gebruikt dezelfde database als v5.8.7. **Er is geen SQL-migratie nodig.**

## 1. Supabase - alleen smart-function bijwerken

Open in het bestaande Supabase-project de Edge Function `smart-function`.
Vervang de volledige code door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de bestaande function opnieuw. De function blijft dezelfde URL gebruiken.

Deze backendwijziging is in deze release noodzakelijk omdat het wijzigen van de meldingstitel server-side gecontroleerd wordt en omdat het beheerrecht voor **Actuele meldingen** apart wordt afgedwongen.

## 2. GitHub Pages

Upload/vervang daarna de bestanden uit deze release in de root van de GitHub-repository `Facilitair`.

Behoud `CNAME` met:

`meldpuntvwo.nl`

## 3. Controle

Controleer na deploy:

- een melding openen en de titel wijzigen;
- de wijzigingsgeschiedenis bekijken bij een bestaande melding met een toewijzingswijziging;
- Beheer -> Rollen & rechten -> **Titel melding wijzigen**;
- Beheer -> **Meldpagina: groen informatievlak & voorbeelden**;
- Beheer -> **Actuele meldingen: overzicht, filters & volgorde**;
- op de melderspagina: groen informatievlak, daarna ingeklapte Actuele meldingen, daarna het meldformulier.

## 4. Geen SQL

Voer voor v5.8.8 geen SQL-bestand uit. Bestaande meldingen en instellingen blijven behouden.
