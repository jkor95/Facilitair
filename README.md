# Dalton Meldpunt v5 - GitHub + Supabase synchronisatie

Dit is de centrale multi-device versie van Dalton Meldpunt.

## Architectuur

- GitHub Pages: PWA/interface
- Supabase Postgres: centrale accounts, meldingen, routing en auditlog
- Supabase Storage: private foto's
- Supabase Edge Function `dalton-api`: eigen Dalton-login en alle databasehandelingen
- Supabase Auth: **niet gebruikt**

Personeel, facilitair en hoofdbeheer loggen alleen in via Dalton Meldpunt.

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
