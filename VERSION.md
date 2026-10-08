# Meldpunt VWO v5.8.6

Beveiliging melderspagina is losgetrokken van **Meldpagina aanpassen**.

## Nieuw
- **Beveiliging melderspagina** staat als eigen inklapbaar beheeronderdeel op de beheerpagina.
- Het beheerrecht **Beveiliging melderspagina** kan afzonderlijk aan een Facilitair- of Conciërge-medewerker worden toegewezen.
- Het huidige maandwoord wordt in dit onderdeel zichtbaar getoond aan de hoofdbeheerder en aan medewerkers die specifiek dit beheerrecht hebben.
- Het maandwoord blijft niet hoofdlettergevoelig.
- Inloggen voor Facilitair, Conciërge en hoofdbeheer is altijd mogelijk zonder maandwoord.
- Op het maandwoordscherm staat hiervoor nu ook een aparte knop **Facilitair / Conciërge inloggen**.

## Eenmalig na deze update
Het maandwoord uit v5.8.4 was alleen als hash opgeslagen en kan daarom niet worden teruggelezen. Als er al een maandwoord actief was, staat er na de update dat het woord uit de eerdere versie niet beschikbaar is. Stel één keer opnieuw hetzelfde of een nieuw maandwoord in. Vanaf dat moment is het huidige maandwoord zichtbaar in het beveiligingsonderdeel.

## Installatie vanaf v5.8.4
- Geen SQL-migratie nodig.
- Werk de bestaande `smart-function` bij met `supabase/functions/dalton-api/index.ts`.
- Vervang daarna de GitHub-bestanden door deze versie.

Backend/API-versie: 5.85. Frontend/PWA-cache: 5.8.6.
