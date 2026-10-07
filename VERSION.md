# v3.0.0 - 7 oktober 2026

- Prototype-localStorage vervangen door centrale Cloudflare Worker + D1 backend.
- Geen Supabase.
- Eerste hoofdbeheerlogin: `Admin` / `Admin`.
- Hoofdbeheer kan eigen gebruikersnaam en wachtwoord later wijzigen.
- Centrale accounts, sessies, tickets, routing, auditlog, uitnodigingen en notificaties.
- Hoofdbeheer kan actuele wachtwoorden inzien en aanpassen.
- Wachtwoorden worden gehasht voor login en daarnaast AES-GCM versleuteld opgeslagen voor de expliciet gevraagde beheer-inzage.
- Facilitaire accountuitnodigingen en resetlinks.
- Echte automatische e-mail ondersteund via optionele Resend-configuratie.
- Auditlog centraal, Van/Tot-filter, PDF-export.
- Personeelsformulier blijft voorlopig openbaar; leerlingproof-verificatie volgt later.
