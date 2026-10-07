# Dalton Meldpunt v1

Een mobiele GitHub Pages/PWA-prototype voor facilitaire meldingen op school.

## Wat zit erin?

- Personeelsformulier met naam, e-mail, locatie, lokaal/ruimte, categorie, urgentie, omschrijving en foto.
- QR/smart-link ondersteuning via URL-parameters, bijvoorbeeld `?locatie=B-vleugel&ruimte=B1.14`.
- Facilitair dashboard met open meldingen, filters, statussen, toewijzen en interne notities.
- Hoofdbeheer met alle meldingen, automatische categorie-toewijzing, medewerkers en volledige auditlog.
- Auditlog wordt wel opgeslagen maar is standaard niet zichtbaar voor facilitair.
- Adminwijzigingen sturen in deze prototypeversie geen notificatie naar andere gebruikers.
- PWA-installatie, service worker en app-badge waar de browser dit ondersteunt.
- Lokale browsernotificaties voor testdoeleinden.
- JSON export/import voor backups van de lokale testdata.
- Personeelsposter en mailtekst in `/docs`.

## Belangrijk: prototype, nog niet voor echte schooldata

Deze versie gebruikt `localStorage`. Daardoor staan meldingen alleen in de browser op het apparaat waarop ze zijn gemaakt en worden ze nog niet tussen telefoons/computers gedeeld. Er is ook nog geen echte authenticatie.

Gebruik deze versie dus om de workflow, vormgeving en functies te testen. Voor echte ingebruikname koppelen we hierna een beveiligde gedeelde backend, accounts/rechten, echte pushmeldingen en automatische e-mail aan.

## Publiceren op GitHub Pages

1. Maak een nieuwe repository, bijvoorbeeld `dalton-meldpunt`.
2. Upload alle bestanden uit deze map naar de root van de repository.
3. Open GitHub -> Settings -> Pages.
4. Kies bij Source: `Deploy from a branch`.
5. Kies branch `main` en map `/root`.
6. Sla op. GitHub toont daarna je Pages-adres.
7. Open `assets/config.js` en vervang `publicUrl` door dat adres.
8. Vervang ook `conciergeEmail` door het echte functionele e-mailadres.

## iPhone beginscherm

Open de GitHub Pages-link in Safari -> Deel -> Zet op beginscherm.

De badgefunctie gebruikt de standaard Badging API waar iOS/browser dit toestaat. Achtergrond-push naar een gesloten app vereist later een echte push/backend-koppeling.

## Handige smart links / QR-codes

Gewone meldlink:

`https://.../dalton-meldpunt/`

Voor een vaste locatie:

`https://.../dalton-meldpunt/?locatie=Mediatheek`

Voor een specifiek lokaal:

`https://.../dalton-meldpunt/?locatie=B-vleugel&ruimte=B1.14`

Let op: URL-tekens/spaties moeten bij echte QR-links netjes URL-encoded worden.

## Demo-rollen

Onderin (mobiel) of rechtsboven (desktop) kun je tijdelijk wisselen tussen:

- Melden
- Facilitair
- Beheer

Dit is alleen om de app nu zonder login te kunnen testen. In een beveiligde versie verdwijnt deze rolwisselaar.
