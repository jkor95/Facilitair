# Meldpunt VWO v5.8.12

Nieuwe frontendfunctie voor Facilitair en Conciërge:

- Nieuw **Weekoverzicht planning** op de werkpagina.
- Medewerkers kiezen zelf een periode van **7, 14 of 31 dagen**.
- De gekozen periode wordt per account op het apparaat onthouden.
- Alleen niet-afgeronde meldingen met een geplande uitvoerdatum binnen de gekozen periode worden getoond.
- Meldingen worden per geplande dag gegroepeerd, met datum, aantal meldingen en de bestaande snelle acties.
- De bestaande onderdelen **Mijn werk vandaag**, **Planning** en **Medewerkersoverzicht** blijven behouden.

Technisch:
- Frontend/PWA-cache: 5.8.12.
- Backend/API: ongewijzigd ten opzichte van v5.8.11.
- Geen nieuwe SQL-migratie.
- Geen update van de bestaande `smart-function` nodig.

> **Update vanaf v5.8.11:** alleen GitHub bijwerken.
