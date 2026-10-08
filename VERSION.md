# Meldpunt VWO v5.7.9

Frontend-hotfix voor v5.7.8. De openbare meldpagina kon bij het laden stoppen met de fout `publicOutages` omdat de lokale lijst voor het storingsoverzicht niet was geinitialiseerd. Dit is hersteld.

De functionaliteit uit v5.7.8 blijft ongewijzigd: optioneel e-mailadres voor terugkoppeling, mailto-knop voor Facilitair/Conciërge en een door Hoofdbeheer in- of uitschakelbaar openbaar storingsoverzicht.

Backend/API-versie blijft 5.78. Geen nieuwe SQL-migratie en geen nieuwe smart-function nodig wanneer v5.7.8 al volledig is geinstalleerd.
