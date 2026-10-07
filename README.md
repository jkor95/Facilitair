# Meldpunt VWO v5.6.6

GitHub Pages/PWA met Supabase als centrale synchronisatie. Gebruikers loggen uitsluitend in via Meldpunt VWO; Supabase is niet zichtbaar voor personeel.

## Update vanaf v5.6.4
Deze versie voegt meervoudige automatische toewijzing toe. Daarom zijn er drie stappen:
1. Voer `supabase/MIGRATIE-v5.6.6.sql` één keer uit in Supabase > SQL Editor.
2. Vervang daarna de code van Edge Function `smart-function` door `supabase/functions/dalton-api/index.ts` en klik op Deploy updates. Verify JWT blijft UIT.
3. Upload daarna alle GitHub-bestanden uit deze map en vervang de bestaande bestanden.

De bestaande configuratie is al ingevuld voor:
- GitHub Pages: https://jkor95.github.io/Facilitair/
- Edge Function: https://xmmrplvhkfvyfqwjrugl.supabase.co/functions/v1/smart-function
