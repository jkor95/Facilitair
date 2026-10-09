# Meldpunt VWO v5.8.8

## Aangepast
- De **titel van een melding** kan nu worden aangepast door Hoofdbeheerder en, afhankelijk van de ingestelde rolrechten, door Facilitair en Conciërge.
- Onder **Rollen & rechten** is hiervoor de aparte instelling **Titel melding wijzigen** toegevoegd.
- De wijzigingsgeschiedenis is leesbaarder gemaakt:
  - `open -> progress` wordt bijvoorbeeld **Open → In behandeling**;
  - interne account-ID's/UUID's bij toewijzingen worden waar mogelijk als **naam + rol** getoond;
  - nieuwe wijzigingen worden direct met leesbare namen/statussen opgeslagen.
- Op de openbare melderspagina is de standaardvolgorde nu:
  1. groen informatievlak;
  2. **Actuele meldingen** (standaard ingeklapt);
  3. meldformulier.
- De hoofdbeheerder kan de volgorde van deze drie onderdelen zelf aanpassen.
- Beheerinstellingen zijn gesplitst in twee aparte onderdelen:
  - **Meldpagina: groen informatievlak & voorbeelden**;
  - **Actuele meldingen: overzicht, filters & volgorde**.
- Deze twee onderdelen kunnen afzonderlijk als beheerfunctie aan een Facilitair- of Conciërge-account worden toegekend.

## Technisch
- Geen SQL-migratie nodig.
- De bestaande `smart-function` moet wel worden bijgewerkt voor server-side titelrechten, leesbare nieuwe historie en het nieuwe afzonderlijke beheerrecht voor Actuele meldingen.
- Frontend/PWA-cache verhoogd naar 5.8.8.

Backend/API-versie: 5.88. Frontend/PWA-cache: 5.8.8.
