// Minimal Spreadsheet stand-in that mimics the Sheets behaviours our code depends on:
// - cells not formatted as text turn "=..." strings into formulas, numeric-looking strings into numbers,
//   and "true"/"false" into booleans (this is what bites PINs, names and "17:00" in real Sheets)
// - text-formatted cells keep strings as typed
// - =COUNTIF(Sheet!X:X,A<row>) formulas evaluate
class FakeSheet {
  constructor(ss, name) { this.ss = ss; this.name = name; this.rows = []; this.textCols = new Set(); }
  getMaxRows() { return 1000; }
  setFrozenRows() {}
  getLastRow() {
    for (let r = this.rows.length; r > 0; r--) if ((this.rows[r - 1] || []).some((c) => c !== undefined && c !== '')) return r;
    return 0;
  }
  _width() { return Math.max(0, ...this.rows.map((r) => (r || []).length)); }
  _eval(cell, row) {
    if (!cell || typeof cell !== 'object') return cell;
    const m = /^=COUNTIF\((\w+)!([A-Z]):[A-Z],A(\d+)\)$/.exec(cell.formula);
    if (!m) return '#NAME?';
    const target = this.ss.getSheetByName(m[1]);
    const key = this.rows[row - 1][0]; // same-row ref, like Sheets adjusting references when rows are deleted
    const ci = m[2].charCodeAt(0) - 65;
    return target.rows.filter((r) => r && r[ci] === key).length;
  }
  getDataRange() {
    const w = this._width();
    const last = this.getLastRow();
    return { getValues: () => this.rows.slice(0, last).map((r, i) =>
      Array.from({ length: w }, (_, c) => { const v = (r || [])[c]; return v === undefined ? '' : this._eval(v, i + 1); })) };
  }
  getRange(row, col, nRows, nCols) {
    const self = this;
    const api = {
      setValues(vals) {
        vals.forEach((vr, i) => vr.forEach((v, j) => {
          const R = row - 1 + i; const C = col - 1 + j;
          self.rows[R] = self.rows[R] || [];
          self.rows[R][C] = self._coerce(v, C);
        }));
        return api;
      },
      setNumberFormat(f) { for (let c = col - 1; c < col - 1 + nCols; c++) f === '@' ? self.textCols.add(c) : self.textCols.delete(c); return api; },
      setFontWeight() { return api; }
    };
    return api;
  }
  _coerce(v, C) {
    if (this.textCols.has(C)) return typeof v === 'string' ? v : String(v);
    if (typeof v !== 'string') return v;
    if (v.startsWith('=')) return { formula: v };
    if (v.trim() !== '' && !isNaN(Number(v))) return Number(v);
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    return v;
  }
  deleteRow(n) { this.rows.splice(n - 1, 1); }
}

class FakeSpreadsheet {
  constructor() { this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new FakeSheet(this, n); this.sheets.set(n, s); return s; }
}

const fakeGlobals = {
  SpreadsheetApp: { flush() {} },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }
};

module.exports = { FakeSpreadsheet, fakeGlobals };
