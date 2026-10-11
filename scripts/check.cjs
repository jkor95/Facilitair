#!/usr/bin/env node
// Veilige controles zonder netwerkverkeer of productiegegevens.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const required = ['CNAME','index.html','assets/app.js','assets/styles.css','assets/config.js','sw.js','manifest.webmanifest','VERSION.md'];
for (const file of required) assert(fs.existsSync(path.join(root,file)), 'Ontbrekend: '+file);
assert.equal(read('CNAME').trim(), 'meldpuntvwo.nl', 'Onjuist productiedomein');
const html = read('index.html');
for (const file of ['assets/app.js','assets/styles.css','assets/config.js','manifest.webmanifest']) assert(html.includes(file), 'HTML verwijst niet naar '+file);
for (const file of ['assets/app.js','assets/config.js','sw.js']) {
  cp.execFileSync(process.execPath, ['--check', path.join(root,file)], {stdio:'pipe'});
}
const manifest = JSON.parse(read('manifest.webmanifest'));
for (const icon of manifest.icons || []) {
  const file = icon.src.split(/[?#]/)[0];
  assert(fs.existsSync(path.join(root, file)), 'Ontbrekend PWA-icoon: '+file);
}
assert(/meldpuntvwo\.nl/.test(html), 'Canonical domein ontbreekt');
console.log('Meldpunt VWO: statische bestanden, domein, HTML-verwijzingen, JS-syntax en manifest OK.');
console.log('Let op: ingelogde functies en Supabase zijn hiermee niet getest.');
