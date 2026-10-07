window.DALTON_CONFIG = {
  appName: 'Dalton Meldpunt',
  schoolName: 'Stedelijk Dalton Lyceum Dordrecht',
  conciergeEmail: 'conciërge@school.nl',
  defaultAdminName: 'Jeremy',
  // Vul hier na het deployen van de Supabase Edge Function jouw eigen URL in.
  // Voorbeeld: https://abcdefgh.supabase.co/functions/v1/dalton-api
  apiUrl: 'VUL_HIER_JOUW_SUPABASE_FUNCTION_URL_IN',
  // Zet dit na publicatie op je echte GitHub Pages URL (zonder querystring).
  publicUrl: 'https://JOUW-GITHUB-NAAM.github.io/dalton-meldpunt/',
  categories: [
    'Gebouw / onderhoud','Deuren / sloten / toegang','Meubilair','Schoonmaak','Voorraad / materialen',
    'Veiligheid','ICT / apparatuur','Sanitair','Verlichting / elektra','Overig'
  ]
};
