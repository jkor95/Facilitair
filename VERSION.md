# Meldpunt VWO v5.9.3

## Wijzigingen
- Persoonlijke pushkeuze per urgentie: Laag, Normaal, Hoog en Spoed afzonderlijk aan/uit.
- Keuze onder Mijn account (Hoofdbeheer: Algemene instellingen), opgeslagen bij het eigen account en geldig op alle aangemelde apparaten.
- Standaard blijven Hoog/Spoed aan en Laag/Normaal uit. Ook Hoog/Spoed zijn nu persoonlijk uit te zetten.
- Nieuwe meldingen, echte urgentieverhogingen en onderweg-acties volgen de gekozen urgenties. Geen zelfmelding voor onderweg; de eigen apparaattest blijft onafhankelijk van de keuze werken.
- Servercontrole bij aanmaken én vlak voor verzenden. Afgeronde tickets en achterhaalde urgentie worden tegengehouden; geen herverzending van oude meldingen na aanzetten.
- Bestaande toegangsrechten, toewijzingen, ticketgegevens, onderweg zonder toewijzing, deduplicatie, lokale meldingen/badges en LCP blijven behouden.
- De nieuwe keuzevelden verschijnen alleen als de backend ondersteuning bevestigt.

## Installatie en publicatie
Vanaf de werkende v5.9.2 uitsluitend de nieuwe SQL-upgrade en volledige smart-function handmatig installeren in Dalton meldpunt. Zie SUPABASE-HANDLEIDING.txt. Geen nieuwe secrets, VAPID-sleutels of apparaatregistratie nodig. Eerst installatie bevestigen, daarna frontend publiceren.

Frontend/PWA-cache: 5.9.3.
