# Installatie Meldpunt VWO v5.8.11

Deze versie bevat één database-uitbreiding voor de planning. Daarom is dit één van de versies waarbij een Supabase-aanpassing echt nodig is.

## 1. SQL één keer uitvoeren

Open in Supabase de SQL Editor en voer de volledige inhoud uit van:

`supabase/UPGRADE-v5.8.11-EENMALIG.sql`

Dit voegt alleen `planned_for` toe aan de bestaande meldingentabel en maakt een index voor de planning. Bestaande meldingen blijven intact.

## 2. smart-function bijwerken

Open je bestaande Edge Function `smart-function` en vervang de volledige `index.ts` door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de functie. De huidige eigen login en beveiliging blijven behouden.

## 3. GitHub bijwerken

Upload/vervang daarna de websitebestanden in de root van je GitHub Pages repository. Laat `CNAME` staan met `meldpuntvwo.nl`.

## Controle

- Open een bestaande melding en stel een datum in bij **Gepland uitvoeren op**.
- Controleer of de melding onder **Planning** verschijnt.
- Test **In behandeling**, **Afronden** en **Heropenen** vanaf een meldingskaart.
- Vul op de melderspagina een locatie/categorie/titel in die op een bestaande open melding lijkt; de waarschuwing **Mogelijk al gemeld** moet verschijnen.
