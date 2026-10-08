# Meldpunt VWO v5.8.0

Meldpunt VWO voor Stedelijk Dalton Lyceum Dordrecht. Publieke meldpagina op `https://meldpuntvwo.nl/` met een eigen beheeromgeving voor Facilitair, Conciërge en Hoofdbeheer.

## Nieuw in v5.8.0
Hoofdbeheer kan het openbare onderdeel **Actuele storingen** filteren op categorie en status en de sortering kiezen. De standaard sortering groepeert meldingen per categorie. Op de melderspagina is het overzicht nu inklapbaar en de keuze open/dicht wordt lokaal onthouden.

## Update vanaf v5.7.9
Er is geen nieuwe database-migratie. Vervang wel de bestaande Supabase `smart-function` door `supabase/functions/dalton-api/index.ts` en upload vervolgens de nieuwe GitHub-bestanden.

Zie `START-HIER.txt` voor de korte stappen.
