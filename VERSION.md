# Meldpunt VWO v5.8.7

## Aangepast
- De groene knop **Melding maken** boven de openbare melderspagina is verwijderd.
- **Actuele storingen** is hernoemd naar **Actuele meldingen**.
- De 12-uurs toegang na een correct maandwoord blijft nu betrouwbaar bewaard wanneer de mobiele webapp wordt afgesloten en opnieuw geopend.
- Bij opnieuw openen wordt de toegang server-side gecontroleerd en wordt het overzicht **Actuele meldingen** opnieuw geladen.
- De kleine knop **Inloggen** bovenaan blijft altijd beschikbaar zonder maandwoord.

## Technisch
- De tijdelijke openbare toegang wordt lokaal bewaard, maar blijft server-side maximaal 12 uur geldig en vervalt direct zodra het maandwoord wordt gewijzigd.
- `public_config` geeft nu ook correct door of de maandwoordbeveiliging is ingeschakeld.
- Geen SQL-migratie nodig.

Backend/API-versie: 5.87. Frontend/PWA-cache: 5.8.7.
