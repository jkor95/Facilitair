# Meldpunt VWO v5.7.3 installeren/updaten

## Wat is nieuw
De beheerder kan nu centraal categorieën beheren:
- categorie toevoegen;
- categorie verwijderen;
- volgorde wijzigen met omhoog/omlaag;
- dezelfde lijst en volgorde wordt direct gebruikt op de openbare meldpagina;
- dezelfde lijst en volgorde wordt direct gebruikt bij **Automatische toewijzing**.

Bestaande meldingen houden hun oude categorie als die later wordt verwijderd. Bij het bewerken van zo'n oude melding wordt die categorie als **vervallen** weergegeven totdat je een actieve categorie kiest.

## Supabase: geen SQL nodig
Voor v5.7.3 is **geen database-migratie / SQL** nodig. De categorieën worden opgeslagen in de bestaande `dm_settings`-instellingen.

Er is wel **één Edge Function-update** nodig, zodat de openbare meldpagina de centrale categorieën kan ophalen.

1. Ga in Supabase naar **Edge Functions**.
2. Open je bestaande functie **smart-function**.
3. Kies **Edit** en open `index.ts`.
4. Open uit deze ZIP: `supabase/functions/dalton-api/index.ts`.
5. Vervang de volledige inhoud van de bestaande `index.ts` door deze nieuwe inhoud.
6. Klik **Deploy updates**.
7. Laat **Verify JWT UIT** staan.

Maak geen nieuwe functie aan. De bestaande URL blijft:
`https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function`

## GitHub
Na de Edge Function-update:

1. Open je GitHub repository `Facilitair`.
2. Vervang de bestaande websitebestanden door de inhoud van deze ZIP.
3. Zorg dat `index.html`, `assets/`, `sw.js` en `manifest.webmanifest` direct in de repository-root staan.
4. Wacht tot GitHub Pages opnieuw is gedeployed.
5. Open normaal: `https://jkor95.github.io/Facilitair/`

Alleen als je nog een oude versie uit de cache ziet kun je tijdelijk openen met:
`https://jkor95.github.io/Facilitair/?v=5.7.3`

## Categorieën gebruiken
Log in als beheerder en open **Categorieën**.
- Gebruik **Toevoegen** voor een nieuwe categorie.
- Gebruik **↑ / ↓** om de volgorde te wijzigen.
- Gebruik **Verwijderen** om een categorie uit de actieve lijst te halen.
- Klik daarna **Categorieën opslaan**.

Na opslaan worden zowel **Melding maken** als **Automatische toewijzing** direct bijgewerkt.
