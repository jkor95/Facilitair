# Automatische e-mailmeldingen instellen - v5.6.7

Facilitair kan in **Mijn account** zelf kiezen of er bij een nieuwe melding een e-mail wordt ontvangen en welk e-mailadres daarvoor gebruikt wordt. Admin kan dezelfde instelling via **Medewerkers & accounts** beheren.

## Eenmalige Supabase-instelling

1. Voer `supabase/MIGRATIE-v5.6.7.sql` uit in Supabase > SQL Editor.
2. Werk Edge Function `smart-function` bij met `supabase/functions/dalton-api/index.ts`.
3. Laat **Verify JWT uit** staan.

## E-mailprovider

De Edge Function gebruikt Resend voor automatische verzending. Maak bij Resend een API-key aan en verifieer het domein waarmee je wilt verzenden.

Voeg daarna in Supabase > Edge Functions > Secrets toe:

- `RESEND_API_KEY` - de Resend API-key
- `MELDPUNT_MAIL_FROM` - bijvoorbeeld `Meldpunt VWO <meldpunt@jouwdomein.nl>`
- `MELDPUNT_MAIL_REPLY_TO` - optioneel antwoordadres

Deploy `smart-function` na het toevoegen van de secrets opnieuw.

Als de mailsecrets niet zijn ingesteld blijft Meldpunt VWO gewoon werken en worden de persoonlijke voorkeuren opgeslagen, maar worden er geen automatische e-mails verzonden.
