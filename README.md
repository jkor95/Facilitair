# Meldpunt VWO v5.7.4

Centrale GitHub Pages + Supabase versie zonder e-mailfunctionaliteit.

## Nieuw in v5.7.4
- Modalvensters sluiten niet meer door naast het venster te klikken.
- Nieuwe rol **Conciërge**.
- Nieuwe beheersectie **Rollen & rechten**.
- Aparte zicht- en wijzigrechten voor Facilitair en Conciërge.
- Rechten worden server-side afgedwongen.
- Conciërges kunnen worden gebruikt bij automatische toewijzing.
- Geen SQL-migratie nodig.

## Update
Wel nodig:
1. bestaande Supabase Edge Function `smart-function` vervangen door `supabase/functions/dalton-api/index.ts`;
2. daarna de GitHub-bestanden vervangen.

Zie `INSTALLATIE-SUPABASE-EN-GITHUB.md`.
