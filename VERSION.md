# Meldpunt VWO v5.8.0

Nieuwe beheeropties voor het openbare storingsoverzicht op de melderspagina.

## Nieuw
- Hoofdbeheer kan bepalen welke categorieen in Actuele storingen zichtbaar zijn.
- Hoofdbeheer kan filteren op status: Open, In behandeling en Wacht / gepland.
- Sortering is instelbaar: categorieen bij elkaar, nieuwste eerst, oudste eerst of urgentie.
- Standaard staat de sortering op **Categorieen bij elkaar**; binnen een categorie staan de nieuwste meldingen bovenaan.
- Actuele storingen is op de melderspagina inklapbaar. De open/dicht-stand wordt op het apparaat onthouden.

## Installatie vanaf v5.7.9
Geen SQL-migratie nodig. Werk de bestaande smart-function bij met `supabase/functions/dalton-api/index.ts` en vervang daarna de GitHub-bestanden.

Backend/API-versie: 5.80. Frontend/PWA-cache: 5.8.0.
