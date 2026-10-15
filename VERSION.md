# Meldpunt VWO v5.9.2

## Wijzigingen
- Bevoegde Beheerders, Facilitair en Conciërges kunnen bij iedere zichtbare open melding aangeven dat zij onderweg zijn, ook zonder toewijzing.
- Onderweg wijzigt geen toewijzing of ticketstatus. Iedere medewerker kan uitsluitend de eigen onderweg-status intrekken.
- Onderweg-statussen zonder toewijzing blijven zichtbaar na opslaan, verversen en herladen; bestaande privacyrechten voor colleganamen blijven gelden.
- Hoog/Spoed-push blijft naar alle actieve bevoegde collega's met aangemelde pushapparaten gaan, ook als de onderweg-actor niet toegewezen is. Geen zelfmelding; Laag/Normaal blijft zonder onderweg-push.
- Bestaande aanmaak-/urgentiepush, filters, badges, ticketgegevens, rollen en LCP blijven behouden.
- Bij een oudere backend blijven de bestaande toegewezen onderwegknoppen werken; nieuwe knoppen verschijnen zodra de backend ondersteuning bevestigt.

## Installatie en publicatie
Zie SUPABASE-HANDLEIDING.txt. Vanaf de reeds geïnstalleerde v5.9.1 uitsluitend de nieuwe v5.9.2-SQL-upgrade en volledige smart-function handmatig installeren in Dalton meldpunt. Geen nieuwe secrets of apparaatregistratie nodig. Daarna pas deze frontend via GitHub Pages publiceren.
Geen automatische Supabase-deployment vanuit deze repository. Niet in een ander project toepassen.

Frontend/PWA-cache: 5.9.2.
