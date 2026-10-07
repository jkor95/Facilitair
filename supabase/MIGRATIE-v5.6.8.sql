-- Meldpunt VWO v5.6.8 - standaard e-mailadres hoofdbeheerder
-- Eenmalig uitvoeren in Supabase > SQL Editor.

update public.dm_accounts
set email = 'j.korstanje@dalton-dordrecht.nl',
    updated_at = now()
where username_key = 'admin';
