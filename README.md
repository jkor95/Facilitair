> **v5.8.11:** GitHub + smart-function + één kleine eenmalige SQL-upgrade.

# Meldpunt VWO

Productieversie **v5.8.11** voor `https://meldpuntvwo.nl/`.

## Nieuw

- dubbele melding herkennen tijdens het melden;
- geplande uitvoerdatum per melding;
- planning voor Facilitair/Conciërge;
- snelle acties op meldingskaarten;
- afgeronde melding heropenen;
- Nieuw/Gewijzigd sinds laatste bezoek;
- Mijn werk vandaag;
- medewerkersoverzicht met actuele werkverdeling.

## Installatie vanaf v5.8.10

1. Voer `supabase/UPGRADE-v5.8.11-EENMALIG.sql` één keer uit.
2. Werk de bestaande `smart-function` bij met `supabase/functions/dalton-api/index.ts`.
3. Upload/vervang de GitHub-bestanden.

De extra SQL is deze keer echt nodig omdat een geplande uitvoerdatum persistent bij een melding moet worden opgeslagen. Er wordt slechts één kolom en één index toegevoegd; bestaande data blijven intact.
