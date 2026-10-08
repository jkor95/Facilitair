# Meldpunt VWO v5.8.3

Hotfix voor ongewenst automatisch vernieuwen tijdens typen, aanvinken en bewerken.

## Nieuw in v5.8.3
- De 30-seconden achtergrondcontrole haalt nog wel nieuwe gegevens op voor meldingen en badges, maar bouwt de zichtbare pagina niet meer automatisch opnieuw op.
- Ingevulde tekst, selecties en vinkjes blijven daardoor staan totdat de gebruiker zelf opslaat of het scherm afsluit.
- Bij bewust sluiten van een dialoog wordt de actuele serverstatus opgehaald en de pagina daarna opnieuw opgebouwd.
- Handmatig **Vernieuwen** blijft direct verversen.
- Geen SQL-migratie en geen smart-function-update nodig.

Backend/API-versie: 5.81. Frontend/PWA-cache: 5.8.3.

---

# Meldpunt VWO v5.8.2

Uitbreiding van melderspagina, terugkoppelmail en gedelegeerde beheerrechten.

## Nieuw
- Hoofdbeheer kan de categorievolgorde van Actuele storingen op de melderspagina handmatig sorteren.
- Terugkoppelmail bevat de huidige status en interne notitie, maar geen automatische handtekening.
- Hoofdbeheer kan per Facilitair- of Conciërge-account specifieke beheerfuncties toekennen.
- Gedelegeerde medewerkers krijgen een aparte knop **Beheer** en zien alleen de toegewezen onderdelen.
- Hoofdbeheerder-accounts blijven voor gedelegeerd accountbeheer afgeschermd.

## Installatie vanaf v5.8.0
Geen SQL-migratie nodig. Werk de bestaande smart-function bij met `supabase/functions/dalton-api/index.ts` en vervang daarna de GitHub-bestanden.

Backend/API-versie: 5.81. Frontend/PWA-cache: 5.8.2.


## v5.8.2
- Hotfix voor opslaan van Meldpagina aanpassen wanneer categorie/statusfilters op alle staan.
- Null-instellingen vallen terug op standaard in plaats van een ongeldige databasewaarde op te slaan.
- Duidelijkere foutmeldingen in plaats van [object Object].
- Geen SQL-migratie nodig; GitHub + smart-function bijwerken.
