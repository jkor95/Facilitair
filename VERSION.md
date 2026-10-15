# Meldpunt VWO v5.9.4

## Wijzigingen
- Een neutraal startscherm met logo en laadmelding staat direct in de HTML; geen lege app tijdens het laden van JavaScript of servergegevens.
- De servercontrole en publieke instellingen laden gelijktijdig. Scripts worden zonder parserblokkade in de bestaande volgorde geladen.
- Na de bestaande toegangscontrole verschijnt de pagina zonder op Actuele meldingen te wachten. Dat overzicht laadt op de achtergrond en toont een eigen laad-/foutmelding.
- Alleen het meldingenoverzicht wordt daarna bijgewerkt. Formulierinvoer, invoerfocus en de open/dicht-stand blijven behouden; een ouder antwoord overschrijft geen nieuwere gegevens.
- Bestaande toegangscontrole, login, pushinstellingen, onderweg-acties, ticketgegevens, rollen en Supabase blijven ongewijzigd.

## Publicatie
Uitsluitend frontend. Geen nieuwe Supabase-installatie of handmatige SQL-stap nodig; de bestaande v5.9.3-backend blijft bruikbaar. Herstel zo nodig via een nieuwe branch/PR naar tag v5.9.3.

Frontend/PWA-cache: 5.9.4.
