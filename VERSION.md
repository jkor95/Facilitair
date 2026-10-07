# Meldpunt VWO v5.7.3

## Wijzigingen
- Nieuwe inklapbare beheersectie **Categorieën**.
- Categorieën toevoegen, verwijderen en sorteren.
- De centrale categorievolgorde wordt direct gebruikt bij **Melding maken**.
- **Automatische toewijzing** gebruikt dezelfde centrale categorieën en volgorde.
- Bestaande meldingen behouden een verwijderde categorie als historische waarde; bij bewerken staat deze als **vervallen**.
- Geen nieuwe databasekolommen of SQL-migratie nodig.
- Wel één update van de bestaande Supabase Edge Function nodig voor `public_config`.
