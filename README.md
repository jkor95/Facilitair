# Meldpunt VWO

Productieversie **v5.8.7** voor `https://meldpuntvwo.nl/`.

Deze versie verbetert de openbare melderspagina. De losse groene knop **Melding maken** boven het formulier is verwijderd en het overzicht heet voortaan **Actuele meldingen**.

Na een correct maandwoord blijft de toegang maximaal 12 uur geldig, ook wanneer de mobiele webapp wordt afgesloten en opnieuw geopend. De backend controleert bij openen of die toegang nog geldig is; na 12 uur of na wijziging van het maandwoord wordt opnieuw om het maandwoord gevraagd.

Bij opnieuw openen worden de actuele meldingen opnieuw opgehaald. De kleine knop **Inloggen** bovenaan blijft altijd bereikbaar zonder maandwoord.

## Bijwerken vanaf v5.8.6
Werk de bestaande Supabase Edge Function `smart-function` bij met `supabase/functions/dalton-api/index.ts` en upload daarna de GitHub-bestanden. Er is geen SQL-migratie nodig.

Zie `START-HIER.txt` voor de korte installatievolgorde.
