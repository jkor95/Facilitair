# Meldpunt VWO v5.6.5 - update

## Bestaande installatie bijwerken vanaf v5.6.4

1. Open Supabase > SQL Editor.
2. Open `supabase/MIGRATIE-v5.6.5.sql`, kopieer alles, plak dit in de SQL Editor en klik **Run**. Dit maakt de tabellen voor meervoudige toewijzing en neemt bestaande enkelvoudige toewijzingen over.
3. Ga naar Supabase > Edge Functions > `smart-function` > Edit. Vervang `index.ts` volledig door `supabase/functions/dalton-api/index.ts` uit deze versie en klik **Deploy updates**. Laat **Verify JWT uit**.
4. Upload daarna de GitHub-bestanden uit deze ZIP naar repository `Facilitair` en vervang de bestaande bestanden.
5. Test via `https://jkor95.github.io/Facilitair/?v=5.6.5`.

---

# Meldpunt VWO v5 installeren

## Update vanaf v5.5 naar v5.6

1. Vervang de GitHub-bestanden door deze v5.6-bestanden. `assets/config.js` bevat jouw bestaande live Function-URL en GitHub Pages-link al.
2. Open in Supabase **Edge Functions** jouw bestaande function `smart-function`.
3. Vervang de volledige inhoud van `index.ts` door `supabase/functions/dalton-api/index.ts` uit deze ZIP.
4. Klik **Deploy updates**. Laat **Verify JWT uit** staan, zoals bij de bestaande koppeling.
5. Daarna kun je als Admin onder **Meldpagina aanpassen** ook de vier teksten van het groene informatievlak wijzigen.

Deze versie gebruikt:

- **GitHub Pages** voor de zichtbare PWA/webapp;
- **Supabase Database + Storage + 1 Edge Function** als centrale synchronisatielaag;
- **geen Supabase Auth** voor personeel, facilitair of beheer;
- de gebruikers loggen uitsluitend in via het eigen Meldpunt VWO-scherm.

## Deel A - Supabase

### 1. Maak een Supabase-project

1. Log in op Supabase.
2. Kies **New project**.
3. Geef het project bijvoorbeeld de naam `dalton-meldpunt`.
4. Kies een regio in Europa die bij school past.
5. Bewaar het databasewachtwoord dat Supabase voor het project vraagt.

### 2. Maak de tabellen en fotobucket

1. Open je project.
2. Ga naar **SQL Editor**.
3. Kies **New query**.
4. Open uit deze ZIP het bestand `supabase/schema.sql`.
5. Kopieer de volledige inhoud naar SQL Editor.
6. Klik **Run**.
7. Er moeten tabellen verschijnen met namen zoals `dm_accounts`, `dm_tickets` en `dm_audit_logs`.
8. Onder **Storage** hoort daarna de private bucket `ticket-photos` te staan.

Belangrijk: de tabellen zijn expres niet rechtstreeks toegankelijk voor `anon` of `authenticated`. De GitHub-site praat alleen met de Edge Function.

### 3. Maak de geheime versleutelsleutel

1. Open lokaal `tools/genereer-master-key.html`.
2. Klik **Genereer 32-byte sleutel**.
3. Kopieer de getoonde tekst.
4. Ga in Supabase naar **Edge Functions > Secrets** (of de projectinstellingen voor Function secrets).
5. Voeg toe:

`DALTON_MASTER_KEY` = de zojuist gegenereerde sleutel

6. Voeg later ook toe:

`DALTON_APP_URL` = jouw uiteindelijke GitHub Pages-adres, bijvoorbeeld `https://jouwnaam.github.io/dalton-meldpunt/`

Supabase levert zelf de server-side projectvariabelen `SUPABASE_URL` en de secret API keys aan de Edge Function. Die hoef je niet in GitHub te zetten.

### 4. Deploy de Edge Function `dalton-api`

#### Makkelijkste route: via Supabase Dashboard

1. Ga naar **Edge Functions**.
2. Kies **Deploy a new function** / **Via Editor**.
3. Maak de functie met exact de naam `dalton-api`.
4. Gebruik de inhoud van `supabase/functions/dalton-api/index.ts` als functiecode. Je kunt ook `dalton-api-dashboard.zip` uit deze map gebruiken als jouw dashboard upload van een function-zip ondersteunt.
5. Deploy de functie.
6. Zet voor deze functie de ingebouwde **JWT verification / Verify JWT uit**. Meldpunt VWO gebruikt bewust zijn eigen sessietokens. De functie controleert die zelf.

Als jouw dashboard die instelling niet toont, gebruik dan de Supabase CLI-route hieronder. Het meegeleverde `supabase/config.toml` bevat al:

```toml
[functions.dalton-api]
verify_jwt = false
```

#### Alternatief: via Supabase CLI

Vanuit de hoofdmap van deze versie:

```bash
supabase login
supabase link --project-ref JOUW_PROJECT_REF
supabase functions deploy dalton-api --use-api
```

Omdat `supabase/config.toml` is meegeleverd, wordt `verify_jwt = false` meegenomen.

### 5. Noteer de Function URL

De URL heeft deze vorm:

`https://JOUW_PROJECT_REF.supabase.co/functions/v1/dalton-api`

Je project-ref staat onder andere in je Supabase project-URL.

### 6. Test de function

In Supabase kun je de function testen met een POST-body:

```json
{"action":"health","payload":{}}
```

Je hoort ongeveer dit terug te krijgen:

```json
{"ok":true,"version":5}
```

## Deel B - GitHub

### 7. Vul twee regels in `assets/config.js` in

Open `assets/config.js` en pas aan:

```js
apiUrl: 'https://JOUW_PROJECT_REF.supabase.co/functions/v1/dalton-api',
publicUrl: 'https://JOUW-GITHUB-NAAM.github.io/dalton-meldpunt/',
```

Pas ook `conciergeEmail` aan naar het echte facilitaire/conciërge-mailadres.

**Niet in GitHub zetten:** databasewachtwoord, Supabase secret key/service role key of `DALTON_MASTER_KEY`.

### 8. Upload naar GitHub

1. Maak een nieuwe repository, bijvoorbeeld `dalton-meldpunt`.
2. Upload de bestanden uit deze map naar de root van de repository.
3. De map `supabase/` mag in GitHub blijven staan; daar staan geen geheime sleutels in.
4. Ga naar **Settings > Pages**.
5. Bij **Build and deployment** kies je **Deploy from a branch**.
6. Branch: `main`.
7. Folder: `/ (root)`.
8. Sla op.
9. Wacht tot GitHub je Pages-link toont.
10. Zet die definitieve link ook als `DALTON_APP_URL` secret in Supabase en bij `publicUrl` in `assets/config.js`.

### 9. Eerste login

Open de GitHub Pages-app en kies **Inloggen**.

Eerste hoofdbeheeraccount:

- gebruikersnaam: `Admin`
- wachtwoord: `Admin`

Als de accounttabel nog leeg is, maakt de Edge Function dit account automatisch aan bij de eerste loginpoging.

Verander daarna bij voorkeur meteen vanuit **Beheer > Medewerkers & accounts** je gebruikersnaam en wachtwoord.

## Hoe de synchronisatie werkt

Een melding op telefoon A wordt in Supabase opgeslagen. Telefoon/computer B haalt dezelfde centrale gegevens op. De app vernieuwt ingelogde schermen ook periodiek. Er is dus geen losse lokale database meer per telefoon.

De eigen Dalton-login werkt zo:

1. gebruiker vult de Dalton-inlognaam en het Dalton-wachtwoord in;
2. de Edge Function controleert dat tegen `dm_accounts`;
3. bij succes geeft de function een willekeurig Dalton-sessietoken terug;
4. alleen dat sessietoken wordt lokaal in de browser bewaard;
5. latere beheer/facilitair-verzoeken moeten dat token meesturen.

Supabase Auth wordt hierbij niet gebruikt.

## Foto's

Foto's worden door de Edge Function in de **private** Storage-bucket `ticket-photos` gezet. De beheer- en facilitaire schermen krijgen tijdelijke signed URLs. De fotobucket hoeft dus niet openbaar te worden gemaakt.

## E-mail

De app opent voorlopig een ingevulde e-mail in de standaard mail-app. Volledig automatisch e-mail versturen heeft nog een aparte mailprovider/SMTP-koppeling nodig. Dat kan later worden toegevoegd zonder de account- of databaseopzet opnieuw te maken.

## Pushmeldingen

De app kan lokale browsermeldingen en badges tonen wanneer de app actief is. Echte achtergrondpush naar een gesloten iPhone-PWA vraagt nog een Web Push-service/subscriptie en is nog niet onderdeel van v5.

## Problemen oplossen

**`Missing authorization header` of `Invalid JWT` direct vanuit Supabase**  
Controleer of **Verify JWT uit staat** voor `dalton-api`. De Edge Function moet zijn eigen Dalton-tokens kunnen controleren.

**App zegt dat Supabase nog niet gekoppeld is**  
Controleer `assets/config.js` en vervang de placeholder bij `apiUrl`.

**Admin / Admin werkt niet bij een nieuwe installatie**  
Controleer eerst of `schema.sql` succesvol is uitgevoerd, de secret `DALTON_MASTER_KEY` bestaat en de functionlogs geen fout tonen. Het Admin-account wordt pas bij de eerste login in de lege database aangemaakt.

**Foto werkt niet**  
Controleer of de bucket `ticket-photos` bestaat en private is.
