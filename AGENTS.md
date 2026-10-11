# Meldpunt VWO – vaste Codex-instructies

## Project en grenzen
- Repository: `jkor95/Facilitair`; productie: `https://meldpuntvwo.nl`; domeinbestand `CNAME` moet exact `meldpuntvwo.nl` blijven.
- Dit project is volledig gescheiden van JK Works en Sport. Gebruik NOOIT Supabase-projecten, tokens, gebruikers of configuratie van die apps.
- Statische GitHub Pages-site met `index.html`, `assets/app.js`, `assets/styles.css`, `assets/config.js`, `sw.js` en `manifest.webmanifest`.
- Supabase is een AFZONDERLIJK, niet via deze Codex-workflow gekoppeld productieproject. Geen automatische Supabase-deployments, SQL-uitvoering, Edge Function-deployments of productiedatawrites.
- Behoud alle bestaande meldingen, foto's, accounts, instellingen, toegangsrechten, privacy en functionaliteit. Omzeil nooit autorisatie of RLS om wijzigingen alleen in GitHub te kunnen maken.
- Bewaar het bestaande maandwoord, beheerdersinlog, rolrechten, auditlog, meldingenoverzicht, foto-upload en urgentiegedrag.
- Geen secrets, persoonlijke gegevens of service_role-keys in Git, tests, PR's of logs.

## Werkproces voor iedere update
1. Controleer actuele `main`, `VERSION.md`, `index.html`, `sw.js`, relevante code, bestaande workflows en laatste succesvolle GitHub Pages-deployment. Raad niet bij onbereikbare APIs.
2. Controleer of de live werkende commit een herstel-tag heeft; maak zo nodig een geannoteerde herstel-tag op die bevestigde commit vóór bronwijzigingen. Een tag bewaart geen Supabase-data.
3. Werk op een nieuwe `codex/<onderwerp>`-branch vanaf actuele `main`. Nooit rechtstreeks pushen naar `main`, geen force-push.
4. Verander uitsluitend wat gevraagd is; vermijd onnodige bestanden en wijzigingen. Verhoog de patchversie voor reparaties; update `VERSION.md` en relevante cache-/assetversies consequent als frontendbestanden veranderen. Controleer dat oude PWA-caches correct verversen.
5. Voer `node scripts/check.cjs` uit en voeg bij gewijzigde functies gerichte tests toe. Test uitsluitend met fixtures/mocks; geen echte meldingen of productieaccounts aanmaken.
6. Controleer de volledige diff, commit, push en open een PR. Controleer tests en beveiligingschecks op de actuele PR-commit.
7. Voor gewone frontendupdates is er toestemming om na aantoonbaar geslaagde relevante controles en zonder blokkerende repositoryregels zelfstandig te mergen en publiceren. Controleer na merge dat GitHub Pages de exacte mergecommit op `meldpuntvwo.nl` succesvol publiceert; maak dan een versie-tag. Als checks, rechten of deployment ontbreken: stop en meld het, claim geen publicatie.
8. Risicovolle wijzigingen (beveiliging, rollen, database, persoonsgegevens, verwijderen of wijzigen van productiegegevens, herstelacties) vereisen aparte expliciete toestemming voor merge/publicatie. Omzeil geen branchbescherming of beveiligingschecks.

## Supabase: uitsluitend handmatige overdracht
- Streef naar frontendwijzigingen die met het bestaande veilige API-contract werken. Geen onveilige client-side workarounds.
- Als Supabase echt moet wijzigen: voer NIETS automatisch uit. Lever exact de benodigde volledige code in afzonderlijke bestanden (`.sql` voor SQL; `index.ts` voor `dalton-api`) en een eenvoudige Nederlandse `SUPABASE-HANDLEIDING.txt` met projectcontrole, exacte plaklocatie, volgorde, impact, back-up, verificatie en rollback.
- Bestaande eenmalige SQL-upgrades mogen nooit automatisch opnieuw uitgevoerd worden.
- Bij wijzigingen die een Supabase-stap vereisen: publiceer de afhankelijke frontend NIET voordat de gebruiker de veilige volgorde en de handmatige Supabase-stap heeft bevestigd. Maak desnoods eerst alleen een PR.
- Wijzig nooit het Supabase-project van JK Works of Sport.

## Testen en herstel
- De CI-workflow test statische integriteit en JavaScript-syntax; dit bewijst GEEN ingelogde functionaliteit, RLS of productie-Supabase. Voeg waar nodig geïsoleerde browser- en contracttests toe.
- Herstel websitecode via een nieuwe herstelbranch en PR naar een bekende werkende tag; nooit history herschrijven. Database- en Storage-herstel staan hier los van en vereisen expliciete toestemming.
