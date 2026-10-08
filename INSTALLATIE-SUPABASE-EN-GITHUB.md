# Meldpunt VWO v5.7.7 installeren/updaten

## Alleen GitHub aanpassen
Voor v5.7.7 hoef je niets in de database en niets aan `smart-function` te wijzigen.

Het officiële webadres is vanaf deze versie:

**https://meldpuntvwo.nl/**

## GitHub
1. Pak de ZIP uit.
2. Upload/vervang de websitebestanden in de root van de bestaande GitHub Pages-repository.
3. Zorg dat het bestand `CNAME` in de repository-root staat met exact `meldpuntvwo.nl`.
4. Ga naar GitHub > Settings > Pages en controleer dat **Custom domain** op `meldpuntvwo.nl` staat.
5. Wacht tot de DNS-check geslaagd is en zet daarna **Enforce HTTPS** aan.
6. Open `https://meldpuntvwo.nl/`.

## Supabase
Geen wijziging nodig. De bestaande centrale service en `smart-function` blijven ongewijzigd werken.

## PWA / beginscherm
Een PWA die eerder vanaf `jkor95.github.io` is geïnstalleerd hoort bij het oude domein. Verwijder die oude snelkoppeling/app en voeg Meldpunt VWO opnieuw toe vanaf `https://meldpuntvwo.nl/`.

Als een browser nog oude bestanden toont, vernieuw de pagina of open tijdelijk `https://meldpuntvwo.nl/?v=5.7.7`.
