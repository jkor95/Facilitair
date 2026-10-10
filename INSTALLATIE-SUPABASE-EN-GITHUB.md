# Installatie Meldpunt VWO v5.8.15

Voor deze update zijn **2 stappen** nodig.

## 1. Supabase smart-function vervangen
Open in Supabase de bestaande Edge Function **smart-function** en vervang de inhoud door:

`supabase/functions/dalton-api/index.ts`

Deploy daarna de functie. Er hoeft geen SQL uitgevoerd te worden.

Deze serverwijziging is nodig omdat Facilitair en Conciërge voortaan met één recht alle open én afgeronde meldingen ontvangen. De afzonderlijke bewerkrechten blijven server-side gecontroleerd.

## 2. GitHub bijwerken
Upload/vervang daarna de websitebestanden uit deze release in de GitHub repository.

Open vervolgens `https://meldpuntvwo.nl/`. De PWA-cache is verhoogd naar **5.8.15**.
