# Dalton Meldpunt v2

Mobiele GitHub Pages/PWA-prototype voor facilitaire meldingen op school.

## Nieuw in v2

- Voor personeel is **Locatie + lokaal/ruimte** samengevoegd tot één vrij invulbaar veld.
- Bij afronden kan facilitair aanvinken of de melder een afrondingsmail moet krijgen.
- Beheer heeft een zichtbaar tekst-auditlog met **Van / Tot en met** datumfilter.
- Auditlog kan rechtstreeks als eenvoudige PDF worden geëxporteerd.
- Hoofdbeheer kan accounts/medewerkers bekijken en bewerken.
- Facilitair en hoofdbeheer hebben een eigen inlognaam en persoonlijk wachtwoord.
- Hoofdbeheer kan een uitnodiging of wachtwoord-resetmail voorbereiden.
- Automatische toewijzing per categorie blijft instelbaar door hoofdbeheer.
- Volledige lokale JSON back-up/import blijft beschikbaar.

## Demo-inlog

Bij een schone installatie zijn deze testaccounts beschikbaar:

- Hoofdbeheer: `JKO` / `demo-admin`
- Facilitair: `CON1` / `demo-facilitair`
- Facilitair: `FAC1` / `demo-facilitair`

Wijzig deze direct via **Beheer > Medewerkers & accounts** als je met het prototype gaat spelen.

## Belangrijk: nog steeds een lokaal prototype

Deze versie draait volledig in de browser en gebruikt `localStorage`.

Dat betekent:
- accounts en meldingen worden nog **niet centraal tussen apparaten gesynchroniseerd**;
- wachtwoorden worden lokaal gehasht opgeslagen en zijn daarom niet terug te lezen;
- hoofdbeheer kan wel een nieuw wachtwoord instellen;
- uitnodigings-/resetlinks demonstreren de gewenste flow, maar maken het account op het apparaat waarop de link wordt geopend;
- e-mail wordt als mailconcept geopend (`mailto:`), niet zelfstandig door de website verzonden;
- echte achtergrond-push tussen verschillende telefoons vereist later een backend/pushservice.

Gebruik deze versie alleen met testgegevens. De leerlingproof/AVG-beveiliging en gedeelde backend komen in een volgende stap.

## Publiceren op GitHub Pages

1. Maak een repository, bijvoorbeeld `dalton-meldpunt`.
2. Upload alle bestanden uit deze map naar de root.
3. GitHub -> **Settings -> Pages**.
4. Kies **Deploy from a branch**.
5. Kies `main` en `/root`.
6. Sla op en kopieer het GitHub Pages-adres.
7. Open `assets/config.js` en vervang `publicUrl` door het echte adres.
8. Vervang `conciergeEmail` door het functionele conciërge/facilitair e-mailadres.

## Testflow

1. Open de startpagina en maak als personeelslid een melding.
2. Kies **Facilitair / beheer inloggen**.
3. Log in als `CON1` en behandel/toewijs de melding.
4. Vul bij de melding een e-mailadres van de melder in als je de afrondingsmail wilt testen.
5. Vink **Melder e-mailen zodra melding wordt afgerond** aan en zet de status op **Afgerond**.
6. De standaard mail-app opent met een ingevulde afrondingsmail.
7. Log uit en log als `JKO` in.
8. Bekijk het auditlog, kies een datumperiode en exporteer het als PDF.
9. Beheer accounts, inlognamen, e-mailadressen, rollen en automatische categorie-toewijzing.

## iPhone beginscherm

Open de GitHub Pages-link in Safari -> Deel -> **Zet op beginscherm**.

De badgefunctie gebruikt de Badging API waar iOS/browser dit ondersteunt. Echte achtergrond-push volgt pas bij de centrale versie.

## Smart links / QR-codes

Gewone meldlink:

`https://.../dalton-meldpunt/`

Voor een vooraf ingevulde locatie:

`https://.../dalton-meldpunt/?locatie=Lokaal%20B1.14`

Oudere links met `locatie` + `ruimte` blijven ook werken; de app voegt ze samen tot één locatieveld.
