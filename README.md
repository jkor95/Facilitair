# Meldpunt VWO

Productieversie **v5.8.6** voor `https://meldpuntvwo.nl/`.

In deze versie staat **Beveiliging melderspagina** als zelfstandig beheeronderdeel. Het recht om het maandwoord te bekijken/wijzigen kan afzonderlijk worden toegekend aan Facilitair- of Conciërge-medewerkers.

Inloggen voor medewerkers en hoofdbeheer blijft altijd bereikbaar zonder maandwoord. Het maandwoord is alleen nodig voor de openbare melderspagina.

## Bijwerken vanaf v5.8.4
Werk de bestaande Supabase Edge Function `smart-function` bij met `supabase/functions/dalton-api/index.ts` en upload daarna de GitHub-bestanden. Er is geen SQL-migratie nodig.

**Let op:** een maandwoord dat al in v5.8.4 was ingesteld kan technisch niet uit de oude hash worden teruggelezen. Stel het na deze update één keer opnieuw in. Daarna wordt het actuele woord zichtbaar in het aparte beveiligingsonderdeel.

Zie `START-HIER.txt` voor de korte installatievolgorde.
