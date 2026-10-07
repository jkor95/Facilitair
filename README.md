# Dalton Meldpunt v3 - centrale app

Dit is de eerste **centrale** versie van Dalton Meldpunt. De frontend blijft een PWA op GitHub Pages, maar meldingen, accounts, rollen, auditlog, toewijzingen en wachtwoorden staan centraal in een Cloudflare Worker + D1 database. Er wordt geen Supabase gebruikt.

## Eerste beheeraccount

Na de eerste database-installatie wordt bij de eerste login automatisch één hoofdbeheeraccount gemaakt:

- gebruikersnaam: `Admin`
- wachtwoord: `Admin`

Je kunt daarna in **Medewerkers & accounts** de naam en gebruikersnaam wijzigen. Het eigen wachtwoord kun je via **Wachtwoord wijzigen** aanpassen.

## Wat werkt centraal

- personeel dient meldingen in via dezelfde openbare GitHub Pages-link;
- meldingen verschijnen op andere apparaten bij facilitair en hoofdbeheer;
- één vrij veld voor locatie / lokaal / ruimte;
- foto toevoegen;
- status, interne notitie en toewijzing;
- automatische toewijzing per categorie;
- medewerkersaccounts met eigen gebruikersnaam en wachtwoord;
- hoofdbeheer kan accounts bekijken/bewerken/blokkeren;
- hoofdbeheer kan wachtwoorden **inzien en aanpassen**;
- wachtwoorden zijn in de database versleuteld opgeslagen, niet als platte tekst;
- uitnodigings- en resetlinks vanuit de app;
- auditlog alleen voor hoofdbeheer, met datumfilter en PDF-export;
- wijzigingen door hoofdbeheer zijn standaard stil (geen interne notificatie);
- badge telt open acties wanneer de PWA actief is;
- browsermeldingen terwijl de PWA geopend/actief is;
- e-mail naar conciërge en afrondingsmail naar melder zodra e-mail is geconfigureerd.

## Belangrijk over wachtwoorden inzien

Normaal hoort een beheerder een wachtwoord alleen te kunnen resetten. Op jouw expliciete verzoek is v3 zo gebouwd dat hoofdbeheer het actuele wachtwoord kan teruglezen. Daarom bewaart de backend naast de login-hash ook een AES-GCM-versleutelde kopie. De geheime sleutel staat alleen als Cloudflare-secret en **nooit in GitHub**.

Als die geheime sleutel uitlekt, kunnen opgeslagen wachtwoorden worden ontsleuteld. Gebruik daarom unieke wachtwoorden voor deze app en hergebruik geen Microsoft-/schoolwachtwoorden.

## Mappen

- `index.html`, `assets/`, `manifest.webmanifest`, `sw.js`: GitHub Pages frontend.
- `backend/`: Cloudflare Worker + D1 database.
- `docs/`: personeelsposter en uitleg.

Lees **INSTALLATIE.md** voor de eenmalige installatie.

## Nog bewust niet leerlingproof

Het openbare meldformulier vereist in deze versie nog geen personeelslogin. Dat is bewust zo gelaten op basis van de huidige afspraak. De centrale backend is wel zo opgezet dat we in een volgende versie personeelsverificatie vóór het meldformulier kunnen toevoegen zonder de meldingen- of accountstructuur opnieuw te bouwen.

## Push bij volledig gesloten app

V3 heeft centrale notificaties, badge-updates en browsermeldingen wanneer de PWA actief is. Volledige Web Push wanneer de iPhone-app volledig gesloten is vereist nog een aparte pushconfiguratie (bijvoorbeeld VAPID/een pushdienst). Dat staat los van de centrale database en kan later worden toegevoegd.
