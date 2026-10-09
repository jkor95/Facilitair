> **v5.8.10:** alleen GitHub/frontend aanpassen. Geen SQL uitvoeren en de `smart-function` niet aanpassen.

# Installatie Meldpunt VWO v5.8.10

Deze release is een kleine frontend-hotfix voor de instelling **Locatietekst**.

## 1. GitHub Pages

Upload/vervang de bestanden uit deze release in de root van de GitHub-repository `Facilitair`.

Behoud `CNAME` met:

`meldpuntvwo.nl`

## 2. Supabase

Voor v5.8.10 hoef je niets in Supabase te wijzigen:

- geen SQL uitvoeren;
- `smart-function` niet opnieuw deployen;
- bestaande database en instellingen blijven behouden.

## 3. Controle

Controleer na de GitHub-deploy:

1. Log in als beheerder.
2. Open **Meldpagina: groen informatievlak & voorbeelden**.
3. Maak **Locatietekst** volledig leeg.
4. Klik op **Groene vlak & voorbeelden opslaan**.
5. Open/vernieuw de melderspagina.
6. De locatietekst hoort nu volledig verdwenen te zijn en mag na opnieuw openen van de beheerinstellingen niet terugkomen.
