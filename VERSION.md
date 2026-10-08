# Meldpunt VWO v5.8.4

Nieuwe beveiliging voor de openbare melderspagina.

## Nieuw
- De melderspagina kan worden beveiligd met een handmatig ingesteld **maandwoord**.
- Alleen na een juist maandwoord wordt de openbare meldpagina geopend.
- Het maandwoord is **niet hoofdlettergevoelig**.
- Hoofdbeheer en medewerkers met de gedelegeerde beheerfunctie **Meldpagina aanpassen** kunnen het maandwoord wijzigen en de beveiliging aan/uit zetten.
- Het maandwoord zelf wordt niet naar de openbare website gestuurd; alleen een hash wordt centraal opgeslagen.
- Na een correcte invoer krijgt het apparaat een tijdelijke toegang voor maximaal 12 uur binnen de huidige browsersessie.
- Zodra het maandwoord wordt gewijzigd, worden eerder uitgegeven toegangen automatisch ongeldig.
- Zowel het openbare storingsoverzicht als het versturen van een nieuwe melding worden server-side geblokkeerd zonder geldige toegang.

## Installatie vanaf v5.8.3
- Geen SQL-migratie nodig.
- Werk de bestaande `smart-function` bij met `supabase/functions/dalton-api/index.ts`.
- Vervang daarna de GitHub-bestanden door deze versie.

Backend/API-versie: 5.84. Frontend/PWA-cache: 5.8.4.
