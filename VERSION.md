# Meldpunt VWO v5.7.5

Wijzigingen:
- Als `Kan les / werk doorgaan?` op `Nee` wordt gezet, wordt de urgentie automatisch `SPOED`.
- Bij deze keuze verschijnt direct een rode instructie om ook een conciërge te bellen voor een snelle oplossing.
- De urgentiekeuze wordt zolang `Nee` gekozen is vastgezet op `SPOED`.
- De Edge Function dwingt dezelfde regel server-side af; een melding met `canContinue = nee` kan daardoor niet als lagere urgentie worden opgeslagen.
- Geen SQL-migratie nodig.
