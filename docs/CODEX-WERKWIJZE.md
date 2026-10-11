# Codex gebruiken voor Meldpunt VWO

1. Open Codex, kies GitHub-repository **jkor95/Facilitair** (niet JK-Works-app).
2. Vraag in het Nederlands: "Pas [gewenste wijziging] aan in Meldpunt VWO. Volg AGENTS.md; test, maak een PR en publiceer gewone veilige GitHub-wijzigingen na geslaagde controles."
3. Codex werkt op een eigen branch. GitHub Pages publiceert automatisch als de bestaande Pages-instelling vanaf `main` deployt en de PR veilig is samengevoegd.
4. Geen ZIP-upload naar GitHub nodig. Supabase is bewust **niet gekoppeld**.
5. Bij een noodzakelijke Supabase-wijziging ontvang je van Codex de codebestanden plus `SUPABASE-HANDLEIDING.txt`. Open uitsluitend het **Meldpunt VWO**-project in Supabase. SQL gaat naar SQL Editor; Edge Function-code naar Functions → `dalton-api` → editor. Volg de instructies voor back-up, volgorde en controle; voer nooit oude eenmalige scripts opnieuw uit.
6. Publiceer geen frontend die nieuwe Supabase-functionaliteit vereist voordat de handmatige Supabase-stap bevestigd is.
7. Een Git-tag herstelt uitsluitend code, niet meldingen, foto's, gebruikers of andere Supabase-data.

**Controle vóór eerste automatische release:** controleer in GitHub Settings → Pages dat `main` en het juiste pad de bron zijn, en bevestig de werkende live commit. De eerste PR voor deze inrichting verandert geen websitecode of Supabase.
