# Meldpunt VWO v5.8.11

Nieuwe werkfuncties voor Facilitair en Conciërge:

- Mogelijke dubbele meldingen worden tijdens het invullen herkend en getoond.
- Per melding kan een geplande uitvoerdatum worden ingesteld.
- Nieuwe Planning op de werkpagina: Te laat, Vandaag, komende 7 dagen, Later en Nog te plannen.
- Snelle acties op meldingskaarten: Aan mij, In behandeling, Afronden en Heropenen.
- Afgeronde meldingen kunnen expliciet worden heropend.
- Meldingen krijgen lokaal de markering Nieuw of Gewijzigd sinds het vorige bezoek.
- Mijn werk vandaag zet spoed, verlopen/vandaag geplande meldingen en werk in behandeling bovenaan.
- Medewerkersoverzicht toont de actuele werkverdeling per Facilitair/Conciërge-medewerker.
- Rollen & rechten heeft een apart recht Geplande uitvoerdatum wijzigen.

Technisch:
- Frontend/PWA-cache: 5.8.11.
- Backend/API: 5.89.
- Eenmalig SQL-bestand: `supabase/UPGRADE-v5.8.11-EENMALIG.sql`.
- Bestaande `smart-function` moet voor deze versie één keer worden bijgewerkt.
