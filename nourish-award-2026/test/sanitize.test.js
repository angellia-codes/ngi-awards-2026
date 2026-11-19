const test = require('node:test');
const assert = require('node:assert');
const a = require('./load').loadApp();

test('sanitizeCell', () => {
  assert.strictEqual(a.sanitizeCell('=SUM(A1)'), "'=SUM(A1)");
  assert.strictEqual(a.sanitizeCell('+1'), "'+1");
  assert.strictEqual(a.sanitizeCell('-1'), "'-1");
  assert.strictEqual(a.sanitizeCell('@x'), "'@x");
  assert.strictEqual(a.sanitizeCell('Budi'), 'Budi');
  assert.strictEqual(a.sanitizeCell(42), 42);
  assert.strictEqual(a.unsanitizeCell(a.sanitizeCell('=SUM(A1)')), '=SUM(A1)');
  assert.strictEqual(a.unsanitizeCell("'quoted"), "'quoted");
});
