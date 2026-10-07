# Meldpunt VWO v5.7.2 installeren/updaten

## Update vanaf v5.7.1: alleen GitHub

Als v5.7.1 al volledig werkt, hoef je voor v5.7.2 **geen SQL uit te voeren en geen Edge Function te wijzigen**.

1. Open je GitHub repository `Facilitair`.
2. Vervang de bestaande websitebestanden door de inhoud van deze ZIP.
3. Zorg dat `index.html`, `assets/`, `sw.js` en `manifest.webmanifest` direct in de repository-root staan.
4. Wacht tot GitHub Pages opnieuw is gedeployed.
5. Test via:

`https://jkor95.github.io/Facilitair/?v=5.7.2`

De bestaande configuratie blijft:
- Website: https://jkor95.github.io/Facilitair/
- Edge Function: https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function

## Alleen als v5.7.1 nog niet volledig was geinstalleerd

Deze ZIP bevat voor volledigheid nog de bestaande v5.7.1 Supabase-bestanden. Voer dan eerst eenmalig uit:

`supabase/MIGRATIE-v5.7.1-EENMALIG.sql`

En deploy daarna de meegeleverde:

`supabase/functions/dalton-api/index.ts`

naar je bestaande `smart-function`, met `Verify JWT` UIT.

Voor v5.7.2 zelf zijn er geen nieuwe Supabase-wijzigingen.
