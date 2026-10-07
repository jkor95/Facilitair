# Meldpunt VWO v5.7.3

Centrale GitHub Pages + Supabase versie zonder e-mailfunctionaliteit.

## Nieuw in v5.7.3
- Admin kan categorieën toevoegen.
- Admin kan categorieën verwijderen.
- Admin kan de categorievolgorde aanpassen met omhoog/omlaag.
- De categorievolgorde wordt gebruikt op de openbare meldpagina.
- **Automatische toewijzing** gebruikt direct dezelfde actuele categorieën.
- Verwijderde categorieën blijven bij bestaande oude tickets herkenbaar als vervallen.

## Update
Voor deze versie is **geen SQL-migratie nodig**.

Wel nodig:
1. de bestaande Supabase Edge Function `smart-function` vervangen door de meegeleverde `supabase/functions/dalton-api/index.ts`;
2. daarna de GitHub-bestanden vervangen.

Zie `INSTALLATIE-SUPABASE-EN-GITHUB.md` voor de exacte stappen.
