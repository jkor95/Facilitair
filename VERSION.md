# Meldpunt VWO v5.8.15

## Nieuw
- De werkpagina voor **Facilitair** en **Conciërge** is vereenvoudigd.
- **Mijn werk vandaag** is volledig verwijderd.
- **Alle meldingen** staat voortaan als hoofdonderdeel bovenaan en is standaard open.
- Facilitair/Conciërge kunnen, wanneer **Alle meldingen bekijken en openen** aan staat, alle open én afgeronde meldingen zien.
- Het oude versnipperde zichtrechtenmodel (alle open / aan mij / niet toegewezen / afgerond) is vervangen door één duidelijk zichtrecht.
- Binnen Alle meldingen kan worden gefilterd op Alle meldingen, Alle open, In behandeling, Wacht / gepland, Afgerond en Spoed.
- Bewerkrechten blijven apart instelbaar door de beheerder en worden server-side gecontroleerd.
- Planningsoverzicht, Medewerkersoverzicht en Mijn account blijven als inklapbare ondersteunende onderdelen beschikbaar.

## Installatie
- Geen SQL nodig.
- **Smart-function wel vervangen** met `supabase/functions/dalton-api/index.ts` uit deze versie.
- Daarna de GitHub-bestanden bijwerken.

Frontend/PWA-cache: 5.8.15.
