# Meldpunt VWO v5.7.5 installeren/updaten

## Wat is nieuw
- Een geopend venster sluit niet meer als je per ongeluk naast het venster klikt.
- Nieuwe operationele rol **Conciërge** naast **Facilitair**.
- Admin krijgt een uitgebreid inklapbaar onderdeel **Rollen & rechten**.
- Voor Facilitair en Conciërge kun je afzonderlijk instellen welke meldingen/details zichtbaar zijn en welke onderdelen gewijzigd mogen worden.
- De rechten worden niet alleen in de website verborgen, maar ook in de Edge Function gecontroleerd.
- Conciërges kunnen net als Facilitair worden gebruikt bij **Automatische toewijzing**.

## Supabase: geen SQL-migratie nodig
Voor v5.7.5 is **geen SQL / database-migratie** nodig.

De rol Conciërge en de rechtenmatrix worden opgeslagen in de bestaande centrale `dm_settings`. Daardoor hoeft de bestaande `dm_accounts`-tabel niet te worden aangepast.

Er is wel **één update van de bestaande Edge Function** nodig, omdat rechten server-side moeten worden gecontroleerd.

1. Ga in Supabase naar **Edge Functions**.
2. Open de bestaande functie **smart-function**.
3. Kies **Edit** en open `index.ts`.
4. Open uit deze ZIP: `supabase/functions/dalton-api/index.ts`.
5. Vervang de volledige inhoud van de bestaande `index.ts` door deze nieuwe inhoud.
6. Klik **Deploy updates**.
7. Laat **Verify JWT UIT** staan.

Maak geen nieuwe functie aan. De URL blijft:
`https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function`

## GitHub
Daarna:

1. Open de GitHub repository `Facilitair`.
2. Vervang de bestaande websitebestanden door de inhoud van deze ZIP.
3. `index.html`, `assets/`, `sw.js` en `manifest.webmanifest` moeten direct in de repository-root staan.
4. Wacht tot GitHub Pages opnieuw is gedeployed.
5. Open normaal: `https://jkor95.github.io/Facilitair/`

Zie je toch nog een oude cacheversie, open dan tijdelijk:
`https://jkor95.github.io/Facilitair/?v=5.7.5`

## Rollen & rechten gebruiken
Ga als beheerder naar **Rollen & rechten**. Voor zowel **Facilitair** als **Conciërge** kun je onder andere instellen:

- alle open meldingen bekijken;
- eigen toegewezen meldingen bekijken;
- niet-toegewezen meldingen bekijken;
- afgeronde meldingen bekijken;
- meldergegevens, foto's, toewijzing, interne notities en wijzigingsgeschiedenis bekijken;
- browsermeldingen/badges gebruiken;
- locatie, categorie, urgentie, status, toewijzing en interne notitie wijzigen;
- eventueel meldingen definitief verwijderen.

Klik daarna op **Rollen & rechten opslaan**. De instellingen gelden direct voor alle accounts met die rol.

## Update v5.7.5
Geen SQL uitvoeren. Vervang wel de bestaande Edge Function `smart-function` met `supabase/functions/dalton-api/index.ts` en upload daarna de GitHub-bestanden. `Verify JWT` blijft uit.
