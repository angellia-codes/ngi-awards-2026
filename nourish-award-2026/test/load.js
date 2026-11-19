// Evaluates src/*.js in one vm context, like Apps Script's shared global scope.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ORDER = ['Config', 'Flags', 'Finalists', 'Auth', 'Sanitize', 'Rules', 'Import', 'Service',
  'I18n', 'RepoContract', 'SheetRepo', 'Setup', 'Code'];

function loadApp(extra) {
  const ctx = vm.createContext(Object.assign({ console }, extra || {}));
  for (const name of ORDER) {
    const p = path.join(__dirname, '..', 'src', name + '.js');
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  }
  return ctx;
}

module.exports = { loadApp };
