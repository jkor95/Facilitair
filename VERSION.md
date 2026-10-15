# Meldpunt VWO v5.9.1

## Wijzigingen
- Hoog/Spoed-push naar alle actieve bevoegde medewerkers met aangemelde apparaten, onafhankelijk van toewijzing.
- Push bij een nieuwe Hoog/Spoed-melding, bij verhogen naar Hoog/Spoed (ook Hoog naar Spoed) en bij een collega die onderweg gaat.
- Nieuwe meldingen en urgentieverhogingen gaan ook naar de medewerker die de actie uitvoert; onderweg-acties geven geen zelfmelding.
- Geen push bij verlagen, ongewijzigd opslaan, intrekken of Laag/Normaal; geen dubbele verzending bij gelijktijdige verzoeken.
- Verborgen toewijzingen blijven verborgen: zo nodig een generieke onderwegtekst zonder colleganaam.
- Bestaande ticketgegevens, rollen, lokale meldingen, badges, apparaatregistraties en LCP blijven behouden.

## Installatie en publicatie
Zie SUPABASE-HANDLEIDING.txt. Vanaf de reeds geïnstalleerde v5.9.0 eerst uitsluitend de nieuwe v5.9.1-migratie en volledige smart-function in Dalton meldpunt installeren en controleren. Bestaande VAPID-secrets behouden. Daarna pas deze frontend via GitHub Pages publiceren.
Geen automatische Supabase-deployment vanuit deze repository. Niet in een ander project toepassen.

Frontend/PWA-cache: 5.9.1.
