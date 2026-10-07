# Meldpunt VWO v5.6 - GitHub + Supabase synchronisatie

Dit is de centrale multi-device versie van Meldpunt VWO.

## v5.6 belangrijk

Na upload van deze GitHub-bestanden moet ook de bijgewerkte Edge Function uit `supabase/functions/dalton-api/index.ts` (of `dalton-api-dashboard.zip`) opnieuw in jouw bestaande Supabase Function worden geplakt en gedeployed. Dit is nodig voor de centraal beheerbare tekst van het groene meldblok.

## Architectuur

- GitHub Pages: PWA/interface
- Supabase Postgres: centrale accounts, meldingen, routing en auditlog
- Supabase Storage: private foto's
- Supabase Edge Function `dalton-api`: eigen Dalton-login en alle databasehandelingen
- Supabase Auth: **niet gebruikt**

Personeel, facilitair en hoofdbeheer loggen alleen in via Meldpunt VWO.

## Eerste beheeraccount

Bij een lege database wordt bij de eerste login automatisch aangemaakt:

- gebruikersnaam `Admin`
- wachtwoord `Admin`

Wijzig dit daarna vanuit Beheer.

## Belangrijk

Plaats nooit een Supabase secret/service-role key of `DALTON_MASTER_KEY` in GitHub. De frontend bevat alleen de openbare URL van de Edge Function.

Zie `INSTALLATIE-SUPABASE-EN-GITHUB.md` voor de volledige installatie.


## Nieuw in v5.3

Hoofdbeheer kan onder **Beheer > Meldformulier aanpassen** zelf voorbeeldlocaties en voorbeeldmeldingen beheren. Deze instellingen worden centraal in Supabase opgeslagen en door de openbare meldpagina opgehaald. De gele centrale informatiebalk is verwijderd.


## Wijzigingen v5.3
- Facilitair beheert meldingen/badges zelf per apparaat.
- Overzicht start op Alle open.
- Camera en fotobibliotheek zijn aparte keuzes.
- Config.js bevat de bestaande live koppeling.
