# Update v5.8.17 – volgorde belangrijk

Voor deze versie is een kleine database-uitbreiding nodig voor de zichtbaarheid van interne meldingen.

1. Voer eerst `supabase/UPGRADE-v5.8.17-EENMALIG.sql` uit in Supabase SQL Editor.
2. Vervang daarna de Edge Function `smart-function` met `supabase/functions/dalton-api/index.ts`.
3. Werk als laatste GitHub Pages bij.

Bestaande data blijft behouden.

---

# Installatie Meldpunt VWO v5.8.16

Deze versie is **GitHub-only**.

1. Upload/vervang de bestanden uit deze map in de GitHub-repository.
2. Laat `CNAME` en `assets/config.js` ongewijzigd aanwezig.
3. Er hoeft geen SQL uitgevoerd te worden.
4. De Supabase `smart-function` hoeft niet vervangen te worden.
5. Open daarna `https://meldpuntvwo.nl/` en ververs één keer. De PWA-cache is verhoogd naar **5.8.16**.
