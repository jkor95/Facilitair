# Meldpunt VWO

Productieversie **v5.8.15** voor `https://meldpuntvwo.nl/`.

## Nieuw in v5.8.15
De werkpagina van Facilitair en Conciërge is opnieuw vereenvoudigd. **Mijn werk vandaag** is verwijderd. Het hoofdonderdeel is nu **Alle meldingen**, standaard geopend, met alle open en afgeronde meldingen. Tikken op een melding opent direct de bestaande bewerkweergave.

Bij **Rollen & rechten** is het oude versnipperde zichtrechtenmodel vervangen door één hoofdrecht: **Alle meldingen bekijken en openen**. De beheerder bepaalt daarnaast afzonderlijk welke details zichtbaar zijn en welke onderdelen van een melding aangepast mogen worden.

## Installatie
Deze versie wijzigt geen databaseschema, maar de server-side zichtcontrole is aangepast. Daarom moet naast GitHub ook de bestaande Supabase Edge Function `smart-function` worden vervangen door `supabase/functions/dalton-api/index.ts` uit deze release.

Er hoeft **geen SQL** uitgevoerd te worden.
