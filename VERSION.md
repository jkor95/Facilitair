# Meldpunt VWO v5.8.17

## Wijzigingen
- Interne meldingen kunnen worden verborgen uit **Actuele meldingen** op de melderspagina.
- Facilitair en Conciërge krijgen bij het maken van een melding een vinkje **Tonen bij Actuele meldingen op de melderspagina**. Dit staat standaard uit.
- In de detailweergave van iedere melding kunnen Facilitair, Conciërge en Hoofdbeheerder deze zichtbaarheid later wijzigen.
- Meldingen die via de openbare melderspagina worden gedaan met de voornaam of volledige naam van een actief Facilitair/Conciërge-account worden automatisch als intern behandeld. Naamvergelijking is niet hoofdlettergevoelig.
- De openbare dubbele-meldingcontrole laat interne meldingen niet zien.
- Bestaande meldingen van actieve Facilitair/Conciërge-accounts worden bij de eenmalige upgrade automatisch verborgen op basis van voornaam of volledige naam.

## Installatie
1. Voer `supabase/UPGRADE-v5.8.17-EENMALIG.sql` eenmalig uit.
2. Vervang daarna de bestaande `smart-function` door `supabase/functions/dalton-api/index.ts`.
3. Werk daarna GitHub bij met de bestanden uit deze versie.

Frontend/PWA-cache: 5.8.17.
