// Local preview only (not pushed to Apps Script). Serves the client with a fake google.script.run
// backed by the real service on an in-memory repo seeded with test data.
//   node dev/server.js   ->  http://localhost:5173
// Test logins (PINs from test/fixtures.js): hr 111111, hod1 012345, hod2 222222, gm 123123.
// Visit /dev/gm-round to fast-forward: 9 HODs vote, phases advance to GM_OPEN.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { makeWorld } = require('../test/fixtures');

let w = makeWorld();
const root = path.join(__dirname, '..', 'src');

const SHIM = `<script>
window.google = { script: { run: (function make(ok, bad) { return new Proxy({}, { get(_, name) {
  if (name === 'withSuccessHandler') return (f) => make(f, bad);
  if (name === 'withFailureHandler') return (f) => make(ok, f);
  return (...args) => fetch('/rpc', { method: 'POST', body: JSON.stringify({ name, args }) })
    .then((r) => r.json()).then((v) => ok && ok(v)).catch((e) => bad && bad(e));
} }); })() } };
</script>`;

function page() {
  const read = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8');
  return read('client/index')
    .replace(/<\?!= include\('([^']+)'\) \?>/g, (_, n) => (n === 'client/styles' ? read(n) : SHIM + read(n)));
}

function fastForward() {
  w = makeWorld();
  const hr = w.login('hr');
  w.service.adminAdvancePhase(hr);
  const dept = { hod1: ['HR & Security', 'Kitchen The Bakery'], hod2: ['Floor'], hod3: ['Bar'], hod4: ['Cashier'], hod5: ['Kitchen'],
    hod6: ['Finance & Accounting'], hod7: ['Driver'], hod8: ['Wholefood'], hod9: ['Engineering'] };
  const boh = ['I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Gede Defry Wisnu Sastrawan', 'I Gede Defry Wisnu Sastrawan', 'I Gede Defry Wisnu Sastrawan', 'Ni Luh Putu Arisyawati'];
  const foh = ['Marlin Luta Hambabanju', 'Marlin Luta Hambabanju', 'Marlin Luta Hambabanju', 'Marlin Luta Hambabanju', 'I Gusti Ayu Made Desiana', 'I Gusti Ayu Made Desiana', 'I Gusti Ayu Made Desiana', 'Ni Putu Kusumawati', 'Ni Putu Kusumawati'];
  Object.keys(dept).forEach((h, i) => {
    const mvps = {}; dept[h].forEach((d) => { mvps[d] = 'MVP ' + d; });
    w.service.submitHod(w.login(h), { bohNomineeId: w.nid(boh[i]), fohNomineeId: w.nid(foh[i]), mvps });
  });
  w.service.adminAdvancePhase(hr); w.service.adminAdvancePhase(hr);
}

http.createServer((req, res) => {
  if (req.url === '/dev/gm-round') { fastForward(); res.end('GM round ready'); return; }
  if (req.url === '/dev/phone') { // 390px-wide frame, to check the mobile layout on a desktop browser
    res.setHeader('Content-Type', 'text/html');
    res.end('<body style="margin:0;background:#888"><iframe id="f" src="/" style="width:390px;height:700px;border:0;background:#fff;display:block;margin:0 auto"></iframe></body>');
    return;
  }
  if (req.url === '/dev/reset') { w = makeWorld(); res.end('reset'); return; }
  if (req.url === '/rpc' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const { args } = JSON.parse(body);
      const out = w.app.dispatch(w.service, args[0], args[1], args[2]);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(page());
}).listen(5173, () => console.log('http://localhost:5173'));
