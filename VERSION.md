# Meldpunt VWO v5.8.23

## Technische wijziging v5.8.23
- De statische controle detecteert nu ontbrekende iconen uit het PWA-manifest, ook met een versieparameter in de URL.
- Een geïsoleerde regressietest controleert de geslaagde en de ontbrekend-icoon-situatie; deze draait ook in GitHub Actions.
- Websitefunctionaliteit, frontendbestanden, beveiliging en Supabase zijn ongewijzigd. Frontend/PWA-cache blijft 5.8.22.

## Frontendwijzigingen v5.8.22
- Op de melderspagina staan de urgentielabels bij **Actuele meldingen** nu altijd correct gecentreerd.
- De tekst in labels zoals **Laag**, **Normaal**, **Hoog** en **SPOED** wordt zowel horizontaal als verticaal gecentreerd, ongeacht de hoogte of breedte van het label.
- Het urgentielabel rekt niet langer mee met de hoogte van de titel- en metagegevens ernaast.
- Geen functionele wijzigingen aan meldingen, rechten of Supabase.

## Installatie
Alleen GitHub-bestanden bijwerken. Geen SQL en geen wijziging aan `smart-function` nodig.

Frontend/PWA-cache: 5.8.22.
