const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

test('PWA-iconen met versieparameter bestaan; een ontbrekend icoon faalt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meldpunt-check-'));
  try {
    const source = path.resolve(__dirname, '..');
    const files = ['CNAME', 'index.html', 'sw.js', 'manifest.webmanifest', 'VERSION.md',
      'assets/app.js', 'assets/config.js', 'assets/styles.css', 'scripts/check.cjs'];
    const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.webmanifest'), 'utf8'));
    const icons = manifest.icons.map(icon => icon.src.split(/[?#]/)[0]);
    for (const file of [...files, ...icons]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
      fs.copyFileSync(path.join(source, file), path.join(root, file));
    }
    const run = () => cp.spawnSync(process.execPath, [path.join(root, 'scripts/check.cjs')], {encoding: 'utf8'});
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    assert(icons.length > 0, 'Fixture moet een PWA-icoon bevatten');
    fs.unlinkSync(path.join(root, icons[0]));
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert(missing.stderr.includes('Ontbrekend PWA-icoon: '+icons[0]), missing.stderr);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
