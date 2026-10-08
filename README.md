# Meldpunt VWO

Productieversie **v5.8.4** voor `https://meldpuntvwo.nl/`.

Deze versie voegt een beveiligd maandwoord toe aan de openbare melderspagina. Het woord wordt server-side gecontroleerd en niet openbaar naar de browser gestuurd. Een juiste invoer geeft tijdelijk toegang tot het storingsoverzicht en het meldformulier.

## Bijwerken vanaf v5.8.3
Werk de bestaande Supabase Edge Function `smart-function` bij met `supabase/functions/dalton-api/index.ts` en upload daarna de GitHub-bestanden. Er is geen SQL-migratie nodig.

Zie `START-HIER.txt` voor de korte installatievolgorde.
