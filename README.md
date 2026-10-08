# Meldpunt VWO v5.8.2

> **v5.8.3:** de zichtbare pagina ververst niet meer automatisch tijdens typen/aanvinken. Achtergrondcontrole blijft actief. Voor deze update is alleen GitHub nodig; geen SQL en geen smart-function-update.


Meldpunt VWO voor Stedelijk Dalton Lyceum Dordrecht. Publieke meldpagina op `https://meldpuntvwo.nl/` met een eigen werkomgeving voor Facilitair en Conciërge en een beheeromgeving voor Hoofdbeheer.

## Nieuw in v5.8.2
- Hoofdbeheer kan de volgorde van categorieën in **Actuele storingen** handmatig bepalen.
- De terugkoppelmail bevat de actuele status en interne notitie. Er wordt geen automatische handtekening toegevoegd; de medewerker gebruikt de handtekening uit het eigen mailprogramma.
- Hoofdbeheer kan per Facilitair- of Conciërge-account specifieke onderdelen van de beheerpagina toekennen.
- Een medewerker met gedelegeerde rechten krijgt naast het werkoverzicht een knop **Beheer** en ziet alleen de toegekende beheeronderdelen.
- Gedelegeerd accountbeheer kan geen Hoofdbeheerder-accounts zien, wijzigen of aanmaken.

## Update vanaf v5.8.0
Geen nieuwe database-migratie. Werk wel de bestaande Supabase `smart-function` bij met `supabase/functions/dalton-api/index.ts` en upload daarna de GitHub-bestanden.

Zie `START-HIER.txt` voor de korte stappen.
