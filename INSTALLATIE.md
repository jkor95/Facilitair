# Dalton Meldpunt v3 installeren

De app bestaat uit twee delen:

1. **GitHub Pages** - de website/PWA die personeel en facilitair openen.
2. **Cloudflare Worker + D1** - de centrale database en serverlogica.

Dit is nodig omdat GitHub Pages alleen statische bestanden kan hosten en zelf geen centrale accounts/database kan uitvoeren.

## 1. Cloudflare backend maken

Maak een Cloudflare-account als je dat nog niet hebt. Installeer **Node.js 22 of nieuwer** op je computer en open daarna een terminal in de map `backend`.

```bash
npm install
npx wrangler login
```

Maak de database:

```bash
npx wrangler d1 create dalton-meldpunt
```

Cloudflare toont daarna een `database_id`. Open `backend/wrangler.jsonc` en vervang:

`VUL_HIER_JE_D1_DATABASE_ID_IN`

met die database-id.

## 2. URL's invullen

In `backend/wrangler.jsonc`:

- `ALLOWED_ORIGIN`: je GitHub Pages-origin, bijvoorbeeld `https://jkor95.github.io`
- `APP_URL`: de volledige app-link, bijvoorbeeld `https://jkor95.github.io/Dalton-Meldpunt/`
- `CONCIERGE_EMAIL`: het functionele mailadres van conciërge/facilitair
- `MAIL_FROM`: afzender die je later bij je e-mailprovider verifieert

## 3. Geheime wachtwoordsleutel instellen

Maak een lange willekeurige sleutel. Deze sleutel is nodig om wachtwoorden voor hoofdbeheer versleuteld terug te kunnen lezen.

```bash
npx wrangler secret put PASSWORD_KEY
```

Plak de geheime sleutel wanneer Wrangler hierom vraagt. Zet deze sleutel **nooit** in GitHub.

## 4. Database installeren

```bash
npm run db:migrate:remote
```

## 5. Backend publiceren

```bash
npm run deploy
```

Je krijgt een URL zoals:

`https://dalton-meldpunt-api.<jouw-subdomein>.workers.dev`

Open daarna `assets/config.js` in de hoofdmap en vul die URL in bij `apiBase`.

## 6. GitHub Pages publiceren

Upload de volledige inhoud van `dalton-meldpunt-v3` naar je GitHub-repository. Het is niet erg dat de map `backend` ook in GitHub staat: daar staan geen geheime sleutels in.

Ga vervolgens naar:

**GitHub -> Settings -> Pages -> Deploy from a branch -> main -> /root**

Open daarna je GitHub Pages-link.

## 7. Eerste login

Klik op **Facilitair / beheer inloggen** en gebruik:

- gebruikersnaam: `Admin`
- wachtwoord: `Admin`

Bij de eerste login wordt dit beheeraccount automatisch in de centrale database aangemaakt.

## 8. E-mail echt laten versturen (optioneel maar aanbevolen)

De backend ondersteunt Resend voor echte automatische e-mails. Maak daar een account/domein aan, maak een sending API key en stel hem in als Cloudflare-secret:

```bash
npx wrangler secret put RESEND_API_KEY
```

Daarna werken onder andere:

- e-mail naar het conciërgeadres bij een nieuwe melding;
- uitnodigings-/wachtwoordresetmail naar medewerkers;
- afrondingsmail naar de melder wanneer dit is aangevinkt.

Zonder deze sleutel blijft de rest van de app centraal werken en geeft Beheer bij een uitnodiging een kopieerbare link.

## 9. iPhone

Open de GitHub Pages-link in Safari en kies:

**Deel -> Zet op beginscherm**

Log daarna als facilitair/beheer in en druk op **Meldingen aanzetten** om browsermeldingen toe te staan.

## Controle

1. Maak vanaf telefoon A als personeel een melding.
2. Log vanaf telefoon/computer B als `Admin` in.
3. De melding moet direct zichtbaar zijn.
4. Maak via Medewerkers een facilitair account aan.
5. Bekijk/zet een wachtwoord of verstuur een uitnodiging.
6. Wijs de melding toe aan die medewerker.
7. Controleer het Auditlog en exporteer een datumbereik naar PDF.
